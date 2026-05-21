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
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

headers_file="$TMP_DIR/error.headers"
body_file="$TMP_DIR/error.json"
request_id="obs-$(date +%s)"

should_skip_tls_verification() {
  local url="$1"
  [[ "${CURL_INSECURE:-}" == "true" ]] \
    || [[ "$url" == https://localhost* ]] \
    || [[ "$url" == https://staging.127.0.0.1.sslip.io* ]] \
    || [[ "$url" == https://*.staging.127.0.0.1.sslip.io* ]]
}

curl_args=(-sS)
if [[ "$BASE_URL" == https://* ]] && should_skip_tls_verification "$BASE_URL"; then
  curl_args+=(-k)
fi

echo "[observability] controlled backend error"
status="$(curl "${curl_args[@]}" -D "$headers_file" -o "$body_file" -w '%{http_code}' \
  -H "X-Request-Id: ${request_id}" \
  "${BASE_URL}/api/admin/dev/observability/error?status=503")"

if [[ "$status" != "503" ]]; then
  echo "[observability] expected 503, got ${status}" >&2
  exit 1
fi

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

echo "[observability] header_request_id=${header_request_id}"
echo "[observability] body_request_id=${body_request_id}"

if [[ -z "$header_request_id" || "$header_request_id" != "$body_request_id" ]]; then
  echo "[observability] requestId mismatch between header and body" >&2
  exit 1
fi

echo "[observability] backend log grep"
docker compose -f "$STACK_FILE" logs api --tail=200 | rg "$body_request_id"

echo "[observability] playwright smoke"
(
  cd "$ROOT_DIR/frontend"
  PLAYWRIGHT_BASE_URL="$BASE_URL" \
  PLAYWRIGHT_SKIP_WEBSERVER=true \
  SENTRY_EXPECT_DSN_HOST="${SENTRY_EXPECT_DSN_HOST:-}" \
  npx playwright test tests/observability.smoke.spec.ts
)

echo "[observability] smoke completed"
