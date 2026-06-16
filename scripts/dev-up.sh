#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$ROOT_DIR/.env.local.example"
fi

while IFS='=' read -r key raw_value; do
  [[ -z "${key}" || "${key}" == \#* ]] && continue
  if [[ -z "${!key:-}" ]]; then
    value="${raw_value%$'\r'}"
    export "$key=$value"
  fi
done < "$ENV_FILE"

"$ROOT_DIR/scripts/validate-env.sh" local

echo "[dev] starting local stack with $ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.local.yml" up -d --build

echo "[dev] waiting for backend readiness"
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${LOCAL_BACKEND_PORT:-8080}/actuator/health/readiness" >/dev/null 2>&1; then
    echo "[dev] backend is ready"
    break
  fi
  sleep 2
done

if ! curl -fsS "http://localhost:${LOCAL_BACKEND_PORT:-8080}/actuator/health/readiness" >/dev/null 2>&1; then
  echo "[dev] backend did not become ready in time" >&2
  docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.local.yml" logs backend --tail=100 >&2 || true
  exit 1
fi

echo "[dev] waiting for frontend"
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${LOCAL_FRONTEND_PORT:-5173}" >/dev/null 2>&1; then
    echo "[dev] frontend is ready"
    echo "[dev] backend:  http://localhost:${LOCAL_BACKEND_PORT:-8080}"
    echo "[dev] frontend: http://localhost:${LOCAL_FRONTEND_PORT:-5173}"
    echo "[dev] store:    http://demo-store.localhost:${LOCAL_FRONTEND_PORT:-5173}/public/demo-store"
    exit 0
  fi
  sleep 2
done

echo "[dev] frontend did not become ready in time" >&2
docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.local.yml" logs frontend --tail=100 >&2 || true
exit 1
