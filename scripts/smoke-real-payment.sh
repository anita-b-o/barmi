#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CALLER_MP_ACCESS_TOKEN="${MP_ACCESS_TOKEN:-}"
CALLER_MP_PUBLIC_BASE_URL="${MP_PUBLIC_BASE_URL:-}"
CALLER_MP_WEBHOOK_SECRET="${MP_WEBHOOK_SECRET:-}"
CALLER_MP_STUB_ENABLED="${MP_STUB_ENABLED:-}"
CALLER_WAIT_FOR_WEBHOOK="${WAIT_FOR_WEBHOOK:-}"
CALLER_BASE_URL="${BASE_URL:-}"
CALLER_STORE_BASE_URL="${STORE_BASE_URL:-}"
CALLER_STORE_HOST="${STORE_HOST:-}"
CALLER_LOCAL_RESOLVE="${LOCAL_RESOLVE:-}"
CALLER_STACK_FILE="${STACK_FILE:-}"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

[[ -n "$CALLER_MP_ACCESS_TOKEN" ]] && MP_ACCESS_TOKEN="$CALLER_MP_ACCESS_TOKEN"
[[ -n "$CALLER_MP_PUBLIC_BASE_URL" ]] && MP_PUBLIC_BASE_URL="$CALLER_MP_PUBLIC_BASE_URL"
[[ -n "$CALLER_MP_WEBHOOK_SECRET" ]] && MP_WEBHOOK_SECRET="$CALLER_MP_WEBHOOK_SECRET"
[[ -n "$CALLER_MP_STUB_ENABLED" ]] && MP_STUB_ENABLED="$CALLER_MP_STUB_ENABLED"
[[ -n "$CALLER_WAIT_FOR_WEBHOOK" ]] && WAIT_FOR_WEBHOOK="$CALLER_WAIT_FOR_WEBHOOK"
[[ -n "$CALLER_BASE_URL" ]] && BASE_URL="$CALLER_BASE_URL"
[[ -n "$CALLER_STORE_BASE_URL" ]] && STORE_BASE_URL="$CALLER_STORE_BASE_URL"
[[ -n "$CALLER_STORE_HOST" ]] && STORE_HOST="$CALLER_STORE_HOST"
[[ -n "$CALLER_LOCAL_RESOLVE" ]] && LOCAL_RESOLVE="$CALLER_LOCAL_RESOLVE"
[[ -n "$CALLER_STACK_FILE" ]] && STACK_FILE="$CALLER_STACK_FILE"

STORE_BASE_DOMAIN="${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}"
HTTPS_PORT="${STAGING_HTTPS_PORT:-8443}"
STORE_HOST="${STORE_HOST:-${VITE_PUBLIC_STORE_HOST:-demo-store.${STORE_BASE_DOMAIN}}}"
BASE_URL="${BASE_URL:-https://${STORE_BASE_DOMAIN}:${HTTPS_PORT}}"
STORE_BASE_URL="${STORE_BASE_URL:-https://${STORE_HOST}:${HTTPS_PORT}}"
BUYER_EMAIL="${BUYER_EMAIL:-buyer@example.com}"
PAYMENT_PROVIDER="${PAYMENT_PROVIDER:-MERCADOPAGO}"
WAIT_FOR_WEBHOOK="${WAIT_FOR_WEBHOOK:-true}"
WEBHOOK_TIMEOUT_SECONDS="${WEBHOOK_TIMEOUT_SECONDS:-420}"
TMP_DIR="$(mktemp -d)"
EVIDENCE_DIR="${EVIDENCE_DIR:-$ROOT_DIR/tmp-payment-evidence}"
EVIDENCE_FILE="$EVIDENCE_DIR/payment-e2e-$(date -u +%Y%m%dT%H%M%SZ).log"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$EVIDENCE_DIR"

