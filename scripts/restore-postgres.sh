#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[restore] missing required variable: $name" >&2
    exit 1
  fi
}

require_db_identifier() {
  local label="$1"
  local value="$2"
  if [[ ! "$value" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "[restore] invalid ${label}: ${value}. Use only letters, digits or underscore." >&2
    exit 1
  fi
}

DUMP_PATH="${1:-${DUMP_PATH:-}}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.staging.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
TARGET_DB_NAME="${TARGET_DB_NAME:-${DB_NAME:-barmi}_restore}"
CONTAINER_DUMP_PATH="/tmp/barmi-restore-$$.dump"

require_var DB_USER
require_var DB_PASSWORD

if [[ -z "$DUMP_PATH" ]]; then
  echo "[restore] usage: scripts/restore-postgres.sh /abs/path/to/backup.dump" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "[restore] compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "[restore] dump file not found: $DUMP_PATH" >&2
  exit 1
fi

if [[ ! -s "$DUMP_PATH" ]]; then
  echo "[restore] dump file is empty: $DUMP_PATH" >&2
  exit 1
fi

require_db_identifier "TARGET_DB_NAME" "$TARGET_DB_NAME"

if ! docker compose -f "$COMPOSE_FILE" ps --services --status running | rg -qx "$POSTGRES_SERVICE"; then
  echo "[restore] postgres service is not running: $POSTGRES_SERVICE" >&2
  exit 1
fi

echo "[restore] copying dump into postgres container"
docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" sh -lc "cat > '$CONTAINER_DUMP_PATH'" < "$DUMP_PATH"

cleanup() {
  docker compose -f "$COMPOSE_FILE" exec -T "$POSTGRES_SERVICE" sh -lc "rm -f '$CONTAINER_DUMP_PATH'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[restore] recreating database $TARGET_DB_NAME"
docker compose -f "$COMPOSE_FILE" exec -T \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$POSTGRES_SERVICE" \
  psql \
    --username "$DB_USER" \
    --dbname postgres \
    --set ON_ERROR_STOP=1 \
    --command "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB_NAME}' AND pid <> pg_backend_pid();" \
    --command "DROP DATABASE IF EXISTS \"${TARGET_DB_NAME}\";" \
    --command "CREATE DATABASE \"${TARGET_DB_NAME}\" TEMPLATE template0;"

echo "[restore] restoring dump into $TARGET_DB_NAME"
docker compose -f "$COMPOSE_FILE" exec -T \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$POSTGRES_SERVICE" \
  pg_restore \
    --username "$DB_USER" \
    --dbname "$TARGET_DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    "$CONTAINER_DUMP_PATH"

echo "[restore] restore complete"
echo "[restore] target_db=$TARGET_DB_NAME"
