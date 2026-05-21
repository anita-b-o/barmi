#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

STORE_BASE_DOMAIN="${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}"
HTTPS_PORT="${STAGING_HTTPS_PORT:-8443}"
ECOSYSTEM_HOST="${ECOSYSTEM_HOST:-${STORE_BASE_DOMAIN}}"
ADMIN_HOST="${ADMIN_HOST:-admin.${STORE_BASE_DOMAIN}}"
STORE_HOST="${STORE_HOST:-${VITE_PUBLIC_STORE_HOST:-demo-store.${STORE_BASE_DOMAIN}}}"
OTHER_STORE_HOST="${OTHER_STORE_HOST:-casa-roja.${STORE_BASE_DOMAIN}}"
MERCADO_STORE_HOST="${MERCADO_STORE_HOST:-mercado-centro.${STORE_BASE_DOMAIN}}"
ECOSYSTEM_SLUG="${ECOSYSTEM_SLUG:-${VITE_PUBLIC_ECOSYSTEM_SLUG:-demo-ecosystem}}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-secret}"
BASE_URL="${BASE_URL:-https://${ECOSYSTEM_HOST}:${HTTPS_PORT}}"
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

curl_common=(-sS -k)
if [[ "${LOCAL_RESOLVE:-true}" == "true" ]]; then
  for host in "$ECOSYSTEM_HOST" "$ADMIN_HOST" "$STORE_HOST" "$OTHER_STORE_HOST" "$MERCADO_STORE_HOST"
  do
    curl_common+=(--resolve "${host}:${HTTPS_PORT}:127.0.0.1")
  done
fi

status_for() {
  local method="$1"
  local url="$2"
  local output="$3"
  shift 3
  curl "${curl_common[@]}" -o "$output" -w '%{http_code}' -X "$method" "$url" "$@"
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local context="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[https-smoke] ${context} failed: expected ${expected}, got ${actual}" >&2
    [[ -s "$TMP_DIR/last-body.json" ]] && cat "$TMP_DIR/last-body.json" >&2 || true
    exit 1
  fi
}

assert_contains() {
  local value="$1"
  local expected="$2"
  local context="$3"
  if [[ "$value" != *"$expected"* ]]; then
    echo "[https-smoke] ${context} missing '${expected}' in: ${value}" >&2
    exit 1
  fi
}

json_get() {
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
    value = value[int(part)] if part.isdigit() else value[part]

print(value if not isinstance(value, (dict, list)) else json.dumps(value))
PY
}

echo "[https-smoke] readiness over HTTPS"
status="$(status_for GET "${BASE_URL}/actuator/health/readiness" "$TMP_DIR/last-body.json")"
assert_status "$status" "200" "readiness"

echo "[https-smoke] frontend routes on ecosystem, admin and store subdomains"
for route in \
  "https://${ECOSYSTEM_HOST}:${HTTPS_PORT}/ecosystem" \
  "https://${ADMIN_HOST}:${HTTPS_PORT}/admin" \
  "https://${STORE_HOST}:${HTTPS_PORT}/store" \
  "https://${OTHER_STORE_HOST}:${HTTPS_PORT}/store" \
  "https://${MERCADO_STORE_HOST}:${HTTPS_PORT}/store"
do
  curl "${curl_common[@]}" -fsS "$route" >/dev/null
done

echo "[https-smoke] CORS preflight with credentials from real HTTPS origins"
for origin in \
  "https://${ECOSYSTEM_HOST}:${HTTPS_PORT}" \
  "https://${ADMIN_HOST}:${HTTPS_PORT}" \
  "https://${STORE_HOST}:${HTTPS_PORT}" \
  "https://${OTHER_STORE_HOST}:${HTTPS_PORT}"
