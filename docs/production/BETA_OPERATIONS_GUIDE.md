# BETA OPERATIONS GUIDE

## Objetivo

Operar una beta privada real con foco en:

- experiencia real de usuarios
- onboarding implícito
- métricas mínimas útiles
- errores reales
- feedback rápido
- conversión y abandono

Este documento asume el estado actual ya validado de staging, backups, restore, rollback y observability básica.

Resumen RC interno:

- `docs/production/BETA_INTERNAL_RC_SUMMARY.md`

## Deploy

1. Validar variables de staging:

```bash
./scripts/validate-env.sh staging
```

Para una beta real, definir credenciales explícitas de Grafana y activar la validación fuerte:

```bash
export GRAFANA_ADMIN_USER='replace-with-operator-user'
export GRAFANA_ADMIN_PASSWORD='replace-with-strong-password'
export OBSERVABILITY_REQUIRE_STRONG_GRAFANA=true
```

Prometheus y Grafana quedan ligados a `127.0.0.1` por defecto. Mantener ese bind y acceder por SSH/VPN; si se define `OBSERVABILITY_BIND_ADDRESS` con una interfaz no-loopback, debe estar protegido por firewall/VPN y `validate-env` rechazará credenciales locales/default.

2. Reconstruir y levantar staging:

```bash
./scripts/generate-staging-cert.sh
docker compose -f docker-compose.staging.yml up -d --build
```

3. Si hace falta recargar dataset demo:

```bash
DB_PORT=${STAGING_DB_PORT:-5435} ./scripts/load-demo-data.sh
```

## Smoke

Post deploy:

```bash
BASE_URL=http://localhost:${STAGING_HTTP_PORT:-8088} \
EXPECT_FRONTEND_RELEASE_ID=${VITE_APP_RELEASE_ID} \
EXPECT_FRONTEND_COMMIT_SHA=${VITE_APP_COMMIT_SHA} \
EXPECT_FRONTEND_BUILD_TIMESTAMP=${VITE_APP_BUILD_TIMESTAMP} \
EXPECT_FRONTEND_ENV=${VITE_APP_ENV} \
./scripts/smoke-post-deploy.sh
```

Observability técnica:

```bash
BASE_URL=http://localhost:${STAGING_HTTP_PORT:-8088} ./scripts/smoke-observability.sh
```

Smoke funcional amplio:

```bash
BASE_URL=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
STORE_HOST=${VITE_PUBLIC_STORE_HOST} \
./scripts/smoke-staging.sh
```

HTTPS/session prod-like:

```bash
./scripts/smoke-https-staging.sh
```

Hardening desde edge/proxy:

```bash
BASE_URL=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
ALLOWED_ORIGIN=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
./scripts/smoke-prod-hardening.sh
```

Transactional email smoke:

```bash
# Default beta-safe mode: no real SMTP delivery, inspect backend logs.
export NOTIFICATION_EMAIL_MODE=logging
./scripts/validate-env.sh staging
docker compose -f docker-compose.staging.yml up -d --build
BASE_URL=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
STORE_HOST=${VITE_PUBLIC_STORE_HOST} \
./scripts/smoke-staging.sh
docker compose -f docker-compose.staging.yml logs api | grep notification_email_delivery
```

SMTP sandbox smoke:

```bash
export NOTIFICATION_EMAIL_MODE=smtp
export NOTIFICATION_EMAIL_FROM='no-reply@staging.example.test'
export SPRING_MAIL_HOST='<mailbox-sandbox-host>'
export SPRING_MAIL_PORT='587'
export SPRING_MAIL_USERNAME='<mailbox-sandbox-user>'
export SPRING_MAIL_PASSWORD='<mailbox-sandbox-password>'
./scripts/validate-env.sh staging
docker compose -f docker-compose.staging.yml up -d --build
```

After triggering a paid STORE order in staging, confirm the mailbox sandbox received the buyer payment email and the store admin paid-order alert. If the same outbox event is retried, `barmi_notification_email_attempts_total{result="skipped_duplicate"}` should increase rather than sending again.

Pago real Mercado Pago:

```bash
MP_ACCESS_TOKEN=<real-or-sandbox-access-token> \
MP_PUBLIC_BASE_URL=https://<public-staging-host> \
WAIT_FOR_WEBHOOK=true \
./scripts/smoke-real-payment.sh
```

Notas:

