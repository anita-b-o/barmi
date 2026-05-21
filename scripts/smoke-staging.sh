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
API_BASE_URL="${API_BASE_URL:-${BASE_URL}}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-$BASE_URL}"
ECOSYSTEM_SLUG="${ECOSYSTEM_SLUG:-demo-ecosystem}"
STORE_HOST="${STORE_HOST:-${VITE_PUBLIC_STORE_HOST:-demo-store.example.com}}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-secret}"
BUYER_EMAIL="${BUYER_EMAIL:-buyer@example.com}"
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

curl_resolve_args=()
if [[ "${LOCAL_RESOLVE:-true}" == "true" && "$DEFAULT_SCHEME" == "https" ]]; then
  for host in \
    "${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}" \
    "${STORE_HOST}" \
    "admin.${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}" \
    "casa-roja.${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}" \
    "mercado-centro.${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}"
  do
    curl_resolve_args+=(--resolve "${host}:${DEFAULT_PORT}:127.0.0.1")
  done
fi

should_skip_tls_verification() {
  local url="$1"
  [[ "${CURL_INSECURE:-}" == "true" ]] \
    || [[ "$url" == https://localhost* ]] \
    || [[ "$url" == https://staging.127.0.0.1.sslip.io* ]] \
    || [[ "$url" == https://*.staging.127.0.0.1.sslip.io* ]]
}

request_json() {
  local method="$1"
  local url="$2"
  local output="$3"
  local status
  shift 3
  local curl_args=(-sS -o "$output" -w '%{http_code}' -X "$method")
  if [[ "$url" == https://* ]]; then
    if should_skip_tls_verification "$url"; then
      curl_args+=(-k)
    fi
    curl_args+=("${curl_resolve_args[@]}")
  fi
  status="$(curl "${curl_args[@]}" "$url" "$@")"
  echo "$status"
}

json_get() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json
import sys

path = sys.argv[1]
expr = sys.argv[2]
with open(path, 'r', encoding='utf-8') as fh:
    data = json.load(fh)

value = data
for part in expr.split('.'):
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

pick_ecosystem_checkout_product() {
  local file="$1"
  python3 - "$file" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    products = json.load(fh)

preferred = next((product for product in products if product.get("deliverySupported")), None)
selected = preferred or (products[0] if products else None)
if not selected:
    sys.exit(1)

print(selected["id"])
print("true" if selected.get("deliverySupported") else "false")
PY
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local context="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[smoke] ${context} failed: expected ${expected}, got ${actual}" >&2
    exit 1
  fi
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
    local status
    status="$(request_json GET "$url" "$TMP_DIR/readiness-wait.json")" || status="000"
    if [[ "$status" == "200" ]]; then
      local readiness_status
      readiness_status="$(json_get "$TMP_DIR/readiness-wait.json" "status")"
      if [[ "$readiness_status" == "UP" || "$readiness_status" == "DEGRADED" ]]; then
        echo "[smoke] readiness recovered in ${elapsed}s"
        return 0
      fi
      echo "[smoke] readiness polled ${elapsed}s status=${status} body_status=${readiness_status}"
    else
      echo "[smoke] readiness polled ${elapsed}s status=${status}"
    fi
    if (( elapsed >= max_wait_seconds )); then
      echo "[smoke] readiness did not recover within ${max_wait_seconds}s" >&2
      return 1
    fi
    sleep "$interval_seconds"
  done
}

echo "[smoke] backend readiness"
wait_for_readiness "${API_BASE_URL}/actuator/health/readiness" 45 1
status="$(request_json GET "${API_BASE_URL}/actuator/health/readiness" "$TMP_DIR/readiness.json")"
assert_status "$status" "200" "backend readiness"
readiness_status="$(json_get "$TMP_DIR/readiness.json" "status")"
if [[ "$readiness_status" != "UP" && "$readiness_status" != "DEGRADED" ]]; then
  echo "[smoke] readiness status unexpected: ${readiness_status}" >&2
  exit 1
fi

echo "[smoke] frontend route reachability"
curl_args=(-fsS)
if [[ "$PUBLIC_BASE_URL" == https://* ]]; then
  if should_skip_tls_verification "$PUBLIC_BASE_URL"; then
    curl_args+=(-k)
  fi
  curl_args+=("${curl_resolve_args[@]}")
fi
curl "${curl_args[@]}" "${PUBLIC_BASE_URL}/auth/login" >/dev/null
curl "${curl_args[@]}" "${PUBLIC_BASE_URL}/ecosystem" >/dev/null

echo "[smoke] auth login"
login_status="$(request_json POST "${API_BASE_URL}/api/auth/login" "$TMP_DIR/login.json" \
  -H 'Content-Type: application/json' \
  -c "$COOKIE_JAR" \
  --data "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
assert_status "$login_status" "200" "auth login"
access_token="$(json_get "$TMP_DIR/login.json" "accessToken")"

echo "[smoke] ecosystem public home"
status="$(request_json GET "${API_BASE_URL}/api/public/ecosystems/${ECOSYSTEM_SLUG}/home" "$TMP_DIR/home.json")"
assert_status "$status" "200" "ecosystem home"
json_get "$TMP_DIR/home.json" "ecosystem.slug" >/dev/null

echo "[smoke] ecosystem public catalog"
status="$(request_json GET "${API_BASE_URL}/api/public/ecosystems/${ECOSYSTEM_SLUG}/products" "$TMP_DIR/catalog.json")"
assert_status "$status" "200" "ecosystem catalog"
mapfile -t ecosystem_checkout_product < <(pick_ecosystem_checkout_product "$TMP_DIR/catalog.json")
ecosystem_product_id="${ecosystem_checkout_product[0]}"
ecosystem_product_delivery_supported="${ecosystem_checkout_product[1]}"

echo "[smoke] ecosystem stores map"
status="$(request_json GET "${API_BASE_URL}/api/public/ecosystems/${ECOSYSTEM_SLUG}/stores/map" "$TMP_DIR/map.json")"
assert_status "$status" "200" "ecosystem map"
json_get "$TMP_DIR/map.json" "stores.0.slug" >/dev/null

echo "[smoke] store checkout"
store_checkout_status="$(request_json POST "${API_BASE_URL}/api/store/checkout" "$TMP_DIR/store-checkout.json" \
  -H "Host: ${STORE_HOST}" \
  -H 'Content-Type: application/json' \
  --data "{\"items\":[{\"productId\":\"31111111-1111-1111-1111-111111111111\",\"qty\":1}],\"shipping\":{\"postalCode\":\"1900\"},\"couponCode\":\"CAFE10\",\"buyerEmail\":\"${BUYER_EMAIL}\"}")"
assert_status "$store_checkout_status" "201" "store checkout"
store_order_id="$(json_get "$TMP_DIR/store-checkout.json" "orderId")"

echo "[smoke] store orders view"
status="$(request_json GET "${API_BASE_URL}/api/store/orders/${store_order_id}" "$TMP_DIR/store-order.json" -H "Host: ${STORE_HOST}")"
assert_status "$status" "200" "store order detail"
json_get "$TMP_DIR/store-order.json" "orderId" >/dev/null

echo "[smoke] ecosystem checkout"
ecosystem_checkout_payload="{\"ecosystemId\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"items\":[{\"externalProductId\":\"${ecosystem_product_id}\",\"qty\":1}],\"couponCode\":\"URBANO15\""
if [[ "$ecosystem_product_delivery_supported" == "true" ]]; then
  ecosystem_checkout_payload+=",\"shipping\":{\"postalCode\":\"1900\"}"
fi
ecosystem_checkout_payload+="}"
eco_checkout_status="$(request_json POST "${API_BASE_URL}/api/ecosystem/checkout" "$TMP_DIR/eco-checkout.json" \
  -H 'Content-Type: application/json' \
  --data "${ecosystem_checkout_payload}")"
assert_status "$eco_checkout_status" "201" "ecosystem checkout"
ecosystem_order_id="$(json_get "$TMP_DIR/eco-checkout.json" "id")"

echo "[smoke] ecosystem orders view"
status="$(request_json GET "${API_BASE_URL}/api/ecosystem/orders/${ecosystem_order_id}" "$TMP_DIR/eco-order.json")"
assert_status "$status" "200" "ecosystem order detail"
json_get "$TMP_DIR/eco-order.json" "orderId" >/dev/null

echo "[smoke] auth me"
status="$(request_json GET "${API_BASE_URL}/api/auth/me" "$TMP_DIR/me.json" -H "Authorization: Bearer ${access_token}")"
assert_status "$status" "200" "auth me"
json_get "$TMP_DIR/me.json" "email" >/dev/null

echo "[smoke] auth refresh"
refresh_status="$(request_json POST "${API_BASE_URL}/api/auth/refresh" "$TMP_DIR/refresh.json" \
  -c "$COOKIE_JAR" \
  -b "$COOKIE_JAR")"
assert_status "$refresh_status" "200" "auth refresh"
refreshed_access_token="$(json_get "$TMP_DIR/refresh.json" "accessToken")"

echo "[smoke] auth me after refresh"
status="$(request_json GET "${API_BASE_URL}/api/auth/me" "$TMP_DIR/me-refreshed.json" -H "Authorization: Bearer ${refreshed_access_token}")"
assert_status "$status" "200" "auth me after refresh"
json_get "$TMP_DIR/me-refreshed.json" "email" >/dev/null

echo "[smoke] auth logout"
logout_status="$(request_json POST "${API_BASE_URL}/api/auth/logout" "$TMP_DIR/logout.json" \
  -c "$COOKIE_JAR" \
  -b "$COOKIE_JAR")"
assert_status "$logout_status" "200" "auth logout"

echo "[smoke] auth refresh after logout"
refresh_after_logout_status="$(request_json POST "${API_BASE_URL}/api/auth/refresh" "$TMP_DIR/refresh-after-logout.json" \
  -c "$COOKIE_JAR" \
  -b "$COOKIE_JAR")"
assert_status "$refresh_after_logout_status" "401" "auth refresh after logout"

echo "[smoke] all critical checks passed"
