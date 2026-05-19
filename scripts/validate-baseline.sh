#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-fast}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_frontend_fast() {
  echo "[baseline] frontend: architecture + baseline tests"
  (
    cd "$ROOT_DIR/frontend"
    npm run validate:baseline
  )
}

run_frontend_full() {
  echo "[baseline] frontend: serial checks + build + ecosystem/routing tests"
  (
    "$ROOT_DIR/scripts/validate-frontend-serial.sh"
  )
}

run_backend_fast() {
  echo "[baseline] backend: unit tests"
  (
    cd "$ROOT_DIR/backend"
    ./gradlew baselineCheck
  )
}

run_backend_full() {
  echo "[baseline] backend: unit + integration tests"
  (
    cd "$ROOT_DIR/backend"
    ./gradlew baselineVerify
  )
}

case "$MODE" in
  fast)
    run_frontend_fast
    run_backend_fast
    ;;
  full)
    run_frontend_full
    run_backend_full
    ;;
  *)
    echo "Usage: scripts/validate-baseline.sh [fast|full]" >&2
    exit 1
    ;;
esac

echo "[baseline] ${MODE} validation completed"