do
  headers="$TMP_DIR/cors-$(echo "$origin" | tr -c '[:alnum:]' '_').headers"
  status="$(curl "${curl_common[@]}" -D "$headers" -o /dev/null -w '%{http_code}' -X OPTIONS "${BASE_URL}/api/auth/refresh" \
    -H "Origin: ${origin}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,x-request-id")"
  assert_status "$status" "200" "CORS preflight ${origin}"
  access_control_origin="$(tr -d '\r' < "$headers" | awk 'BEGIN{IGNORECASE=1} /^access-control-allow-origin:/ {sub(/^[^:]+: */,""); print; exit}')"
  access_control_credentials="$(tr -d '\r' < "$headers" | awk 'BEGIN{IGNORECASE=1} /^access-control-allow-credentials:/ {sub(/^[^:]+: */,""); print; exit}')"
  assert_contains "$access_control_origin" "$origin" "CORS origin ${origin}"
  assert_contains "$access_control_credentials" "true" "CORS credentials ${origin}"
done

echo "[https-smoke] login writes Secure HttpOnly SameSite refresh cookie"
login_headers="$TMP_DIR/login.headers"
status="$(curl "${curl_common[@]}" -D "$login_headers" -o "$TMP_DIR/login.json" -w '%{http_code}' \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "Origin: https://${ADMIN_HOST}:${HTTPS_PORT}" \
  -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" \
  --data "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
assert_status "$status" "200" "auth login"
set_cookie="$(tr -d '\r' < "$login_headers" | awk 'BEGIN{IGNORECASE=1} /^set-cookie:/ {sub(/^[^:]+: */,""); print; exit}')"
assert_contains "$set_cookie" "barmi_refresh_token=" "refresh cookie"
assert_contains "$set_cookie" "HttpOnly" "refresh cookie attributes"
assert_contains "$set_cookie" "Secure" "refresh cookie attributes"
assert_contains "$set_cookie" "SameSite=${REFRESH_COOKIE_SAMESITE:-Lax}" "refresh cookie attributes"

if [[ -n "${REFRESH_COOKIE_DOMAIN:-}" ]]; then
  assert_contains "$set_cookie" "Domain=${REFRESH_COOKIE_DOMAIN}" "refresh cookie domain"
fi

access_token="$(json_get "$TMP_DIR/login.json" "accessToken")"

echo "[https-smoke] refresh cookie works over HTTPS and clears on logout"
status="$(status_for POST "${BASE_URL}/api/auth/refresh" "$TMP_DIR/refresh.json" \
  -H "Origin: https://${ADMIN_HOST}:${HTTPS_PORT}" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR")"
assert_status "$status" "200" "auth refresh"

status="$(status_for GET "${BASE_URL}/api/auth/me" "$TMP_DIR/me.json" \
  -H "Authorization: Bearer ${access_token}" \
  -H "Origin: https://${ADMIN_HOST}:${HTTPS_PORT}")"
assert_status "$status" "200" "auth me"

status="$(status_for POST "${BASE_URL}/api/auth/logout" "$TMP_DIR/logout.json" \
  -H "Origin: https://${ADMIN_HOST}:${HTTPS_PORT}" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR")"
assert_status "$status" "200" "auth logout"

status="$(status_for POST "${BASE_URL}/api/auth/refresh" "$TMP_DIR/refresh-after-logout.json" \
  -H "Origin: https://${ADMIN_HOST}:${HTTPS_PORT}" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR")"
assert_status "$status" "401" "refresh after logout"

echo "[https-smoke] tenant resolution on multiple store subdomains"
for host in "$STORE_HOST" "$OTHER_STORE_HOST" "$MERCADO_STORE_HOST"
do
  status="$(status_for GET "https://${host}:${HTTPS_PORT}/api/public/stores/${host%%.*}" "$TMP_DIR/store-${host%%.*}.json")"
  assert_status "$status" "200" "public store ${host}"
done

echo "[https-smoke] ecosystem public endpoint"
status="$(status_for GET "${BASE_URL}/api/public/ecosystems/${ECOSYSTEM_SLUG}/home" "$TMP_DIR/ecosystem-home.json")"
assert_status "$status" "200" "ecosystem home"

echo "[https-smoke] HTTPS staging checks passed"