- `STORE_PUBLIC_SCHEME=https`, `REFRESH_COOKIE_SECURE=true` y `ALLOWED_ORIGINS` con dominios HTTPS son requisito para declarar session/cookies validados.
- self-signed local sirve para navegador y CORS local; para webhook real el provider necesita un `MP_PUBLIC_BASE_URL` HTTPS público y confiable.
- el backend debe arrancar con `MP_ACCESS_TOKEN` y `MP_PUBLIC_BASE_URL`; exportarlos sólo al ejecutar el smoke no actualiza un contenedor API ya levantado.
- `smoke-https-staging.sh` usa `LOCAL_RESOLVE=true` por defecto para mapear los subdominios a `127.0.0.1` sin depender de DNS externo; usar `LOCAL_RESOLVE=false` en un host con DNS real.
- el script de pago guarda evidencia en `tmp-payment-evidence/`: `request_id`, `order_id`, `intent_id`, `provider_preference_id`, URL real de checkout, contrato de preferencia (`external_reference`, `back_urls`, `notification_url`) y polling hasta confirmación.
- transactional email is at-least-once: Barmi writes `notification_email_deliveries` after SMTP/logging delivery. A process crash after SMTP accepts a message but before the delivery row commits can duplicate that email on retry.

## Rollback

Referencia principal:

- `docs/production/RELEASE_AND_ROLLBACK.md`

Pasos operativos mínimos:

1. volver a la release anterior en compose/image tag
2. levantar stack previo
3. correr `smoke-post-deploy.sh`
4. validar `actuator/info`, release frontend y healthchecks

## Backup / Restore

Referencias:

- `docs/production/BACKUP_AND_RECOVERY.md`
- `scripts/backup-postgres.sh`
- `scripts/restore-postgres.sh`

Checklist mínimo:

1. confirmar backup reciente antes de deploy relevante
2. guardar nombre y timestamp del archivo de backup
3. validar restore sólo sobre entorno controlado

## Observability

Señales activas hoy:

- `X-Request-Id` correlacionado FE ↔ BE
- metadata de release consistente en frontend, backend y startup logs
- `smoke-observability.sh` para ruta técnica controlada
- métricas Actuator básicas
- emails transaccionales: `barmi_notification_email_attempts_total{template,result,mode}` y `barmi_notification_email_latency_seconds{template,mode}`

Consultas Prometheus útiles:

```promql
sum by (template,result,mode) (increase(barmi_notification_email_attempts_total[15m]))
sum by (template,mode) (rate(barmi_notification_email_latency_seconds_sum[15m]))
  /
sum by (template,mode) (rate(barmi_notification_email_latency_seconds_count[15m]))
increase(barmi_notification_email_attempts_total{result="failure"}[15m])
increase(barmi_notification_email_attempts_total{result="skipped_duplicate"}[15m])
```

## Beta Telemetry Light

Eventos de producto activos:

- discovery:
  - `ecosystem_home_view`
  - `catalog_view`
  - `map_view`
  - `store_view`
  - `search_used`
  - `search_no_results`
- engagement:
  - `product_click`
  - `store_click`
  - `map_pin_click`
- checkout:
  - `checkout_started`
  - `payment_initiated`
  - `checkout_success`
  - `checkout_failure`
- auth:
  - `login_success`
  - `login_failure`
  - `logout`

Restricciones:

- no guardar PII en telemetría
- no guardar tokens
- búsquedas sospechosas tipo email/teléfono/token no quedan rankeadas como top search
- las rutas se muestran sin query string ni hash para evitar exponer emails, tokens o parámetros sensibles
- cada evento incluye `requestId` si existe, `releaseId` y `environment`

Endpoints:

- `POST /api/public/beta/telemetry`
- `GET /api/admin/beta/summary`

## Métricas básicas

Disponibles en `GET /api/admin/beta/summary` y en el bloque “Beta privada: métricas mínimas” del home admin:

- home views
- catalog views
- map views
- store views
- search used
- search sin resultado
- checkout started
- checkout success
- checkout failure
- checkout abandonado estimado
- checkout success rate
- login success
- login failure
- login failure rate
- feedback enviados
- top stores vistas
- top búsquedas
- rutas con más feedback
- feedback reciente
- fallos recientes de login/checkout con route, requestId, release y reason si existe

Qué NO significan estas métricas:

- `Search sin resultado` no prueba que el catálogo esté mal; puede ser typo, filtro demasiado específico o expectativa no soportada.
- `Checkout abandonado` no es un funnel exacto; es una estimación global de starts sin success ni failure registrado.
- `Top búsquedas` no representa demanda real de mercado; sirve para detectar fricción repetida durante beta.
- `Fallos recientes` no reemplaza logs ni tracing; ayuda a encontrar rápido `requestId`, route y release para investigar.
- `Feedback reciente` puede incluir percepción del usuario, no necesariamente bug técnico.

Limitaciones:

- la telemetría es best-effort; `sendBeacon`, ad blockers, cierres de pestaña o red intermitente pueden perder eventos
- los conteos son agregados simples sobre tablas existentes, no analytics de sesión
- el abandono se calcula sin unir eventos por sesión/orden
- `reason` viene de metadata controlada y se recorta; si parece email/teléfono/token no se expone

## Feedback Flow

Flujo actual:

- botón fijo `Feedback beta`
- modal corto
- categoría
- severidad percibida
- mensaje libre

