# Observability Runbook

## Objetivo

Runbook operativo para la beta pública controlada de Barmi.

Cobertura:

- correlación FE↔BE por `requestId`
- Sentry frontend
- Prometheus + Grafana staging/beta
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

## Sentry frontend beta

Politica beta:

- Sentry frontend se inicializa solo si `VITE_SENTRY_DSN` existe.
- `release` debe ser `VITE_APP_RELEASE_ID`.
- `environment` debe ser `VITE_APP_ENV`.
- No hay tracing global con sampling alto: `tracesSampleRate=0`.
- `sendDefaultPii=false`.
- Eventos de la ruta `/__observability` no se envian a Sentry salvo que la build tenga `VITE_SENTRY_SMOKE_ENABLED=true`.
- Sourcemaps se suben solo si existen `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT`; con `SENTRY_UPLOAD_REQUIRED=true`, faltar cualquiera de esos valores falla el build/upload.

Tags esperados en issues:

- `release_id`
- `app_env`
- `route`
- `request_id` cuando existe
- `store_slug` si se puede derivar de host o ruta publica
- `ecosystem_slug` en rutas ecosystem/admin ecosystem si `VITE_PUBLIC_ECOSYSTEM_SLUG` esta disponible

Privacidad:

- No guardar tokens ni secretos en el repo.
- No capturar `Authorization`, cookies, JWTs, refresh/access tokens ni passwords.
- Los eventos pasan por sanitizacion antes de enviarse a Sentry.
- La ruta/URL enviada se normaliza sin query string ni fragment.

Configurar Sentry beta:

