#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-${STAGING_DB_PORT:-5435}}"
DB_NAME="${DB_NAME:-barmi}"
DB_USER="${DB_USER:-barmi}"
DB_PASSWORD="${DB_PASSWORD:-change-me-strong-db-pass}"

echo "Loading demo data into postgres://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

if command -v psql >/dev/null 2>&1; then
  PGPASSWORD="${DB_PASSWORD}" psql \
    --host "${DB_HOST}" \
    --port "${DB_PORT}" \
    --username "${DB_USER}" \
    --dbname "${DB_NAME}" \
    --set ON_ERROR_STOP=1 \
    --file "${ROOT_DIR}/scripts/demo-data.sql"
elif command -v docker >/dev/null 2>&1; then
  STACK_FILE="${STACK_FILE:-$ROOT_DIR/docker-compose.staging.yml}"
  docker compose -f "$STACK_FILE" exec -T postgres psql \
    --username "${DB_USER}" \
    --dbname "${DB_NAME}" \
    --set ON_ERROR_STOP=1 \
    < "${ROOT_DIR}/scripts/demo-data.sql"
else
  echo "psql is not installed and docker is not available; cannot load demo data" >&2
  exit 1
fi

echo
echo "Demo data loaded."
echo "Store slug: demo-store"
echo "Ecosystem slug: demo-ecosystem"
echo "Admin login: admin@example.com / secret"