curl_common=(-sS -k)
if [[ "${LOCAL_RESOLVE:-true}" == "true" ]]; then
  curl_common+=(--resolve "${STORE_BASE_DOMAIN}:${HTTPS_PORT}:127.0.0.1")
  curl_common+=(--resolve "${STORE_HOST}:${HTTPS_PORT}:127.0.0.1")
fi

log() {
  echo "$*" | tee -a "$EVIDENCE_FILE"
}

fail() {
  log "[payment-smoke] $*"
  exit 1
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "${name} is required for real payment validation"
  fi
}

assert_public_https_url() {
  local url="$1"
  python3 - "$url" <<'PY'
import ipaddress
import sys
from urllib.parse import urlparse

url = sys.argv[1]
parsed = urlparse(url)
host = (parsed.hostname or "").lower()
if parsed.scheme != "https" or not host:
    sys.exit(1)
if host in {"localhost", "0.0.0.0"} or host.endswith(".localhost") or host.endswith(".local"):
    sys.exit(1)
if "127.0.0.1" in host or host.endswith(".127.0.0.1.sslip.io") or host.endswith(".127.0.0.1.nip.io"):
    sys.exit(1)
try:
    ip = ipaddress.ip_address(host)
except ValueError:
    sys.exit(0)
if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_unspecified:
    sys.exit(1)
PY
}

assert_api_container_has_real_payment_env() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  local stack_file="${STACK_FILE:-$ROOT_DIR/docker-compose.staging.yml}"
  if ! docker compose -f "$stack_file" ps api --status running --format '{{.Name}}' >/dev/null 2>&1; then
    return 0
  fi
  local api_env
  api_env="$(docker compose -f "$stack_file" exec -T api sh -c '
    if [ -n "$MP_ACCESS_TOKEN" ]; then echo "token=set"; else echo "token=empty"; fi
    printf "public_base_url=%s\n" "$MP_PUBLIC_BASE_URL"
  ')"
  if ! grep -qx 'token=set' <<<"$api_env"; then
    fail "running API container does not have MP_ACCESS_TOKEN; restart staging with the sandbox token before running real payment smoke"
  fi
  local api_public_base_url
  api_public_base_url="$(awk -F= '/^public_base_url=/ {print $2}' <<<"$api_env")"
  if [[ "$api_public_base_url" != "$MP_PUBLIC_BASE_URL" ]]; then
    fail "running API container MP_PUBLIC_BASE_URL does not match script MP_PUBLIC_BASE_URL"
  fi
}

request_json() {
  local method="$1"
  local url="$2"
  local output="$3"
  shift 3
  curl "${curl_common[@]}" -D "${output}.headers" -o "$output" -w '%{http_code}' -X "$method" "$url" "$@"
}