Endpoint:

- `POST /api/public/beta/feedback`

Uso esperado:

- pedir feedback cuando haya fricción, duda o copy confuso
- no pedir datos personales
- revisar feedback junto con métricas beta y errores observados

## Troubleshooting Beta

### Checkout falla

Revisar:

- stock/availability real
- shipping quote
- store context / ecosystem context
- logs de `checkout_failure`
- `X-Request-Id` del usuario y correlación en backend

### Login falla

Revisar:

- expiración de sesión
- refresh cookie / dominio actual
- `login_failure_rate`
- errores `401/403` con `requestId`

### Mapa o catálogo parecen vacíos

Revisar:

- filtros o query activos
- data demo cargada
- host/slug del ecosystem correcto
- top búsquedas y feedback recientes para entender si fue vacío real o confusión UX

### Telemetría no aparece

Revisar:

- `/api/public/beta/telemetry` responde `202`
- usuario navegó una pantalla instrumentada
- login al admin para leer `GET /api/admin/beta/summary`
- release actual corresponde al deploy esperado

### CI / test stability

Riesgo observado: la suite frontend es sensible cuando `vite build`, Vitest y otros procesos corren en paralelo en máquinas chicas.

Quick wins razonables:

- usar `cd frontend && npm run validate:frontend` como validación oficial frontend en CI/máquinas chicas
- `npm test` corre toda la suite Vitest con un solo worker y `--api.port=0`
- usar `npm run test:watch` para modo interactivo local y `npm run test:fast` sólo para corrida paralela local
- no correr `npm run build`, Vitest, Gradle y rebuilds Docker al mismo tiempo en el mismo runner chico
- si vuelve a degradar bajo carga, separar suites con fake timers/`act` (`store-payments`, tracking ecosystem, `http-client`, toasts) de suites grandes de routing/admin
- mirar primero memoria/CPU del runner antes de tocar código de producto; si hay starvation, bajar paralelismo del job es preferible a refactors grandes

### Feedback loop operativo

El admin home muestra el bloque `Beta privada: métricas mínimas`.

Usarlo como primera pantalla cuando un tester dice “no anda”:

- `Search sin resultado`: detecta queries que no dieron salida útil
- `Checkout abandonado`: estimación simple de checkout iniciado sin éxito ni fallo registrado
- `Rutas con más feedback`: dónde conviene reproducir primero
- `Fallos recientes`: login/checkout con route, reason y `requestId`
- `Feedback reciente`: mensaje, tipo, severidad, route, release y `requestId`

Flujo recomendado:

1. pedir al tester pantalla/URL y hora aproximada
2. revisar `Feedback reciente` y `Fallos recientes`
3. copiar `requestId` si existe
4. buscar ese `requestId` en logs de API/nginx/frontend
5. reproducir la ruta con el mismo flujo comprador/admin
6. corregir sólo si hay bug real o fricción clara

## Qué monitorear diariamente

Referencia principal:

- `docs/production/BETA_DAILY_MONITORING.md`

Checklist resumido:

1. `checkout_success_rate`
2. `login_failure_rate`
3. crecimiento de `checkout_failure`
4. top búsquedas repetidas sin conversión aparente
5. top stores vistas con feedback negativo asociado
6. feedback nuevos de tipo `bug` o `confusing`
7. health/readiness del stack
8. warning de `502` alrededor de restart de API si hubo despliegue o incidente

## Manual Real User Pass

Recorrido mínimo diario o por release:

1. abrir home ecosystem
2. buscar una tienda o producto
3. usar mapa y abrir una store
4. navegar catálogo
5. agregar producto
6. entrar a checkout
7. crear orden
8. iniciar pago
9. login/logout admin
10. repetir puntos 1-8 en mobile y desktop

## Payment Failure UX Pass

Validar por release cuando haya cambios en checkout, pagos o sesión:

1. pago cancelado desde el proveedor y vuelta al detalle
2. pago rechazado por tarjeta/test user del proveedor
3. pago pendiente o `in_process`
4. refresh del browser durante checkout externo y al volver
5. retorno con estado no esperado
6. webhook tardío: el detalle queda pendiente, hace polling y conserva botón de actualizar
7. retry sobre la misma orden pendiente no crea otro payment intent

Evidencia mínima:

- `X-Request-Id` de checkout y payment initiate
- `payment_intents.intent_id` y `provider_preference_id`
- transición de orden `PENDING_PAYMENT -> PAID`, o permanencia clara en `PENDING_PAYMENT` para cancelado/rechazado
- log `webhook_accepted` con `provider_payment_id` cuando corresponde
- captura o nota del copy mostrado al volver desde el provider

Señales a registrar:

- fricción
- copy confuso
- pasos largos
- loaders persistentes
- errores técnicos visibles
- estados vacíos sin CTA claro
- reconexión post-restart
- expiración de sesión y retorno post-login
