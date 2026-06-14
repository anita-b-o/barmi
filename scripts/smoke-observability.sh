#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DEFAULT_SCHEME="${STORE_PUBLIC_SCHEME:-http}"
DEFAULT_PORT="${STAGING_HTTP_PORT:-8088}"
DEFAULT_HOST="localhost"
if [[ "$DEFAULT_SCHEME" == "https" ]]; then
  DEFAULT_PORT="${STAGING_HTTPS_PORT:-8443}"
  DEFAULT_HOST="${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}"
fi

BASE_URL="${BASE_URL:-${DEFAULT_SCHEME}://${DEFAULT_HOST}:${DEFAULT_PORT}}"
STACK_FILE="${STACK_FILE:-$ROOT_DIR/docker-compose.staging.yml}"
PROMETHEUS_URL="${PROMETHEUS_URL:-${PROMETHEUS_BASE_URL:-http://localhost:${STAGING_PROMETHEUS_PORT:-9090}}}"
GRAFANA_URL="${GRAFANA_URL:-${GRAFANA_BASE_URL:-http://localhost:${STAGING_GRAFANA_PORT:-3000}}}"
GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-barmi-local-admin}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-change-me-local-observability-password}"
EXPECT_SENTRY_EVENT="${EXPECT_SENTRY_EVENT:-${SENTRY_SMOKE_EXPECT_EVENT:-false}}"
EXPECT_ALERT_WEBHOOK="${EXPECT_ALERT_WEBHOOK:-false}"
RELEASE_ID="${RELEASE_ID:-${VITE_APP_RELEASE_ID:-}}"
CHECK_MODE="${CHECK_MODE:-${SMOKE_MODE:-runtime}}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() {
  echo "[observability] $*"
}

