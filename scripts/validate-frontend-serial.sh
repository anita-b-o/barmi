#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[frontend] serial validation: checks -> build -> full Vitest suite"
(
  cd "$ROOT_DIR/frontend"
  npm run validate:serial
)

echo "[frontend] serial validation completed"
