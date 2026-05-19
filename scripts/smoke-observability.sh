#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:${STAGING_HTTP_PORT:-8088}}"
STACK_FILE="${STACK_FILE:-$ROOT_DIR/docker-compose.staging.yml}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

headers_file="$TMP_DIR/error.headers"
body_file="$TMP_DIR/error.json"
request_id="obs-$(date +%s)"

echo "[observability] controlled backend error"
status="$(curl -sS -D "$headers_file" -o "$body_file" -w '%{http_code}' \
  -H "X-Request-Id: ${request_id}" \
  "${BASE_URL}/api/admin/dev/observability/error?status=503")"

if [[ "$status" != "503" ]]; then
  echo "[observability] expected 503, got ${status}" >&2
  exit 1
fi

header_request_id="$(awk 'BEGIN{IGNORECASE=1} /^X-Request-Id:/ {gsub("\r",""); print $2}' "$headers_file" | tail -n1)"
body_request_id="$(python3 - "$body_file" <<'PY'
import json
import sys
with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    payload = json.load(fh)
print(payload["error"]["requestId"])
PY
)"

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