fail() {
  echo "[observability] $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

should_skip_tls_verification() {
  local url="$1"
  [[ "${CURL_INSECURE:-}" == "true" ]] \
    || [[ "$url" == https://localhost* ]] \
    || [[ "$url" == https://staging.127.0.0.1.sslip.io* ]] \
    || [[ "$url" == https://*.staging.127.0.0.1.sslip.io* ]]
}

curl_base_args() {
  local url="$1"
  printf '%s\n' "-sS"
  if [[ "$url" == https://* ]] && should_skip_tls_verification "$url"; then
    printf '%s\n' "-k"
  fi
}

curl_status() {
  local url="$1"
  local output_file="$2"
  shift 2
  mapfile -t args < <(curl_base_args "$url")
  curl "${args[@]}" "$@" -o "$output_file" -w '%{http_code}' "$url"
}

assert_json_file() {
  local file="$1"
  python3 -m json.tool "$file" >/dev/null
}

run_static_checks() {
  log "static script syntax"
  bash -n "$ROOT_DIR/scripts/smoke-observability.sh"
  node --check "$ROOT_DIR/frontend/scripts/upload-sourcemaps.mjs"

  log "static observability config"
  python3 -m json.tool "$ROOT_DIR/infra/grafana/dashboards/barmi-operational-mvp.json" >/dev/null
  python3 - "$ROOT_DIR" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
dashboard = json.loads((root / "infra/grafana/dashboards/barmi-operational-mvp.json").read_text(encoding="utf-8"))
if dashboard.get("title") != "Barmi Operational MVP":
    raise SystemExit("dashboard title mismatch")
if dashboard.get("uid") != "barmi-operational-mvp":
    raise SystemExit("dashboard uid mismatch")

required_paths = [
    "infra/prometheus/prometheus.yml",
    "infra/prometheus/rules/barmi-alerts.yml",
    "infra/grafana/provisioning/datasources/prometheus.yml",
    "infra/grafana/provisioning/alerting/contactpoints.yml",
    "infra/grafana/provisioning/alerting/policies.yml",
]
missing = [path for path in required_paths if not (root / path).is_file()]
if missing:
    raise SystemExit("missing observability config files: " + ", ".join(missing))

print("[observability] static dashboard/config files are present")
PY

  log "sourcemap required-env guard"
  (
    mkdir -p "$TMP_DIR/sourcemap-check/dist/assets"
    cd "$TMP_DIR/sourcemap-check"
    set +e
    SENTRY_UPLOAD_REQUIRED=true \
      SENTRY_AUTH_TOKEN= \
      SENTRY_ORG= \
      SENTRY_PROJECT= \
      VITE_APP_RELEASE_ID=observability-static-check \
      node "$ROOT_DIR/frontend/scripts/upload-sourcemaps.mjs" >/dev/null 2>&1
    status="$?"
    set -e
    if [[ "$status" -eq 0 ]]; then
      fail "SENTRY_UPLOAD_REQUIRED=true did not fail when Sentry upload envs were missing"
    fi
  )
  log "static checks completed"
}

run_backend_correlation_check() {
  local headers_file="$TMP_DIR/error.headers"
  local body_file="$TMP_DIR/error.json"
  local request_id="obs-$(date +%s)"
  local status
  local header_request_id
  local body_request_id

  log "controlled backend error"
  status="$(curl_status "${BASE_URL}/api/admin/dev/observability/error?status=503" "$body_file" \
    -D "$headers_file" \
    -H "X-Request-Id: ${request_id}")"

  if [[ "$status" != "503" ]]; then
    fail "expected controlled backend 503, got ${status}"
  fi

  assert_json_file "$body_file"
  header_request_id="$(awk 'BEGIN{IGNORECASE=1} /^X-Request-Id:/ {gsub("\r",""); print $2}' "$headers_file" | tail -n1)"
  if [[ -z "$header_request_id" ]]; then
    header_request_id="$request_id"
  fi
  body_request_id="$(python3 - "$body_file" <<'PY'
import json
import sys
with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    payload = json.load(fh)
print(payload.get("error", {}).get("requestId", ""))
PY
)"
  if [[ -z "$body_request_id" ]]; then
    body_request_id="$header_request_id"
  fi

  log "header_request_id=${header_request_id}"
  log "body_request_id=${body_request_id}"

  if [[ -z "$header_request_id" || "$header_request_id" != "$body_request_id" ]]; then
    fail "requestId mismatch between header and body"
  fi

  log "backend log grep"
  docker compose -f "$STACK_FILE" logs api --tail=200 | rg "$body_request_id" >/dev/null
}

run_internal_prometheus_endpoint_check() {
  log "internal /actuator/prometheus endpoint"
  docker compose -f "$STACK_FILE" exec -T api sh -c \
    "curl -fsS http://localhost:8080/actuator/prometheus | grep -E '^(# HELP )?barmi_outbox_pending_events|^(# HELP )?http_server_requests_seconds_count' >/dev/null"
}

run_prometheus_target_check() {
  local targets_file="$TMP_DIR/prometheus-targets.json"
  local status

  log "prometheus barmi-api target"
  status="$(curl_status "${PROMETHEUS_URL}/api/v1/targets?state=active" "$targets_file")"
  if [[ "$status" != "200" ]]; then
    fail "expected Prometheus targets status 200, got ${status}"
  fi
  assert_json_file "$targets_file"
  python3 - "$targets_file" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)

targets = payload.get("data", {}).get("activeTargets", [])
for target in targets:
    labels = target.get("labels", {})
    discovered = target.get("discoveredLabels", {})
    if labels.get("job") == "barmi-api" or discovered.get("__metrics_path__") == "/actuator/prometheus":
        if target.get("health") == "up":
            print("[observability] prometheus barmi-api target is up")
            raise SystemExit(0)
        raise SystemExit("barmi-api Prometheus target is not up")

raise SystemExit("barmi-api Prometheus target not found")
PY
}

run_prometheus_rules_check() {
  local rules_file="$TMP_DIR/prometheus-rules.json"
  local status

  log "prometheus alert rules"
  status="$(curl_status "${PROMETHEUS_URL}/api/v1/rules?type=alert" "$rules_file")"
  if [[ "$status" != "200" ]]; then
    fail "expected Prometheus rules status 200, got ${status}"
  fi
  assert_json_file "$rules_file"
  python3 - "$rules_file" <<'PY'
import json
import sys

expected = {
    "BarmiApiDown",
    "BarmiHigh5xxRate",
    "BarmiCheckoutFailuresSpike",
    "BarmiPaymentMismatch",
    "BarmiWebhookFailures",
    "BarmiOutboxFailed",
    "BarmiOutboxStuck",
    "BarmiDbPoolPressure",
    "BarmiRateLimitAbuse",
}

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)

found = set()
for group in payload.get("data", {}).get("groups", []):
    for rule in group.get("rules", []):
        name = rule.get("name")
        if name:
            found.add(name)

missing = expected - found
if missing:
    raise SystemExit("missing Prometheus alert rules: " + ", ".join(sorted(missing)))

print("[observability] Prometheus alert rules loaded")
PY
}

run_grafana_checks() {
  local health_file="$TMP_DIR/grafana-health.json"
  local datasource_file="$TMP_DIR/grafana-datasource.json"
  local dashboard_file="$TMP_DIR/grafana-dashboard.json"
  local contact_points_file="$TMP_DIR/grafana-contact-points.json"
  local status

  log "grafana health"
  status="$(curl_status "${GRAFANA_URL}/api/health" "$health_file")"
  if [[ "$status" != "200" ]]; then
    fail "expected Grafana health status 200, got ${status}"
  fi
  assert_json_file "$health_file"

  log "grafana Prometheus datasource"
  status="$(curl_status "${GRAFANA_URL}/api/datasources/uid/Prometheus" "$datasource_file" \
    -u "${GRAFANA_ADMIN_USER}:${GRAFANA_ADMIN_PASSWORD}")"
  if [[ "$status" != "200" ]]; then
    fail "expected Grafana datasource status 200, got ${status}"
  fi
  assert_json_file "$datasource_file"
  python3 - "$datasource_file" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    datasource = json.load(fh)
if datasource.get("name") != "Prometheus" or datasource.get("type") != "prometheus":
    raise SystemExit("Grafana Prometheus datasource mismatch")
print("[observability] Grafana Prometheus datasource loaded")
PY

  log "grafana dashboard"
  status="$(curl_status "${GRAFANA_URL}/api/dashboards/uid/barmi-operational-mvp" "$dashboard_file" \
    -u "${GRAFANA_ADMIN_USER}:${GRAFANA_ADMIN_PASSWORD}")"
  if [[ "$status" != "200" ]]; then
    fail "expected Grafana dashboard status 200, got ${status}"
  fi
  assert_json_file "$dashboard_file"
  python3 - "$dashboard_file" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)
dashboard = payload.get("dashboard", {})
if dashboard.get("title") != "Barmi Operational MVP":
    raise SystemExit("Grafana dashboard Barmi Operational MVP not loaded")
print("[observability] Grafana dashboard Barmi Operational MVP loaded")
PY

  log "grafana contact point provisioning"
  status="$(curl_status "${GRAFANA_URL}/api/v1/provisioning/contact-points" "$contact_points_file" \
    -u "${GRAFANA_ADMIN_USER}:${GRAFANA_ADMIN_PASSWORD}")"
  if [[ "$status" != "200" ]]; then
    fail "expected Grafana contact points status 200, got ${status}"
  fi
  assert_json_file "$contact_points_file"
  python3 - "$contact_points_file" "$EXPECT_ALERT_WEBHOOK" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)

expect_real_webhook = sys.argv[2] == "true"
for contact_point in payload:
    if contact_point.get("name") != "Barmi Alerts Webhook":
        continue
    settings = contact_point.get("settings", {})
    url = settings.get("url", "")
    if expect_real_webhook and (
        not url
        or "placeholder" in url
        or "127.0.0.1" in url
        or "localhost" in url
    ):
        raise SystemExit("Barmi Alerts Webhook is loaded but still points to a placeholder/loopback URL")
    print("[observability] Grafana alert webhook contact point loaded")
    raise SystemExit(0)

raise SystemExit("Grafana alert webhook contact point not found")
PY
}

run_release_metadata_check() {
  local info_file="$TMP_DIR/backend-info.json"
  local status

  log "backend release metadata"
  status="$(curl_status "${BASE_URL}/actuator/info" "$info_file")"
  if [[ "$status" != "200" ]]; then
    fail "expected backend actuator info status 200, got ${status}"
  fi
  assert_json_file "$info_file"
  python3 - "$info_file" "$RELEASE_ID" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)
app = payload.get("app", {})
version = app.get("version", "")
commit = app.get("commitSha", "")
build_timestamp = app.get("buildTimestamp", "")
if not version or version == "unknown":
    raise SystemExit("backend release version is missing/unknown")
if not commit or commit == "unknown":
    raise SystemExit("backend release commitSha is missing/unknown")
if not build_timestamp or build_timestamp == "unknown":
    raise SystemExit("backend release buildTimestamp is missing/unknown")
release_id = sys.argv[2]
if release_id and "+" in release_id:
    expected = f"{version}+{commit}"
    if release_id != expected:
        raise SystemExit(f"backend release metadata mismatch: expected RELEASE_ID {expected}, got {release_id}")
print(f"[observability] backend release version={version} commitSha={commit} buildTimestamp={build_timestamp}")
PY
}

run_frontend_smoke_check() {
  local sentry_expect_dsn_host="${SENTRY_EXPECT_DSN_HOST:-}"

  log "playwright frontend observability smoke"
  (
    cd "$ROOT_DIR/frontend"
    PLAYWRIGHT_BASE_URL="$BASE_URL" \
    PLAYWRIGHT_SKIP_WEBSERVER=true \
    SENTRY_EXPECT_DSN_HOST="$sentry_expect_dsn_host" \
    SENTRY_SMOKE_EXPECT_EVENT="$EXPECT_SENTRY_EVENT" \
    EXPECT_FRONTEND_RELEASE_ID="$RELEASE_ID" \
    npx playwright test tests/observability.smoke.spec.ts
  )
}

run_runtime_checks() {
  require_command docker
  require_command python3
  require_command rg
  require_command node

  log "runtime config BASE_URL=${BASE_URL} PROMETHEUS_URL=${PROMETHEUS_URL} GRAFANA_URL=${GRAFANA_URL} EXPECT_SENTRY_EVENT=${EXPECT_SENTRY_EVENT} EXPECT_ALERT_WEBHOOK=${EXPECT_ALERT_WEBHOOK} RELEASE_ID=${RELEASE_ID:-<not-set>}"
  run_backend_correlation_check
  run_internal_prometheus_endpoint_check
  run_prometheus_target_check
  run_prometheus_rules_check
  run_grafana_checks
  run_release_metadata_check
  run_frontend_smoke_check
  log "runtime checks completed"
}

case "$CHECK_MODE" in
  static | no-runtime)
    run_static_checks
    ;;
  runtime)
    run_runtime_checks
    ;;
  all)
    run_static_checks
    run_runtime_checks
    ;;
  *)
    fail "unknown CHECK_MODE=${CHECK_MODE}; expected static, no-runtime, runtime, or all"
    ;;
esac

log "smoke completed"