1. Definir `VITE_SENTRY_DSN`.
2. Definir `VITE_APP_ENV=staging` o `production`.
3. Definir `VITE_APP_VERSION`, `VITE_APP_COMMIT_SHA`, `VITE_APP_BUILD_TIMESTAMP` y `VITE_APP_RELEASE_ID`.
4. Para sourcemaps, definir `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
5. Usar `SENTRY_UPLOAD_REQUIRED=true` en pipelines donde subir sourcemaps sea obligatorio.

Upload manual de sourcemaps:

```bash
cd frontend
npm run build
VITE_APP_RELEASE_ID="$VITE_APP_RELEASE_ID" \
SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" \
SENTRY_ORG="$SENTRY_ORG" \
SENTRY_PROJECT="$SENTRY_PROJECT" \
npm run sentry:sourcemaps:upload
```

Smoke Sentry:

- `./scripts/smoke-observability.sh` valida release/env y correlacion FE/BE.
- No envia un evento real a Sentry por defecto.
- Para prueba opt-in, construir con `VITE_SENTRY_SMOKE_ENABLED=true`, configurar `VITE_SENTRY_DSN`, y ejecutar el smoke con `EXPECT_SENTRY_EVENT=true` y `SENTRY_EXPECT_DSN_HOST=<host-del-dsn>`.
- Sin API token de Sentry, la confirmacion automatica se limita al request saliente desde el browser. Confirmar recepcion manualmente en Sentry buscando `observability_smoke_frontend_crash` por release, environment y timestamp.

Confirmar deminificacion manualmente:

1. Verificar que el build/upload uso el mismo `VITE_APP_RELEASE_ID` que la app desplegada.
2. Ejecutar el smoke opt-in de Sentry para generar `observability_smoke_frontend_crash`.
3. En Sentry, abrir el evento y confirmar `release`, `environment`, tags `release_id/app_env/route` y stack trace con archivos/componentes legibles.
4. Si el stack sigue minificado, revisar que `dist/assets/*.map` existan, que el upload haya corrido con `--validate`, y que el release en Sentry coincida exactamente con `VITE_APP_RELEASE_ID`.

Ante un issue Sentry:

1. Confirmar `release_id`, `app_env`, route y timestamp.
2. Si existe `request_id`, buscarlo en logs backend.
3. Revisar si el error coincide con un deploy reciente.
4. Confirmar si el stack trace esta deminificado; si no, revisar upload de sourcemaps del release.
5. Si el issue no tiene `request_id`, tratarlo como error frontend puro y correlacionar por route, usuario afectado si aplica, browser y release.

## Prometheus y Grafana

Staging levanta dos servicios operativos en `docker-compose.staging.yml`:

- Prometheus: `http://localhost:${STAGING_PROMETHEUS_PORT:-9090}`
- Grafana: `http://localhost:${STAGING_GRAFANA_PORT:-3000}`

Prometheus scrapea internamente `api:8080/actuator/prometheus`. El endpoint scrapeable se habilita en staging con `APP_OBSERVABILITY_PROMETHEUS_SCRAPE_ENABLED=true`, pero Nginx responde `404` para `/actuator/prometheus` desde el edge. En prod, la exposición web de actuator sigue limitada a `health`.

Prometheus y Grafana se publican sólo en loopback por defecto mediante `OBSERVABILITY_BIND_ADDRESS=127.0.0.1`. Para beta real, preferir acceso por SSH/VPN. Si se cambia el bind a una interfaz no-loopback, debe estar detrás de firewall/VPN y `scripts/validate-env.sh staging` exige credenciales explícitas de Grafana.

Grafana trae un datasource Prometheus, el dashboard `Barmi Operational MVP` y el contact point `Barmi Alerts Webhook` provisionados. No usar `admin/admin`. Para beta real, definir `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`, `OBSERVABILITY_REQUIRE_STRONG_GRAFANA=true`, `GRAFANA_ALERT_WEBHOOK_URL` y `OBSERVABILITY_REQUIRE_ALERTS=true`.

Paneles incluidos:

- API up
- request rate
- 5xx rate
- p95 latency
- auth failures
- checkout failures
- webhook failures
- payments confirmed/mismatch
- payment initiation success/failure
- payment provider requests and latency
- webhook received accepted/rejected/ignored/failure by reason
- outbox pending/failed/processing
- oldest pending outbox age
- DB pool active/pending/max
- rate limit hits
- outbox dispatch success/failure/dead letter

Queries rápidas:

- `up{job="barmi-api"}`
- `sum(rate(http_server_requests_seconds_count[5m]))`
- `sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))`
- `histogram_quantile(0.95, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))`
- `sum(increase(barmi_checkout_failures_total[15m]))`
- `sum(increase(barmi_webhook_failures_total[15m]))`
- `sum by (scope, result) (increase(barmi_payment_initiation_total[15m]))`
- `sum by (operation, result) (increase(barmi_payment_provider_requests_total[15m]))`
- `histogram_quantile(0.95, sum by (operation, le) (rate(barmi_payment_provider_latency_seconds_bucket[5m])))`
- `sum by (scope, result, reason) (increase(barmi_webhooks_received_total[15m]))`
- `barmi_outbox_failed_events`
- `barmi_outbox_oldest_pending_age_seconds`
- `hikaricp_connections_pending`

## Notificacion de alertas beta

Politica actual: todas las alertas MVP van al mismo contact point `Barmi Alerts Webhook`, sin Alertmanager y sin escalamiento externo. El objetivo de beta es tener un canal humano unico y visible, no routing complejo.

Variables:

- `GRAFANA_ALERT_WEBHOOK_URL`: webhook real. Si no se define, staging local usa `http://127.0.0.1:9/barmi-alerts-placeholder`.
- `GRAFANA_ALERT_WEBHOOK_USERNAME`: opcional, se pasa al notifier webhook de Grafana cuando el destino lo soporta.
- `GRAFANA_ALERT_WEBHOOK_TITLE`: opcional, default `Barmi staging alert`.
- `OBSERVABILITY_REQUIRE_ALERTS=true`: hace que `scripts/validate-env.sh staging` falle si el webhook falta, es placeholder o apunta a loopback. En `prod`, el default efectivo es exigirlo.

Canal recomendado para beta: un canal privado de operaciones con pocas personas responsables del deploy y soporte. Discord y Slack pueden recibir webhooks directos si aceptan el payload de Grafana o si se usa un adapter externo pequeno. Telegram normalmente requiere un adapter/bot que reciba el webhook de Grafana y llame a la Bot API. No guardar tokens ni URLs secretas en el repo; ponerlas en `.env`, secrets del host o vault del deploy.

Prueba manual sin enviar alerta real:

1. Correr `scripts/validate-env.sh staging`.
2. Levantar staging.
3. Correr `./scripts/smoke-observability.sh`; valida que el contact point cargue, pero no envia notificaciones.
4. En Grafana, revisar `Alerting -> Contact points -> Barmi Alerts Webhook`.

Prueba manual opt-in enviando al canal real:

1. Avisar en el canal de beta que se hara una prueba.
2. Ejecutar `EXPECT_ALERT_WEBHOOK=true ./scripts/smoke-observability.sh` para exigir que el contact point no apunte a placeholder/loopback. Esto no envia notificaciones.
3. En Grafana, abrir `Alerting -> Contact points -> Barmi Alerts Webhook`.
4. Usar `Test` desde la UI de Grafana.
5. Confirmar recepcion, formato y menciones.
6. No usar endpoints de error ni manipular datos productivos para probar notificaciones.

Silencio temporal:

1. En Grafana, ir a `Alerting -> Silences`.
2. Crear silence por `alertname` y, si aplica, `service=barmi-api`.
3. Usar duracion corta con motivo claro: deploy, prueba controlada o incidente ya reconocido.
4. Eliminar el silence al terminar; no dejar silences abiertos para esconder alertas recurrentes.

## Alertas MVP beta privada

Las alertas viven en `infra/prometheus/rules/barmi-alerts.yml` y se cargan desde `infra/prometheus/prometheus.yml`. Son pocas por diseno: priorizan incidentes accionables y evitan alertar por requests aislados. Grafana usa el contact point provisionado `Barmi Alerts Webhook`; en local apunta a un webhook dummy seguro y en beta debe configurarse con `GRAFANA_ALERT_WEBHOOK_URL`.

Panel rápido: el dashboard `Barmi Operational MVP` incluye `Firing Alerts`, basado en `ALERTS{alertstate="firing"}`.

| Alerta | Severidad | Threshold | Qué significa | Acción recomendada | Cuándo ignorarla |
| --- | --- | --- | --- | --- | --- |
| `BarmiApiDown` | critical | `up{job="barmi-api"} == 0` o serie ausente por 2m | Prometheus no puede scrapear el backend. Equivale a API caída, red interna rota o actuator prometheus inaccesible. | Ver `docker compose ps`, healthcheck de `api`, logs de arranque, DB/Redis, y último deploy. Confirmar `/actuator/health/readiness` desde la red interna. | Durante deploy/rebuild manual si la ventana fue anunciada y se recupera sola. |
| `BarmiHigh5xxRate` | warning | 5xx > 5% durante 5m y al menos 20 requests en 5m | Error backend sostenido, no un request suelto. | Abrir panel `5xx Rate`, revisar logs por `api_error`, correlacionar `request_id`, endpoint y release. Si coincide con deploy, considerar rollback. | Tráfico de pruebas controladas con `/api/admin/dev/observability/error`. |
| `BarmiCheckoutFailuresSpike` | warning | >= 5 failures de checkout en 15m durante 5m | Usuarios están fallando checkout por stock, validación, pricing, shipping o bug. | Buscar `checkout_failure`, revisar `code`, `store_id`, `ecosystem_id`, `order_id` y cambios recientes de catálogo/promos/envío. | Pruebas de QA que fuerzan stock/conflict conocidas. |
| `BarmiPaymentMismatch` | critical | cualquier `barmi_payments_mismatch_total` en 5m | Monto o moneda confirmada no coincide con la orden. Es incidente de integridad. | Pausar investigación de pagos afectados, identificar `order_id/provider_payment_id`, comparar orden vs payload del proveedor y revisar cambios de pricing/currency. | No ignorar salvo fixture/test explícito en ambiente aislado. |
| `BarmiWebhookFailures` | warning | >= 3 rejects/failures no-replay en 15m durante 5m | Webhooks reales están siendo rechazados o fallando sostenidamente. | Revisar `webhook_rejected`, `reason`, secret de Mercado Pago, timestamp, replay guard Redis y reachability pública de `MP_PUBLIC_BASE_URL`. | Reintentos `replay` aislados quedan excluidos; invalid signatures desde pruebas conocidas se pueden ignorar. |
| `BarmiOutboxFailed` | critical | `barmi_outbox_failed_events > 0` por 2m | Hay eventos en estado `FAILED`; notificaciones/procesos derivados pueden quedar incompletos. | Revisar logs `outbox_event_failed`, tabla `outbox_event`, `event_type`, `scope`, `aggregate_id`; corregir causa y reprocesar con cuidado si aplica. | Nunca por mucho tiempo. En staging puede ignorarse sólo si se creó manualmente un evento inválido. |
| `BarmiOutboxStuck` | warning | oldest pending > 900s durante 5m | El dispatcher no está drenando eventos o un downstream bloquea procesamiento. | Ver `barmi_outbox_pending_events`, logs del dispatcher, scheduler, DB locks y errores de email/procesadores. | Backlog esperado durante deploy corto si baja al volver la API. |
| `BarmiDbPoolPressure` | warning | `hikaricp_connections_pending > 0` durante 3m | Threads esperan conexiones DB; riesgo de latencia y timeouts. | Revisar DB saturada, queries lentas, locks, pool max y carga reciente. Cruzar con p95 y 5xx. | Picos breves durante arranque no deberían disparar por el `for`. |
| `BarmiRateLimitAbuse` | warning | >= 30 rate-limited requests en 15m durante 5m | Hay abuso/flood o cliente mal configurado pegando contra límites. | Buscar `rate_limited`, ruta/limiter, IP anonimizada y patrón. Si afecta auth/webhooks, validar si es ataque o integración mal configurada. | Pruebas de carga/rate limit planificadas. |

Validación:

- `docker compose -f docker-compose.staging.yml config`
- `docker compose -f docker-compose.staging.yml exec prometheus promtool check config /etc/prometheus/prometheus.yml`
- `CHECK_MODE=static ./scripts/smoke-observability.sh` valida sintaxis del smoke, script de sourcemaps, guard de `SENTRY_UPLOAD_REQUIRED=true` y archivos provisionados sin requerir stack.
- `./scripts/smoke-observability.sh` valida `/actuator/prometheus` interno, target `barmi-api` up, reglas Prometheus, datasource Grafana, dashboard `Barmi Operational MVP`, contact point `Barmi Alerts Webhook`, metadata de release backend/frontend y correlacion FE/BE; no envia alerta real.
- `jq empty infra/grafana/dashboards/barmi-operational-mvp.json`
- `yq '.' infra/prometheus/prometheus.yml infra/prometheus/rules/barmi-alerts.yml infra/grafana/provisioning/alerting/contactpoints.yml infra/grafana/provisioning/alerting/policies.yml`

Variables del smoke:

- `BASE_URL`: URL publica/edge del staging.
- `PROMETHEUS_URL`: URL de Prometheus. Alias compatible: `PROMETHEUS_BASE_URL`.
- `GRAFANA_URL`: URL de Grafana. Alias compatible: `GRAFANA_BASE_URL`.
- `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`: credenciales para APIs de Grafana.
- `EXPECT_SENTRY_EVENT=true`: opt-in para disparar crash frontend controlado desde `/__observability`.
- `SENTRY_EXPECT_DSN_HOST`: host esperado del DSN; si se define junto a `EXPECT_SENTRY_EVENT=true`, Playwright espera ver el request saliente.
- `EXPECT_ALERT_WEBHOOK=true`: opt-in para exigir que el contact point no sea placeholder/loopback; no envia alerta.
- `RELEASE_ID`: release esperado del frontend. Si tiene forma `version+commitSha`, tambien se compara contra `/actuator/info` del backend.
- `CHECK_MODE=static|runtime|all`: `runtime` es default; `static` equivale a no-runtime.

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
