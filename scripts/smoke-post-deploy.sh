#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

BASE_URL="${BASE_URL:-http://localhost:${STAGING_HTTP_PORT:-8088}}"
API_BASE_URL="${API_BASE_URL:-$BASE_URL}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-$BASE_URL}"
ECOSYSTEM_SLUG="${ECOSYSTEM_SLUG:-${VITE_PUBLIC_ECOSYSTEM_SLUG:-demo-ecosystem}}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-secret}"
EXPECT_FRONTEND_RELEASE_ID="${EXPECT_FRONTEND_RELEASE_ID:-${VITE_APP_RELEASE_ID:-${APP_VERSION:-}+${APP_COMMIT_SHA:-}}}"
EXPECT_FRONTEND_COMMIT_SHA="${EXPECT_FRONTEND_COMMIT_SHA:-${VITE_APP_COMMIT_SHA:-${APP_COMMIT_SHA:-}}}"
EXPECT_FRONTEND_BUILD_TIMESTAMP="${EXPECT_FRONTEND_BUILD_TIMESTAMP:-${VITE_APP_BUILD_TIMESTAMP:-${APP_BUILD_TIMESTAMP:-}}}"
EXPECT_FRONTEND_ENV="${EXPECT_FRONTEND_ENV:-${VITE_APP_ENV:-staging}}"
RUN_OBSERVABILITY_SMOKE="${RUN_OBSERVABILITY_SMOKE:-false}"
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

require_value() {
  local label="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "[post-deploy] missing required value: $label" >&2
    exit 1
  fi
}

request_with_headers() {
  local method="$1"
  local url="$2"
  local body_file="$3"
  local headers_file="$4"
  local status
  shift 4
  status="$(curl -sS -D "$headers_file" -o "$body_file" -w '%{http_code}' -X "$method" "$url" "$@")"
  echo "$status"
}

json_get() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)

value = data
for part in sys.argv[2].split('.'):
    if not part:
        continue
    if part.isdigit():
        value = value[int(part)]
    else:
        value = value[part]

if isinstance(value, (dict, list)):
    print(json.dumps(value))
else:
    print(value)
PY
}

extract_request_id() {
  local headers_file="$1"
  awk 'BEGIN{IGNORECASE=1} /^X-Request-Id:/ {gsub("\r",""); print $2}' "$headers_file" | tail -n1
}

wait_for_readiness() {
  local url="$1"
  local max_wait_seconds="${2:-45}"
  local interval_seconds="${3:-1}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local elapsed
    elapsed="$(( $(date +%s) - started_at ))"
    local body_file="$TMP_DIR/readiness-wait.json"
    local headers_file="$TMP_DIR/readiness-wait.headers"
    local status
    status="$(request_with_headers GET "$url" "$body_file" "$headers_file")" || status="000"
    if [[ "$status" == "200" ]]; then
      local readiness_status
      readiness_status="$(json_get "$body_file" "status")"
      if [[ "$readiness_status" == "UP" || "$readiness_status" == "DEGRADED" ]]; then
        echo "[post-deploy] readiness recovered in ${elapsed}s" >&2
        return 0
      fi
      echo "[post-deploy] readiness polled ${elapsed}s status=${status} body_status=${readiness_status}" >&2
    else
      echo "[post-deploy] readiness polled ${elapsed}s status=${status}" >&2
    fi
    if (( elapsed >= max_wait_seconds )); then
      echo "[post-deploy] readiness did not recover within ${max_wait_seconds}s" >&2
      return 1
    fi
    sleep "$interval_seconds"
  done
}

request_with_startup_retry() {
  local method="$1"
  local url="$2"
  local body_file="$3"
  local headers_file="$4"
  local label="$5"
  shift 5

  local max_wait_seconds=45
  local started_at
  started_at="$(date +%s)"

  while true; do
    local status
    status="$(request_with_headers "$method" "$url" "$body_file" "$headers_file" "$@")"
    if [[ "$status" != "502" && "$status" != "503" ]]; then
      echo "$status"
      return 0
    fi

    local elapsed
    elapsed="$(( $(date +%s) - started_at ))"
    echo "[post-deploy] ${label} transient status=${status}; waiting for readiness" >&2
    if (( elapsed >= max_wait_seconds )); then
      echo "$status"
      return 0
    fi
    wait_for_readiness "${API_BASE_URL}/actuator/health/readiness" "$(( max_wait_seconds - elapsed ))" 1
  done
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[post-deploy] ${label} failed: expected ${expected}, got ${actual}" >&2
    exit 1
  fi
}