request_mp_api() {
  local url="$1"
  local output="$2"
  curl -sS -D "${output}.headers" -o "$output" -w '%{http_code}' \
    -H "Authorization: Bearer ${MP_ACCESS_TOKEN}" \
    -H "Accept: application/json" \
    "$url"
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

extract_request_id() {
  local headers="$1"
  tr -d '\r' < "$headers" | awk 'BEGIN{IGNORECASE=1} /^x-request-id:/ {sub(/^[^:]+: */,""); print; exit}'
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local context="$3"
  if [[ "$actual" != "$expected" ]]; then
    [[ -f "$TMP_DIR/${context}.json" ]] && cat "$TMP_DIR/${context}.json" >> "$EVIDENCE_FILE" || true
    fail "${context} failed: expected ${expected}, got ${actual}"
  fi
}

require_env MP_ACCESS_TOKEN
require_env MP_PUBLIC_BASE_URL

if [[ "${MP_STUB_ENABLED:-false}" == "true" ]]; then
  fail "MP_STUB_ENABLED=true; refusing to run real payment smoke against a stub"
fi

assert_public_https_url "$MP_PUBLIC_BASE_URL" \
  || fail "MP_PUBLIC_BASE_URL must be a public HTTPS URL reachable by Mercado Pago webhooks, not localhost/private/self-signed staging"
assert_api_container_has_real_payment_env

log "[payment-smoke] evidence_file=${EVIDENCE_FILE}"
log "[payment-smoke] base_url=${BASE_URL}"
log "[payment-smoke] store_host=${STORE_HOST}"
log "[payment-smoke] mp_public_base_url=${MP_PUBLIC_BASE_URL}"

log "[payment-smoke] creating store order"
checkout_status="$(request_json POST "${BASE_URL}/api/store/checkout" "$TMP_DIR/checkout.json" \
  -H "Host: ${STORE_HOST}" \
  -H 'Content-Type: application/json' \
  --data "{\"items\":[{\"productId\":\"31111111-1111-1111-1111-111111111111\",\"qty\":1}],\"shipping\":{\"postalCode\":\"1900\"},\"buyerEmail\":\"${BUYER_EMAIL}\"}")"
assert_status "$checkout_status" "201" "checkout"
checkout_request_id="$(extract_request_id "$TMP_DIR/checkout.json.headers")"
order_id="$(json_get "$TMP_DIR/checkout.json" "orderId")"
order_status="$(json_get "$TMP_DIR/checkout.json" "status")"
log "[payment-smoke] order_created request_id=${checkout_request_id:-none} order_id=${order_id} status=${order_status}"

return_url="${STORE_BASE_URL}/store/orders/${order_id}"
log "[payment-smoke] initiating real provider checkout"
payment_status="$(request_json POST "${BASE_URL}/api/store/payments/initiate" "$TMP_DIR/payment-initiate.json" \
  -H "Host: ${STORE_HOST}" \
  -H 'Content-Type: application/json' \
  --data "{\"orderId\":\"${order_id}\",\"provider\":\"${PAYMENT_PROVIDER}\",\"returnUrl\":\"${return_url}\"}")"
assert_status "$payment_status" "200" "payment-initiate"
payment_request_id="$(extract_request_id "$TMP_DIR/payment-initiate.json.headers")"
intent_id="$(json_get "$TMP_DIR/payment-initiate.json" "intentId")"
provider_preference_id="$(json_get "$TMP_DIR/payment-initiate.json" "providerPreferenceId")"
checkout_url="$(json_get "$TMP_DIR/payment-initiate.json" "checkoutUrl")"
log "[payment-smoke] payment_intent request_id=${payment_request_id:-none} intent_id=${intent_id} provider_preference_id=${provider_preference_id}"
log "[payment-smoke] checkout_url=${checkout_url}"

if [[ "$checkout_url" == *"mercadopago.example"* ]]; then
  fail "checkoutUrl is the example stub URL, not a real Mercado Pago redirect"
fi

if [[ "$checkout_url" != https://*mercadopago* ]]; then
  fail "checkoutUrl does not look like a Mercado Pago HTTPS checkout URL: ${checkout_url}"
fi

log "[payment-smoke] validating provider preference contract"
preference_status="$(request_mp_api "https://api.mercadopago.com/checkout/preferences/${provider_preference_id}" "$TMP_DIR/provider-preference.json")"
assert_status "$preference_status" "200" "provider-preference"
python3 - "$TMP_DIR/provider-preference.json" "$order_id" "$return_url" "$MP_PUBLIC_BASE_URL" <<'PY' || fail "provider preference did not match expected external_reference/back_urls/notification_url"
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    preference = json.load(fh)

order_id = sys.argv[2]
return_url = sys.argv[3]
public_base_url = sys.argv[4].rstrip("/")
expected_notification_url = public_base_url + "/api/webhooks/mercadopago?source_news=webhooks"
expected_external_reference = "STORE:" + order_id
back_urls = preference.get("back_urls") or {}

checks = [
    preference.get("external_reference") == expected_external_reference,
    back_urls.get("success") == return_url,
    back_urls.get("pending") == return_url,
    back_urls.get("failure") == return_url,
    preference.get("notification_url") == expected_notification_url,
]
if not all(checks):
    print(json.dumps({
        "external_reference": preference.get("external_reference"),
        "back_urls": back_urls,
        "notification_url": preference.get("notification_url"),
        "expected_external_reference": expected_external_reference,
        "expected_return_url": return_url,
        "expected_notification_url": expected_notification_url,
    }, indent=2), file=sys.stderr)
    sys.exit(1)
PY
log "[payment-smoke] provider_preference_contract external_reference=STORE:${order_id} back_urls=ok notification_url=ok"

log "[payment-smoke] duplicate initiation must reuse the pending intent"
payment_status_2="$(request_json POST "${BASE_URL}/api/store/payments/initiate" "$TMP_DIR/payment-initiate-2.json" \
  -H "Host: ${STORE_HOST}" \
  -H 'Content-Type: application/json' \
  --data "{\"orderId\":\"${order_id}\",\"provider\":\"${PAYMENT_PROVIDER}\",\"returnUrl\":\"${return_url}\"}")"
assert_status "$payment_status_2" "200" "payment-initiate-2"
intent_id_2="$(json_get "$TMP_DIR/payment-initiate-2.json" "intentId")"
provider_preference_id_2="$(json_get "$TMP_DIR/payment-initiate-2.json" "providerPreferenceId")"
if [[ "$intent_id" != "$intent_id_2" || "$provider_preference_id" != "$provider_preference_id_2" ]]; then
  fail "duplicate initiation created a different payment intent (${intent_id_2}/${provider_preference_id_2})"
fi
log "[payment-smoke] idempotent_initiation intent_id=${intent_id_2} provider_preference_id=${provider_preference_id_2}"

log "[payment-smoke] open this real checkout URL and complete/cancel/reject according to the scenario:"
log "$checkout_url"

if [[ "$WAIT_FOR_WEBHOOK" != "true" ]]; then
  log "[payment-smoke] WAIT_FOR_WEBHOOK=false; stopping after real redirect evidence"
  exit 0
fi

log "[payment-smoke] waiting up to ${WEBHOOK_TIMEOUT_SECONDS}s for webhook/provider callback to update order"
started_at="$(date +%s)"
while true; do
  status="$(request_json GET "${BASE_URL}/api/store/orders/${order_id}" "$TMP_DIR/order-detail.json" -H "Host: ${STORE_HOST}")"
  assert_status "$status" "200" "order-detail"
  current_status="$(json_get "$TMP_DIR/order-detail.json" "status")"
  payment_present="$(python3 - "$TMP_DIR/order-detail.json" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)
print("true" if data.get("payment") else "false")
PY
)"
  elapsed="$(( $(date +%s) - started_at ))"
  log "[payment-smoke] poll elapsed=${elapsed}s order_status=${current_status} payment_present=${payment_present}"

  if [[ "$current_status" == "PAID" && "$payment_present" == "true" ]]; then
    provider_payment_id="$(json_get "$TMP_DIR/order-detail.json" "payment.providerPaymentId")"
    payment_provider="$(json_get "$TMP_DIR/order-detail.json" "payment.provider")"
    confirmed_at="$(json_get "$TMP_DIR/order-detail.json" "payment.confirmedAt")"
    log "[payment-smoke] payment_confirmed order_id=${order_id} provider=${payment_provider} provider_payment_id=${provider_payment_id} confirmed_at=${confirmed_at}"
    log "[payment-smoke] real payment E2E passed"
    exit 0
  fi

  if (( elapsed >= WEBHOOK_TIMEOUT_SECONDS )); then
    fail "webhook/provider callback did not confirm payment before timeout; order_id=${order_id} intent_id=${intent_id} provider_preference_id=${provider_preference_id}"
  fi

  sleep 5
done
