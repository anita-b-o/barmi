#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

STORE_BASE_DOMAIN="${STORE_BASE_DOMAIN:-staging.127.0.0.1.sslip.io}"
PUBLIC_STORE_HOST="${VITE_PUBLIC_STORE_HOST:-demo-store.${STORE_BASE_DOMAIN}}"
CERT_DIR="$ROOT_DIR/infra/nginx/certs"
KEY_FILE="$CERT_DIR/staging.key"
CRT_FILE="$CERT_DIR/staging.crt"
CFG_FILE="$CERT_DIR/openssl-staging.cnf"

mkdir -p "$CERT_DIR"

cat >"$CFG_FILE" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = ${STORE_BASE_DOMAIN}

[v3_req]
subjectAltName = @alt_names
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = ${STORE_BASE_DOMAIN}
DNS.2 = *.${STORE_BASE_DOMAIN}
DNS.3 = ${PUBLIC_STORE_HOST}
DNS.4 = admin.${STORE_BASE_DOMAIN}
DNS.5 = casa-roja.${STORE_BASE_DOMAIN}
DNS.6 = mercado-centro.${STORE_BASE_DOMAIN}
EOF

openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CRT_FILE" \
  -config "$CFG_FILE" >/dev/null 2>&1

echo "[tls] generated self-signed staging certificate at $CRT_FILE"