assert_request_id() {
  local headers_file="$1"
  local label="$2"
  local request_id
  request_id="$(extract_request_id "$headers_file")"
  if [[ -z "$request_id" ]]; then
    echo "[post-deploy] missing X-Request-Id on ${label}" >&2
    exit 1
  fi
  echo "[post-deploy] ${label} requestId=${request_id}"
}

echo "[post-deploy] backend readiness"
wait_for_readiness "${API_BASE_URL}/actuator/health/readiness" 45 1
status="$(request_with_headers GET "${API_BASE_URL}/actuator/health/readiness" "$TMP_DIR/readiness.json" "$TMP_DIR/readiness.headers")"
assert_status "$status" "200" "backend readiness"
readiness_status="$(json_get "$TMP_DIR/readiness.json" "status")"
if [[ "$readiness_status" != "UP" && "$readiness_status" != "DEGRADED" ]]; then
  echo "[post-deploy] unexpected readiness status: ${readiness_status}" >&2
  exit 1
fi

echo "[post-deploy] frontend reachable"
curl -fsS "${PUBLIC_BASE_URL}/auth/login" >/dev/null

echo "[post-deploy] auth login"
status="$(request_with_startup_retry POST "${API_BASE_URL}/api/auth/login" "$TMP_DIR/login.json" "$TMP_DIR/login.headers" "auth login" \
  -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" \
  --data "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
assert_status "$status" "200" "auth login"
assert_request_id "$TMP_DIR/login.headers" "auth login"

echo "[post-deploy] ecosystem public home"
status="$(request_with_startup_retry GET "${API_BASE_URL}/api/public/ecosystems/${ECOSYSTEM_SLUG}/home" "$TMP_DIR/home.json" "$TMP_DIR/home.headers" "ecosystem public home")"
assert_status "$status" "200" "ecosystem public home"
assert_request_id "$TMP_DIR/home.headers" "ecosystem home"
json_get "$TMP_DIR/home.json" "ecosystem.slug" >/dev/null

echo "[post-deploy] frontend release metadata"
require_value "EXPECT_FRONTEND_RELEASE_ID" "$EXPECT_FRONTEND_RELEASE_ID"
require_value "EXPECT_FRONTEND_COMMIT_SHA" "$EXPECT_FRONTEND_COMMIT_SHA"
require_value "EXPECT_FRONTEND_BUILD_TIMESTAMP" "$EXPECT_FRONTEND_BUILD_TIMESTAMP"
require_value "EXPECT_FRONTEND_ENV" "$EXPECT_FRONTEND_ENV"
curl -fsS "${PUBLIC_BASE_URL}/index.html" -o "$TMP_DIR/index.html"
bundle_path="$(grep -oE '/assets/index-[^"]+\.js' "$TMP_DIR/index.html" | head -n1)"
if [[ -z "$bundle_path" ]]; then
  echo "[post-deploy] could not find main frontend bundle in index.html" >&2
  exit 1
fi
curl -fsS "${PUBLIC_BASE_URL}${bundle_path}" -o "$TMP_DIR/main-bundle.js"
rg -F "$EXPECT_FRONTEND_RELEASE_ID" "$TMP_DIR/main-bundle.js" >/dev/null
rg -F "$EXPECT_FRONTEND_COMMIT_SHA" "$TMP_DIR/main-bundle.js" >/dev/null
rg -F "$EXPECT_FRONTEND_BUILD_TIMESTAMP" "$TMP_DIR/main-bundle.js" >/dev/null
rg -F "$EXPECT_FRONTEND_ENV" "$TMP_DIR/main-bundle.js" >/dev/null
echo "[post-deploy] frontend bundle includes expected release metadata"

if [[ "$RUN_OBSERVABILITY_SMOKE" == "true" ]]; then
  echo "[post-deploy] optional observability smoke"
  BASE_URL="$BASE_URL" "$ROOT_DIR/scripts/smoke-observability.sh"
fi

echo "[post-deploy] smoke passed"
