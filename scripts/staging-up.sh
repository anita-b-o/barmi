#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

"$ROOT_DIR/scripts/validate-env.sh" staging

if [[ "${STORE_PUBLIC_SCHEME:-http}" == "https" ]]; then
  "$ROOT_DIR/scripts/generate-staging-cert.sh"
fi

echo "[staging] building and starting compose stack"
docker compose -f "$ROOT_DIR/docker-compose.staging.yml" up -d --build

SCHEME="${STORE_PUBLIC_SCHEME:-http}"
PORT="${STAGING_HTTP_PORT:-8088}"
if [[ "$SCHEME" == "https" ]]; then
  PORT="${STAGING_HTTPS_PORT:-8443}"
fi

echo "[staging] waiting for readiness on ${SCHEME}://localhost:${PORT}"
for _ in $(seq 1 45); do
  CURL_ARGS=(-fsS)
  if [[ "$SCHEME" == "https" ]]; then
    CURL_ARGS+=(-k)
  fi
  if curl "${CURL_ARGS[@]}" "${SCHEME}://localhost:${PORT}/actuator/health/readiness" >/dev/null 2>&1; then
    echo "[staging] backend readiness endpoint is reachable"
    if curl "${CURL_ARGS[@]}" "${SCHEME}://localhost:${PORT}/auth/login" >/dev/null 2>&1; then
      echo "[staging] frontend is reachable"
      exit 0
    fi
  fi
  sleep 2
done

echo "[staging] stack did not become reachable in time" >&2
docker compose -f "$ROOT_DIR/docker-compose.staging.yml" ps >&2 || true
docker compose -f "$ROOT_DIR/docker-compose.staging.yml" logs api --tail=100 >&2 || true
exit 1
