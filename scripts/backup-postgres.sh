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
    echo "[backup] missing required variable: $name" >&2
    exit 1
  fi
}

sanitize_fragment() {
  printf '%s' "$1" | tr -cs 'A-Za-z0-9._-' '-'
}

COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.staging.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
DB_NAME="${DB_NAME:-}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
APP_VERSION="${APP_VERSION:-unknown}"
APP_COMMIT_SHA="${APP_COMMIT_SHA:-unknown}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

require_var DB_NAME
require_var DB_USER
require_var DB_PASSWORD

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "[backup] compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if ! docker compose -f "$COMPOSE_FILE" ps --services --status running | rg -qx "$POSTGRES_SERVICE"; then
  echo "[backup] postgres service is not running: $POSTGRES_SERVICE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

version_fragment="$(sanitize_fragment "$APP_VERSION")"
commit_fragment="$(sanitize_fragment "$APP_COMMIT_SHA")"
dump_path="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}_${version_fragment}_${commit_fragment}.dump"
meta_path="${dump_path}.meta"

echo "[backup] writing dump to $dump_path"
docker compose -f "$COMPOSE_FILE" exec -T \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$POSTGRES_SERVICE" \
  pg_dump \
    --username "$DB_USER" \
    --dbname "$DB_NAME" \
    --format=custom \
    --no-owner \
    --no-privileges > "$dump_path"

if [[ ! -s "$dump_path" ]]; then
  echo "[backup] dump file is empty: $dump_path" >&2
  rm -f "$dump_path"
  exit 1
fi

size_bytes="$(wc -c < "$dump_path" | tr -d ' ')"
checksum="$(sha256sum "$dump_path" | awk '{print $1}')"

cat > "$meta_path" <<EOF
created_at_utc=$TIMESTAMP
db_name=$DB_NAME
db_user=$DB_USER
compose_file=$COMPOSE_FILE
postgres_service=$POSTGRES_SERVICE
app_version=$APP_VERSION
app_commit_sha=$APP_COMMIT_SHA
size_bytes=$size_bytes
sha256=$checksum
EOF

echo "[backup] dump ready"
echo "[backup] file=$dump_path"
echo "[backup] sha256=$checksum"
echo "[backup] meta=$meta_path"
