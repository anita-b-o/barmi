#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-staging}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  while IFS='=' read -r key raw_value; do
    [[ -z "${key}" || "${key}" == \#* ]] && continue
    if [[ -z "${!key:-}" ]]; then
      value="${raw_value%$'\r'}"
      export "$key=$value"
    fi
  done < "$ROOT_DIR/.env"
fi

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[env] missing required variable: $name" >&2
    exit 1
  fi
}

first_present_var() {
  for name in "$@"; do
    if [[ -n "${!name:-}" ]]; then
      printf '%s' "$name"
      return 0
    fi
  done
  return 1
}

reject_default() {
  local name="$1"
  local disallowed="$2"
  local value="${!name:-}"
  if [[ "$value" == "$disallowed" ]]; then
    echo "[env] unsafe default for $name: $value" >&2
    exit 1
  fi
}

is_loopback_bind_address() {
  local value="${1:-127.0.0.1}"
  [[ "$value" == "127.0.0.1" || "$value" == "localhost" || "$value" == "::1" ]]
}

require_explicit_origin_list() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[env] missing required variable: $name" >&2
    exit 1
  fi
  IFS=',' read -ra origins <<< "$value"
  if [[ "${#origins[@]}" -eq 0 ]]; then
    echo "[env] $name must contain at least one origin" >&2
    exit 1
  fi
  for origin in "${origins[@]}"; do
    origin="${origin#"${origin%%[![:space:]]*}"}"
    origin="${origin%"${origin##*[![:space:]]}"}"
    if [[ ! "$origin" =~ ^https?://[^[:space:]]+$ ]]; then
      echo "[env] invalid origin in $name: $origin" >&2
      exit 1
    fi
  done
}

require_contains_fragment() {
  local name="$1"
  local fragment="$2"
  local hint="$3"
  local value="${!name:-}"
  if [[ "$value" != *"$fragment"* ]]; then
    echo "[env] $name must include $hint" >&2
    exit 1
  fi
}

reject_contains_fragment() {
  local name="$1"
  local fragment="$2"
  local mode="$3"
  local value="${!name:-}"
  if [[ "$value" == *"$fragment"* ]]; then
    echo "[env] $name contains forbidden fragment '$fragment' in $mode" >&2
    exit 1
  fi
}

is_placeholder_alert_webhook_url() {
  local value="${1:-}"
  [[ -z "$value" \
    || "$value" == "http://127.0.0.1:9/barmi-alerts-placeholder" \
    || "$value" == "http://localhost:9/barmi-alerts-placeholder" \
    || "$value" == *"barmi-alerts-placeholder"* ]]
}

is_loopback_url() {
  local value="${1:-}"
  [[ "$value" =~ ^https?://(localhost|127\.0\.0\.1|\[::1\])([/:]|$) ]]
}

require_real_alert_webhook() {
  local value="${GRAFANA_ALERT_WEBHOOK_URL:-}"
  require_var GRAFANA_ALERT_WEBHOOK_URL
  if [[ ! "$value" =~ ^https?://[^[:space:]]+$ ]]; then
    echo "[env] GRAFANA_ALERT_WEBHOOK_URL must be an http(s) URL" >&2
    exit 1
  fi
  if is_placeholder_alert_webhook_url "$value" || is_loopback_url "$value"; then
    echo "[env] GRAFANA_ALERT_WEBHOOK_URL must be a real non-loopback webhook when OBSERVABILITY_REQUIRE_ALERTS=true" >&2
    exit 1
  fi
}

warn_if_alert_webhook_placeholder() {
  local value="${GRAFANA_ALERT_WEBHOOK_URL:-}"
  if is_placeholder_alert_webhook_url "$value"; then
    echo "[env] warning: Grafana alerts will use the local placeholder webhook; set GRAFANA_ALERT_WEBHOOK_URL and OBSERVABILITY_REQUIRE_ALERTS=true for beta notifications" >&2
  fi
}

validate_notification_email_env() {
  local mode="${NOTIFICATION_EMAIL_MODE:-logging}"
  mode="${mode,,}"
  if [[ "$mode" != "logging" && "$mode" != "smtp" ]]; then
    echo "[env] NOTIFICATION_EMAIL_MODE must be logging or smtp" >&2
    exit 1
  fi
  if [[ "$mode" != "smtp" ]]; then
    return 0
  fi

  require_var NOTIFICATION_EMAIL_FROM
  require_var SPRING_MAIL_HOST
  require_var SPRING_MAIL_PORT
  require_var SPRING_MAIL_USERNAME
  require_var SPRING_MAIL_PASSWORD
  if [[ ! "$SPRING_MAIL_PORT" =~ ^[0-9]+$ || "$SPRING_MAIL_PORT" -le 0 ]]; then
    echo "[env] SPRING_MAIL_PORT must be a positive integer when NOTIFICATION_EMAIL_MODE=smtp" >&2
    exit 1
  fi
}

require_host_under_domain() {
  local host_name="$1"
  local domain_name="$2"
  local host_value="${!host_name:-}"
  local domain_value="${!domain_name:-}"
  if [[ "$host_value" != *".${domain_value}" ]]; then
    echo "[env] ${host_name} must be a subdomain of ${domain_value}" >&2
    exit 1
  fi
}

case "$MODE" in
  local)
    require_var DB_NAME
    require_var DB_USER
    require_var DB_PASSWORD
    cors_var_name="$(first_present_var BACKEND_CORS_ALLOWED_ORIGINS ALLOWED_ORIGINS || true)"
    if [[ -n "${cors_var_name:-}" ]]; then
      require_explicit_origin_list "$cors_var_name"
    fi
    ;;
  staging)
    require_var DB_NAME
    require_var DB_USER
    require_var DB_PASSWORD
    require_var JWT_SECRET
    require_var MP_WEBHOOK_SECRET
    cors_var_name="$(first_present_var BACKEND_CORS_ALLOWED_ORIGINS ALLOWED_ORIGINS)"
    require_var STORE_BASE_DOMAIN
    require_var VITE_PUBLIC_STORE_HOST
    require_var VITE_PUBLIC_ECOSYSTEM_SLUG
    require_var STORE_PUBLIC_SCHEME
    reject_default JWT_SECRET "example-jwt-secret-change-this-to-a-strong-random-value-32-bytes-min"
    reject_default MP_WEBHOOK_SECRET "example-mp-webhook-secret-change-this-to-a-strong-random-value-32-bytes-min"
    reject_default STORE_BASE_DOMAIN "example.com"
    require_explicit_origin_list "$cors_var_name"
    if [[ "${!cors_var_name}" == "http://localhost:5173,http://127.0.0.1:5173" ]]; then
      echo "[env] ${cors_var_name} still uses dev frontend defaults in staging" >&2
      exit 1
    fi
    if [[ "${STORE_PUBLIC_SCHEME}" != "http" && "${STORE_PUBLIC_SCHEME}" != "https" ]]; then
      echo "[env] STORE_PUBLIC_SCHEME must be http or https in staging" >&2
      exit 1
    fi
    if [[ "${STORE_PUBLIC_SCHEME}" == "http" ]]; then
      if [[ "${!cors_var_name}" != *"localhost"* && "${!cors_var_name}" != *"127.0.0.1"* && "${!cors_var_name}" != *".local"* ]]; then
        echo "[env] ${cors_var_name} must include localhost, 127.0.0.1 or a .local staging domain when STORE_PUBLIC_SCHEME=http" >&2
        exit 1
      fi
    else
      if [[ "${REFRESH_COOKIE_SECURE:-false}" != "true" ]]; then
        echo "[env] REFRESH_COOKIE_SECURE must be true when STORE_PUBLIC_SCHEME=https in staging" >&2
        exit 1
      fi
    fi
    validate_notification_email_env
    require_host_under_domain VITE_PUBLIC_STORE_HOST STORE_BASE_DOMAIN
    if [[ "${SENTRY_UPLOAD_REQUIRED:-false}" == "true" ]]; then
      require_var VITE_APP_COMMIT_SHA
      require_var VITE_APP_BUILD_TIMESTAMP
      require_var VITE_APP_RELEASE_ID
      require_var SENTRY_AUTH_TOKEN
      require_var SENTRY_ORG
      require_var SENTRY_PROJECT
    fi
    if [[ "${VITE_OBSERVABILITY_SMOKE_ENABLED:-false}" == "true" && "${APP_OBSERVABILITY_SMOKE_ENABLED:-false}" != "true" ]]; then
      echo "[env] APP_OBSERVABILITY_SMOKE_ENABLED must be true when VITE_OBSERVABILITY_SMOKE_ENABLED=true" >&2
      exit 1
    fi
    observability_bind_address="${OBSERVABILITY_BIND_ADDRESS:-127.0.0.1}"
    if [[ "${OBSERVABILITY_REQUIRE_STRONG_GRAFANA:-false}" == "true" ]] || ! is_loopback_bind_address "$observability_bind_address"; then
      require_var GRAFANA_ADMIN_USER
      require_var GRAFANA_ADMIN_PASSWORD
      reject_default GRAFANA_ADMIN_USER "admin"
      reject_default GRAFANA_ADMIN_PASSWORD "admin"
      reject_default GRAFANA_ADMIN_USER "barmi-local-admin"
      reject_default GRAFANA_ADMIN_PASSWORD "change-me-local-observability-password"
    fi
    if [[ "${OBSERVABILITY_REQUIRE_ALERTS:-false}" == "true" ]]; then
      require_real_alert_webhook
    else
      warn_if_alert_webhook_placeholder
    fi
    ;;
  prod|production)
    require_var DB_NAME
    require_var DB_USER
    require_var DB_PASSWORD
    require_var JWT_SECRET
    require_var MP_WEBHOOK_SECRET
    cors_var_name="$(first_present_var BACKEND_CORS_ALLOWED_ORIGINS ALLOWED_ORIGINS)"
    require_var STORE_BASE_DOMAIN
    require_var VITE_PUBLIC_STORE_HOST
    require_var VITE_PUBLIC_ECOSYSTEM_SLUG
    require_var STORE_PUBLIC_SCHEME
    reject_default JWT_SECRET "example-jwt-secret-change-this-to-a-strong-random-value-32-bytes-min"
    reject_default MP_WEBHOOK_SECRET "example-mp-webhook-secret-change-this-to-a-strong-random-value-32-bytes-min"
    reject_default STORE_BASE_DOMAIN "example.com"
    require_explicit_origin_list "$cors_var_name"
    reject_contains_fragment "$cors_var_name" "localhost" "$MODE"
    reject_contains_fragment "$cors_var_name" "127.0.0.1" "$MODE"
    reject_contains_fragment "$cors_var_name" ".local" "$MODE"
    if [[ "${STORE_PUBLIC_SCHEME}" != "https" ]]; then
      echo "[env] STORE_PUBLIC_SCHEME must be https in $MODE" >&2
      exit 1
    fi
    IFS=',' read -ra origins <<< "${!cors_var_name}"
    for origin in "${origins[@]}"; do
      origin="${origin#"${origin%%[![:space:]]*}"}"
      origin="${origin%"${origin##*[![:space:]]}"}"
      if [[ "$origin" != https://* ]]; then
        echo "[env] $cors_var_name must use https origins in $MODE: $origin" >&2
        exit 1
      fi
    done
    if [[ "${REFRESH_COOKIE_SECURE:-true}" != "true" ]]; then
      echo "[env] REFRESH_COOKIE_SECURE must be true in $MODE" >&2
      exit 1
    fi
    validate_notification_email_env
    require_host_under_domain VITE_PUBLIC_STORE_HOST STORE_BASE_DOMAIN
    if [[ "${SENTRY_UPLOAD_REQUIRED:-false}" == "true" ]]; then
      require_var VITE_APP_COMMIT_SHA
      require_var VITE_APP_BUILD_TIMESTAMP
      require_var VITE_APP_RELEASE_ID
      require_var SENTRY_AUTH_TOKEN
      require_var SENTRY_ORG
      require_var SENTRY_PROJECT
    fi
    if [[ "${VITE_OBSERVABILITY_SMOKE_ENABLED:-false}" == "true" || "${APP_OBSERVABILITY_SMOKE_ENABLED:-false}" == "true" ]]; then
      echo "[env] observability smoke flags must remain disabled in $MODE" >&2
      exit 1
    fi
    if [[ "${OBSERVABILITY_REQUIRE_ALERTS:-true}" == "true" ]]; then
      require_real_alert_webhook
    fi
    ;;
  *)
    echo "Usage: scripts/validate-env.sh [local|staging|prod]" >&2
    exit 1
    ;;
esac

echo "[env] ${MODE} configuration looks valid"
