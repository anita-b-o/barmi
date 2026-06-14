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
DEFAULT_HOST="localhost"
DEFAULT_PORT="${STAGING_HTTP_PORT:-8088}"
if [[ "$DEFAULT_SCHEME" == "https" ]]; then
  DEFAULT_HOST="${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}"
  DEFAULT_PORT="${STAGING_HTTPS_PORT:-8443}"
fi
BASE_URL="${BASE_URL:-${DEFAULT_SCHEME}://${DEFAULT_HOST}:${DEFAULT_PORT}}"
BASE_URL="${BASE_URL%/}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-}"
if [[ -z "$ALLOWED_ORIGIN" && -n "${ALLOWED_ORIGINS:-}" ]]; then
  ALLOWED_ORIGIN="${ALLOWED_ORIGINS%%,*}"
fi
ALLOWED_ORIGIN="${ALLOWED_ORIGIN#"${ALLOWED_ORIGIN%%[![:space:]]*}"}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN%"${ALLOWED_ORIGIN##*[![:space:]]}"}"
DISALLOWED_ORIGIN="${DISALLOWED_ORIGIN:-https://evil.example.invalid}"
PAYLOAD_BYTES="${PAYLOAD_BYTES:-300000}"
EXPECT_TRUST_PROXY_HEADERS="${EXPECT_TRUST_PROXY_HEADERS:-false}"
RUN_RATE_LIMIT_SPOOF_CHECK="${RUN_RATE_LIMIT_SPOOF_CHECK:-true}"
RATE_LIMIT_ATTEMPTS="${RATE_LIMIT_ATTEMPTS:-6}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

should_skip_tls_verification() {
  local url="$1"
  [[ "${CURL_INSECURE:-}" == "true" ]] \
    || [[ "$url" == https://localhost* ]] \
    || [[ "$url" == https://staging.127.0.0.1.sslip.io* ]] \
    || [[ "$url" == https://*.staging.127.0.0.1.sslip.io* ]]
}

curl_common=(-sS)
if [[ "$BASE_URL" == https://* ]] && should_skip_tls_verification "$BASE_URL"; then
  curl_common+=(-k)
fi

status_for() {
  local method="$1"
  local path="$2"
  local body_file="$3"
  local headers_file="$4"
  shift 4
  curl "${curl_common[@]}" -D "$headers_file" -o "$body_file" -w '%{http_code}' -X "$method" "${BASE_URL}${path}" "$@"
}

header_value() {
  local headers_file="$1"
  local header_name="$2"
  awk -v name="$header_name" '
    BEGIN { IGNORECASE=1 }
    index(tolower($0), tolower(name) ":") == 1 {
      gsub("\r", "")
      sub(/^[^:]+:[[:space:]]*/, "")
      print
    }
  ' "$headers_file" | tail -n1
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local context="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[hardening-smoke] ${context} failed: expected ${expected}, got ${actual}" >&2
    [[ -s "$TMP_DIR/last-body" ]] && cat "$TMP_DIR/last-body" >&2 || true
    exit 1
  fi
}

assert_status_in() {
  local actual="$1"
  local expected_csv="$2"
  local context="$3"
  IFS=',' read -ra expected_values <<< "$expected_csv"
  for expected in "${expected_values[@]}"; do
    if [[ "$actual" == "$expected" ]]; then
      return 0
    fi
  done
  echo "[hardening-smoke] ${context} failed: expected one of ${expected_csv}, got ${actual}" >&2
  [[ -s "$TMP_DIR/last-body" ]] && cat "$TMP_DIR/last-body" >&2 || true
  exit 1
}

json_expr() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)

value = data
for part in sys.argv[2].split("."):
    if not part:
        continue
    value = value[int(part)] if part.isdigit() else value.get(part)
    if value is None:
        break

if value is None:
    print("")
elif isinstance(value, (dict, list)):
    print(json.dumps(value, sort_keys=True))
else:
    print(value)
PY
}

assert_health_is_public_and_sanitized() {
  echo "[hardening-smoke] actuator health is public and sanitized"
  local status
  status="$(status_for GET "/actuator/health" "$TMP_DIR/health.json" "$TMP_DIR/health.headers")"
  cp "$TMP_DIR/health.json" "$TMP_DIR/last-body"
  assert_status "$status" "200" "actuator health"

  python3 - "$TMP_DIR/health.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    payload = json.load(fh)

if "status" not in payload:
    raise SystemExit("health response missing status")

serialized = json.dumps(payload).lower()
for forbidden in ("components", "details", "db", "redis", "outboxbacklog"):
    if forbidden in serialized:
        raise SystemExit(f"health response leaks internal detail: {forbidden}")
PY
}

assert_metrics_not_public() {
  echo "[hardening-smoke] actuator metrics are not public"
  local status
  status="$(status_for GET "/actuator/metrics" "$TMP_DIR/metrics.body" "$TMP_DIR/metrics.headers")"
  cp "$TMP_DIR/metrics.body" "$TMP_DIR/last-body"
  assert_status_in "$status" "401,403,404" "actuator metrics"
}

assert_admin_requires_auth() {
  echo "[hardening-smoke] store admin orders require auth"
  local status
  status="$(status_for GET "/api/store/admin/orders" "$TMP_DIR/admin-orders.body" "$TMP_DIR/admin-orders.headers")"
  cp "$TMP_DIR/admin-orders.body" "$TMP_DIR/last-body"
  assert_status "$status" "401" "unauthenticated store admin orders"
}

assert_request_body_limit() {
  echo "[hardening-smoke] oversized payload returns 413 from edge"
  python3 - "$PAYLOAD_BYTES" > "$TMP_DIR/oversized.json" <<'PY'
import json
import sys

target_size = int(sys.argv[1])
payload = {"email": "hardening-smoke@example.invalid", "password": "secret", "padding": "x" * target_size}
print(json.dumps(payload))
PY

  local status
  status="$(status_for POST "/api/auth/login" "$TMP_DIR/oversized.body" "$TMP_DIR/oversized.headers" \
    -H "Content-Type: application/json" \
    --data-binary "@$TMP_DIR/oversized.json")"
  cp "$TMP_DIR/oversized.body" "$TMP_DIR/last-body"
  assert_status "$status" "413" "oversized payload"
}

assert_cors_allowed_origin() {
  if [[ -z "$ALLOWED_ORIGIN" ]]; then
    echo "[hardening-smoke] skipping allowed CORS check; set ALLOWED_ORIGIN or ALLOWED_ORIGINS"
    return 0
  fi

  echo "[hardening-smoke] allowed CORS origin echoes allow-origin"
  local status headers allow_origin allow_credentials
  headers="$TMP_DIR/cors-allowed.headers"
  status="$(status_for OPTIONS "/api/auth/refresh" "$TMP_DIR/cors-allowed.body" "$headers" \
    -H "Origin: ${ALLOWED_ORIGIN}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,x-request-id")"
  cp "$TMP_DIR/cors-allowed.body" "$TMP_DIR/last-body"
  assert_status_in "$status" "200,204" "allowed CORS preflight"

  allow_origin="$(header_value "$headers" "Access-Control-Allow-Origin")"
  allow_credentials="$(header_value "$headers" "Access-Control-Allow-Credentials")"
  if [[ "$allow_origin" != "$ALLOWED_ORIGIN" ]]; then
    echo "[hardening-smoke] allowed CORS origin mismatch: expected ${ALLOWED_ORIGIN}, got ${allow_origin}" >&2
    exit 1
  fi
  if [[ "$allow_credentials" != "true" ]]; then
    echo "[hardening-smoke] allowed CORS credentials missing/false: ${allow_credentials}" >&2
    exit 1
  fi
}

assert_cors_disallowed_origin() {
  echo "[hardening-smoke] disallowed CORS origin does not receive allow-origin"
  local status headers allow_origin
  headers="$TMP_DIR/cors-disallowed.headers"
  status="$(status_for OPTIONS "/api/auth/refresh" "$TMP_DIR/cors-disallowed.body" "$headers" \
    -H "Origin: ${DISALLOWED_ORIGIN}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,x-request-id")"
  cp "$TMP_DIR/cors-disallowed.body" "$TMP_DIR/last-body"
  assert_status_in "$status" "200,204,403" "disallowed CORS preflight"

  allow_origin="$(header_value "$headers" "Access-Control-Allow-Origin")"
  if [[ -n "$allow_origin" ]]; then
    echo "[hardening-smoke] disallowed CORS origin unexpectedly received allow-origin: ${allow_origin}" >&2
    exit 1
  fi
}

assert_forwarded_host_spoof_does_not_set_tenant_when_untrusted() {
  if [[ "$EXPECT_TRUST_PROXY_HEADERS" == "true" ]]; then
    echo "[hardening-smoke] skipping X-Forwarded-Host spoof check because EXPECT_TRUST_PROXY_HEADERS=true"
    return 0
  fi

  echo "[hardening-smoke] X-Forwarded-Host spoof does not set tenant when proxy headers are untrusted"
  local baseline_status spoof_status baseline_slug spoof_slug
  baseline_status="$(status_for GET "/api/public/whoami" "$TMP_DIR/whoami-baseline.json" "$TMP_DIR/whoami-baseline.headers")"
  cp "$TMP_DIR/whoami-baseline.json" "$TMP_DIR/last-body"
  assert_status "$baseline_status" "200" "tenant baseline whoami"
  baseline_slug="$(json_expr "$TMP_DIR/whoami-baseline.json" "storeSlug")"

  spoof_status="$(status_for GET "/api/public/whoami" "$TMP_DIR/whoami-spoof.json" "$TMP_DIR/whoami-spoof.headers" \
    -H "X-Forwarded-Host: spoof-store.example.com")"
  cp "$TMP_DIR/whoami-spoof.json" "$TMP_DIR/last-body"
  assert_status "$spoof_status" "200" "tenant spoof whoami"
  spoof_slug="$(json_expr "$TMP_DIR/whoami-spoof.json" "storeSlug")"
  if [[ "$spoof_slug" != "$baseline_slug" ]]; then
    echo "[hardening-smoke] X-Forwarded-Host spoof changed tenant: baseline=${baseline_slug:-<none>} spoof=${spoof_slug:-<none>}" >&2
    exit 1
  fi
}

assert_forwarded_for_spoof_does_not_bypass_rate_limit() {
  if [[ "$RUN_RATE_LIMIT_SPOOF_CHECK" != "true" ]]; then
    echo "[hardening-smoke] skipping X-Forwarded-For rate-limit check"
    return 0
  fi

  echo "[hardening-smoke] X-Forwarded-For spoof does not bypass login rate limit"
  local email status saw_429
  email="hardening-smoke-$(date +%s)-$$@example.invalid"
  saw_429="false"

  for attempt in $(seq 1 "$RATE_LIMIT_ATTEMPTS"); do
    status="$(status_for POST "/api/auth/login" "$TMP_DIR/login-${attempt}.body" "$TMP_DIR/login-${attempt}.headers" \
      -H "X-Forwarded-For: 203.0.113.${attempt}" \
      -H "Content-Type: application/json" \
      --data "{\"email\":\"${email}\",\"password\":\"definitely-wrong\"}")"
    if [[ "$status" == "429" ]]; then
      saw_429="true"
      break
    fi
  done

  if [[ "$saw_429" != "true" ]]; then
    echo "[hardening-smoke] expected a 429 within ${RATE_LIMIT_ATTEMPTS} spoofed login attempts" >&2
    echo "[hardening-smoke] set RUN_RATE_LIMIT_SPOOF_CHECK=false only if rate limiting is intentionally disabled in this environment" >&2
    exit 1
  fi
}

echo "[hardening-smoke] base_url=${BASE_URL}"
assert_health_is_public_and_sanitized
assert_metrics_not_public
assert_admin_requires_auth
assert_request_body_limit
assert_cors_allowed_origin
assert_cors_disallowed_origin
assert_forwarded_host_spoof_does_not_set_tenant_when_untrusted
assert_forwarded_for_spoof_does_not_bypass_rate_limit

echo "[hardening-smoke] production hardening smoke passed"
