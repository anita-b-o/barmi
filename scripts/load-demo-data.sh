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

PGPASSWORD="${DB_PASSWORD}" psql \
  --host "${DB_HOST}" \
  --port "${DB_PORT}" \
  --username "${DB_USER}" \
  --dbname "${DB_NAME}" \
  --set ON_ERROR_STOP=1 \
  --file "${ROOT_DIR}/scripts/demo-data.sql"

echo
echo "Demo data loaded."
echo "Store slug: demo-store"
echo "Ecosystem slug: demo-ecosystem"
echo "Admin login: admin@example.com / secret"
