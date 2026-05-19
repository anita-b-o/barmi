# Observability Runbook

## Objetivo

Runbook operativo para la beta pública controlada de Barmi.

Cobertura:

- correlación FE↔BE por `requestId`
- Sentry frontend
- categorías backend
- checkout, auth, webhooks y rate limit fail-open

## Guardrails del smoke

- La ruta frontend `__observability` sólo debe existir con `VITE_OBSERVABILITY_SMOKE_ENABLED=true`.
- El endpoint backend `/api/admin/dev/observability/error` sólo debe existir con `APP_OBSERVABILITY_SMOKE_ENABLED=true`.
- Ambos flags deben quedar `false` en prod.
- El endpoint backend es `GET` y sólo acepta `status` de error controlado; no ejecuta payloads arbitrarios ni devuelve secrets.

## Dónde encontrar `requestId`

Frontend:

- Network tab del browser: header/response `X-Request-Id`
- eventos de Sentry: tag `request_id`
- eventos locales de observabilidad: `payload.requestId`

Backend:

- header `X-Request-Id` en todas las responses
- body de error: `error.requestId`
- logs backend: `request_id=...` y MDC `[request:...]`

## Cómo correlacionar FE↔BE

1. Abrir el evento frontend en Sentry.
2. Copiar el tag `request_id`.
3. Buscar ese valor en logs backend.
4. Confirmar endpoint, categoría, status y contexto (`store_id`, `order_id`, `ecosystem_id`, `provider`).

Si el error fue puro render crash, puede no existir `requestId`. En ese caso correlacionar por:

- `release_id`
- route
- timestamp
- browser/user agent

## Interpretación de categorías backend

- `api_error_db_unavailable`: falla de DB o acceso persistente.
- `api_error_redis_unavailable`: Redis/rate limit/replay guard no disponible.
- `api_error_vendor_timeout`: proveedor externo no respondió o devolvió checkout inválido.
- `api_error_invalid_request`: input inválido, conflicto de estado o request mal formado.
- `api_error_internal_bug`: excepción no categorizada del backend.
- `api_error_auth_failure`: token expirado, firma inválida, usuario inexistente/inactivo, forbidden.
- `api_error_checkout_failure`: fallas de checkout o confirmación de pago relacionadas a orden/stock/mismatch.
- `api_error_webhook_failure`: invalid signature, replay, timeout, payload inválido, conflicto de webhook.
- `rate_limit_exceeded`: request bloqueada por rate limiting.

## Debug de checkout

Buscar en logs por:

- `checkout_created`
- `checkout_failure`
- `payment_initiation_created`
- `payment_confirmed`
- `payment_confirm_noop_race`

Campos clave:

- `request_id`
- `store_id` o `ecosystem_id`
- `order_id`
- `provider`
- `failure_reason`

Casos típicos:

- `stock_conflict`: la orden o confirmación chocó con stock disponible.
- `payment_mismatch`: monto/moneda confirmados no coinciden con la orden.
- `payment_provider_unavailable`: falla del vendor al iniciar checkout.

## Auth abuse y auth failures

Buscar en logs por:

- `auth_failure`
- `api_error category=api_error_auth_failure`
- `rate_limited ... auth_`

Diferenciación:

- `token_expired`
- `invalid_signature`
- `malformed_token`
- `invalid_token`
- `user_not_found`
- `user_inactive`
- `forbidden`

Indicadores de abuso/flood:

- repetición de `rate_limited` sobre `auth_login_*`, `auth_refresh_*`
- picos en `barmi_auth_failures_total`
- secuencias de `rate_limit_exceeded` con la misma ruta

## Webhooks

Buscar en logs por:

- `webhook_accepted`
- `webhook_rejected`
- `rate_limit_backend_unavailable limiter=webhook_replay_guard`

Campos clave:

- `provider`
- `event_id`
- `operation_id`
- `provider_payment_id`
- `request_id`
- `retry_count`
- `reason`

Alertas operativas:

- `reason=invalid_signature`
- `reason=replay`
- `reason=timeout`
- `missing_*`

## Rate limit fail-open

Buscar en logs por:

- `rate_limit_backend_unavailable`
- `rate_limit_backend_recovered`
- `rate_limited`

Métricas clave:

- `barmi_rate_limit_backend_unavailable_total`
- `barmi_rate_limit_backend_recovered_total`
- `barmi_rate_limit_fail_open_requests_total`
- `barmi_rate_limited_total`

Interpretación:

- `backend_unavailable`: Redis cayó y el sistema quedó en fail-open.
- `backend_recovered`: Redis volvió y el rate limit volvió a modo normal.
- `fail_open_requests_total`: requests permitidas durante degradación.

## Checklist de incidente

1. Confirmar `release_id`, ambiente y timestamp.
2. Buscar `requestId` en frontend y backend.
3. Identificar categoría backend.
4. Revisar si hubo `rate_limit_backend_unavailable`.
5. Si fue checkout, identificar `store_id/order_id/provider/failure_reason`.
6. Si fue auth, confirmar si es expiración normal o abuso.
7. Si fue webhook, validar `provider_payment_id`, `event_id`, `retry_count`.
8. Confirmar si el issue está deminificado en Sentry.
9. Si el stack trace está minificado, revisar upload de sourcemaps del release.
