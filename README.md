# Barmi

Barmi es una base modular para operar dos dominios separados:

- **STORE**
  - storefront público
  - checkout, pagos y tracking de órdenes
  - backoffice de órdenes, fulfillments, members, products, shipping zones y analytics MVP
- **ECOSYSTEM**
  - catálogo público, checkout, pagos y tracking de órdenes
  - backoffice de órdenes, fulfillments, products externos, shipping zones y analytics MVP

## Stack real actual

- **Backend:** Spring Boot 3 (Java 21) + Security (JWT) + JPA + Flyway
- **DB:** PostgreSQL
- **Eventos:** transactional outbox + processed events / idempotency
- **Pagos:** Mercado Pago initiation + webhook confirmation
- **Frontend:** React 18 + Vite + TypeScript + React Router + React Query
- **UI frontend:** base propia + design system del repo; MUI se usa como dependencia de soporte
- **Estado frontend:** React Query + context/local state; Zustand sigue presente sólo en partes legacy
- **Infra:** Docker Compose + Nginx reverse proxy
- **Tests:** JUnit + Testcontainers (backend), Vitest + Playwright (frontend)

## Quick start (dev)

### 1) Start infra (Postgres + Redis)
```bash
docker compose up -d postgres redis
```

### 2) Backend
```bash
cd backend
./gradlew bootRun
```

Backend URL: http://localhost:8080

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend URL: http://localhost:5173

Variables públicas de frontend:

- `VITE_API_BASE_URL`
- `VITE_PUBLIC_STORE_HOST`
- `VITE_PUBLIC_ECOSYSTEM_SLUG`
- `VITE_APP_ENV`
- `VITE_APP_VERSION`
- `VITE_APP_COMMIT_SHA`
- `VITE_APP_BUILD_TIMESTAMP`
- `VITE_APP_RELEASE_ID` opcional
- `VITE_SENTRY_DSN` opcional para capturar errores reales en Sentry
- `VITE_OBSERVABILITY_INGEST_URL` opcional para forwardear errores runtime/API a una herramienta externa

Scripts operativos principales:

- `scripts/staging-up.sh`
- `scripts/smoke-staging.sh`
- `scripts/smoke-post-deploy.sh`
- `scripts/backup-postgres.sh`
- `scripts/restore-postgres.sh`

Guía operativa de beta privada:

- `docs/production/BETA_OPERATIONS_GUIDE.md`
- `docs/production/BETA_INTERNAL_RC_SUMMARY.md`
- `docs/production/BETA_TEST_PLAN.md`
- `docs/production/BETA_DAILY_MONITORING.md`
- `docs/production/BETA_FEEDBACK_TRIAGE.md`
- `docs/production/BETA_PRIVATE_GO_NO_GO.md`

### 4) Validación mínima del baseline

Desde la raíz del repo:

```bash
./scripts/validate-baseline.sh fast
```

Validación más completa:

```bash
./scripts/validate-baseline.sh full
```

`fast` está pensada para desarrollo diario. `full` agrega build frontend e integration tests backend.

Validación frontend reproducible en serie:

```bash
cd frontend
npm run validate:frontend
```

`npm test` es el comando oficial de Vitest para CI/máquinas chicas: corre toda la suite con un solo worker y `--api.port=0`. Para desarrollo local interactivo usá `npm run test:watch`; para una corrida paralela rápida, `npm run test:fast`.

Evitá correr `npm run build`, Vitest, Gradle y rebuilds de Docker en paralelo sobre el mismo runner chico. La suite completa pasa en serie; bajo saturación, la corrida paralela puede exponer timeouts/`act(...)` overlap sin que haya un bug de producto reproducible.

### 5) Demo data local / QA manual

Para cargar una base demo repetible sobre PostgreSQL local:

```bash
./scripts/load-demo-data.sh
```

Defaults usados por el script:

- `DB_HOST=localhost`
- `DB_PORT=5434`
- `DB_NAME=barmi`
- `DB_USER=barmi`
- `DB_PASSWORD=barmi123`

Se pueden overridear por environment si tu DB local usa otros valores.

La demo no corre automáticamente en runtime ni forma parte de Flyway. Es un script explícito para desarrollo/QA manual.

Dataset demo incluido:

- STORE:
- `demo-store` con categorías, productos con stock y un producto sin stock
- promoción activa `CAFE10`
- shipping zones para quote local
- stores adicionales `casa-roja` y `mercado-centro` asociadas a `demo-ecosystem` para home/mapa público
- esas stores del ecosystem también tienen categoría pública principal para filtros reales (`cafeteria`, `panaderia`, `almacen`)
- ECOSYSTEM:
- `demo-ecosystem` con productos públicos, mezcla de `deliverySupported=true/false`
- promoción activa `URBANO15`
- shipping zones para quote
- Admin demo opcional:
- `admin@example.com / secret`
- membership `OWNER` en `demo-store`
- membership `ECOSYSTEM_ADMIN` en `demo-ecosystem`

Notas:

- El script es idempotente sobre los IDs demo versionados en `scripts/demo-data.sql`.
- No borra datos ajenos al dataset demo.
- Si ya tenés filas manuales usando esos mismos slugs/emails/IDs reservados, conviene limpiar esas filas antes de recargar.

## Estado funcional actual

### STORE público

- catálogo público por slug
- discovery MVP de catálogo con búsqueda simple, filtro de disponibles y orden básico
- categorías STORE simples con filtro público
- promociones activas visibles antes del checkout
- carrito local
- quote de shipping
- checkout STORE
- cupones/descuentos MVP en checkout STORE
- success screen post-checkout
- listado y detalle público de órdenes
- initiation de pago STORE
- tracking post-payment en detalle de orden

### STORE admin / operaciones

- dashboard básico
- analytics / reportes MVP
- orders admin + detalle
- create fulfillment desde orden pagada
- listado y detalle de fulfillments + update de estado
- members admin
- products admin
- categorías admin integradas a products
- promotions admin
- stock / disponibilidad MVP en productos STORE con descuento al confirmar pago
- shipping zones admin

### ECOSYSTEM público

- catálogo público
- discovery MVP con búsqueda simple, orden y filtro por entrega
- home pública con stores reales del ecosystem y categorías públicas destacadas
- mapa/listado público de stores con búsqueda, filtro por ubicación y filtro por categoría pública principal
- checkout con shipping quote
- success screen post-checkout
- listado y detalle de órdenes
- initiation de pago ecosystem
- tracking post-payment y journey post-checkout/post-payment

### ECOSYSTEM admin

- analytics / reportes MVP
- orders admin
- products admin alineado con backend real
- shipping zones admin alineado con backend real
- fulfillments admin con listado, detalle, creación desde órdenes pagadas y update de estado

### PLATFORM / SaaS admin

- planes SaaS persistidos con límites declarativos (`maxProducts`, `analyticsEnabled`, `seoEnabled`)
- suscripción única por store, con default `FREE` / `ACTIVE` para stores nuevas
- administración autenticada en `/admin/saas`
- endpoints backend:
- `GET /api/admin/saas/plans`
- `POST /api/admin/saas/plans`
- `PUT /api/admin/saas/plans/{planId}`
- `GET /api/admin/saas/subscriptions`
- `PATCH /api/admin/saas/subscriptions/stores/{storeId}/plan`
- no incluye cobros automáticos, subscriptions de Mercado Pago/Stripe, facturación fiscal, renovaciones automáticas, pricing público ni enforcement de límites

## Project Status -- Baseline v1

El sistema alcanzó una baseline estable (v1) para el alcance hoy soportado por backend y frontend. No significa “producto completo”: significa que los flujos incluidos abajo existen de punta a punta y tienen soporte real en código, contratos y UI administrativa.

- STORE public journeys funcionan de punta a punta.
- ECOSYSTEM public journeys funcionan de punta a punta.
- STORE admin operations son operativas.
- ECOSYSTEM admin ya incluye órdenes, fulfillments, products, shipping zones y analytics MVP.
- analytics administrativos MVP existen para STORE y ECOSYSTEM.
- payments initiation y tracking funcionan dentro del alcance actual.
- el frontend admin fue consolidado en navegación/copy y tiene una base de tests/runtime más estable.

Esta baseline prioriza flujos operativos reales y analytics administrativos simples, evitando simular capacidades de BI avanzadas que hoy no tienen soporte dedicado.

### Not included in v1

- inventario / stock profundo con reservas, movimientos o multiples depositos
- variantes, jerarquías de categorías e imágenes avanzadas de catálogo
- BI/reporting avanzado más allá de analytics summary
- exportaciones CSV/PDF
- promociones, pricing avanzado o loyalty
- rediseños amplios de UX/UI fuera del backoffice actual
- refactors grandes de arquitectura fuera del baseline operativo

## Production (single VPS)

Use `docker compose --profile prod up -d` and point your domain(s) to the VPS.
See `infra/README.md` for the Nginx reverse-proxy template.

## Staging (compose real)

Para un staging mínimo, reproducible y cercano a producción:

```bash
export JWT_SECRET='replace-with-a-real-staging-secret-32-bytes-min'
export MP_WEBHOOK_SECRET='replace-with-a-real-staging-webhook-secret'
export STORE_BASE_DOMAIN='staging.127.0.0.1.sslip.io'
export ALLOWED_ORIGINS='https://staging.127.0.0.1.sslip.io:8443,https://demo-store.staging.127.0.0.1.sslip.io:8443,https://casa-roja.staging.127.0.0.1.sslip.io:8443,https://mercado-centro.staging.127.0.0.1.sslip.io:8443,https://admin.staging.127.0.0.1.sslip.io:8443'
export STORE_PUBLIC_SCHEME='https'
export REFRESH_COOKIE_SECURE='true'
export REFRESH_COOKIE_DOMAIN='staging.127.0.0.1.sslip.io'
export REFRESH_COOKIE_SAMESITE='Lax'
export VITE_PUBLIC_STORE_HOST='demo-store.staging.127.0.0.1.sslip.io'
export VITE_PUBLIC_ECOSYSTEM_SLUG='demo-ecosystem'
export VITE_APP_ENV='staging'
export VITE_APP_VERSION='staging-local'
export STAGING_HTTP_PORT=8088
export STAGING_HTTPS_PORT=8443
export STAGING_DB_PORT=5435

./scripts/validate-env.sh staging
./scripts/generate-staging-cert.sh
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.staging.yml up --build
set -a && source .env && set +a
DB_PORT=${STAGING_DB_PORT:-5435} ./scripts/load-demo-data.sh
BASE_URL=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
STORE_HOST=${VITE_PUBLIC_STORE_HOST} \
./scripts/smoke-staging.sh
./scripts/smoke-https-staging.sh
BASE_URL=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
ALLOWED_ORIGIN=https://${STORE_BASE_DOMAIN}:${STAGING_HTTPS_PORT:-8443} \
./scripts/smoke-prod-hardening.sh

EXPECT_FRONTEND_RELEASE_ID=${VITE_APP_RELEASE_ID} \
EXPECT_FRONTEND_COMMIT_SHA=${VITE_APP_COMMIT_SHA} \
EXPECT_FRONTEND_BUILD_TIMESTAMP=${VITE_APP_BUILD_TIMESTAMP} \
EXPECT_FRONTEND_ENV=${VITE_APP_ENV} \
./scripts/smoke-post-deploy.sh
```

Esto levanta:

- `postgres`
- `redis`
- `api` Spring Boot
- `web` estático de Vite/Nginx
- `nginx` reverse proxy

El compose de staging vive en `docker-compose.staging.yml`.

Notas de staging:

- `docker-compose.staging.yml` usa `SPRING_PROFILES_ACTIVE=staging`; no debe arrancar con `prod`.
- `STORE_BASE_DOMAIN` no puede quedar en `example.com`; staging y prod exigen dominio explícito.
- `ALLOWED_ORIGINS` es la variable canónica del backend para CORS. `BACKEND_CORS_ALLOWED_ORIGINS` se acepta como alias si necesitás compatibilidad.
- staging local permite orígenes controlados de `localhost` y/o `.local`; prod los rechaza.
- `VITE_PUBLIC_STORE_HOST` debe ser un subdominio real de `STORE_BASE_DOMAIN`.
- `STORE_PUBLIC_SCHEME=https` y `REFRESH_COOKIE_SECURE=true` son obligatorios para declarar validación de sesión prod-like. `scripts/generate-staging-cert.sh` genera un certificado self-signed local de 30 días para nginx.
- el smoke test ataca el stack vía `nginx`, no directo a los contenedores internos.
- `scripts/smoke-https-staging.sh` valida rutas HTTPS reales por subdominio, CORS con credenciales, cookie `Secure`/`HttpOnly`/`SameSite`, refresh y logout. Por defecto usa `curl --resolve` hacia `127.0.0.1` para no depender de DNS externo en staging local; seteá `LOCAL_RESOLVE=false` si querés usar DNS real.
- `scripts/smoke-prod-hardening.sh` valida hardening desde el edge/proxy: actuator mínimo, admin sin auth, `413` para payload grande, CORS permitido/denegado y spoofing básico de `X-Forwarded-*`.
- Emails transaccionales en staging: con `NOTIFICATION_EMAIL_MODE=logging` el flujo se valida sin SMTP real revisando logs del backend. Para prueba SMTP real, exportar `NOTIFICATION_EMAIL_MODE=smtp`, `NOTIFICATION_EMAIL_FROM`, `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME` y `SPRING_MAIL_PASSWORD`; `./scripts/validate-env.sh staging` falla si falta alguna.
- `scripts/smoke-real-payment.sh` valida creación de orden, inicio real de Mercado Pago, contrato de preferencia, idempotencia del intent y, si `WAIT_FOR_WEBHOOK=true`, espera el webhook real hasta que la orden quede `PAID`. Para webhook real, el API debe arrancar con `MP_ACCESS_TOKEN` y `MP_PUBLIC_BASE_URL`; `MP_PUBLIC_BASE_URL` debe ser HTTPS público alcanzable por Mercado Pago, no localhost/self-signed.
- si querés probar la ruta técnica de observability, habilitá explícitamente `APP_OBSERVABILITY_SMOKE_ENABLED=true` y `VITE_OBSERVABILITY_SMOKE_ENABLED=true`; no forman parte del smoke normal de post-deploy.

## Profiles

- `local`: backend/SPA de desarrollo. Permite `localhost`, puede usar `allowDevIdentityHeader`, no exige Redis ni secretos de staging/prod.
- `staging`: ambiente técnico cercano a producción. Exige secretos no-default, dominio base explícito y CORS explícito; acepta orígenes controlados `localhost`/`.local` para levantar staging local.
- `prod`: ambiente público real. Rechaza `localhost`, `.local`, secrets default, `allowDevIdentityHeader=false` obligatorio, `STORE_PUBLIC_SCHEME=https` y `REFRESH_COOKIE_SECURE=true`.

## Observability / production readiness

Backend:

- `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`
- métricas expuestas por actuator
- `/actuator/prometheus` habilitado para scrape interno en staging cuando `APP_OBSERVABILITY_PROMETHEUS_SCRAPE_ENABLED=true`; Nginx lo bloquea desde el edge
- health indicator de backlog del outbox
- correlación por `X-Request-Id` en request/response y logs
- refresh tokens hasheados en DB y rotación con invalidación del token previo
- CORS explícito por `ALLOWED_ORIGINS`

Frontend:

- captura de runtime errors y `unhandledrejection`
- `ErrorBoundary` global con fallback simple y retry
- integración real con `@sentry/react`
- correlación FE↔BE con `X-Request-Id` propagado a eventos frontend
- release metadata (`version`, `commit`, `build timestamp`, `environment`, `release id`)
- clasificación de errores `offline` / `network_error` / HTTP
- envío opcional de eventos a `VITE_OBSERVABILITY_INGEST_URL`

Recomendación mínima para staging/prod:

- setear `VITE_APP_ENV=staging|production`
- setear `VITE_APP_VERSION` con SHA corto o tag de release
- setear `VITE_APP_COMMIT_SHA`, `VITE_APP_BUILD_TIMESTAMP` y opcionalmente `VITE_APP_RELEASE_ID`
- configurar `VITE_SENTRY_DSN` y, si se suben sourcemaps en build/deploy, también `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `VITE_SENTRY_DSN` habilita Sentry; sin DSN no se inicializa.
- Sentry usa `VITE_APP_RELEASE_ID` como release y `VITE_APP_ENV` como environment.
- `VITE_SENTRY_SMOKE_ENABLED=false` por defecto evita enviar eventos reales desde `/__observability`; activarlo sólo para una prueba opt-in.
- El frontend sanitiza tokens, cookies, Authorization headers y query strings antes de enviar eventos a Sentry.
- dejar `VITE_OBSERVABILITY_SMOKE_ENABLED=false` y `APP_OBSERVABILITY_SMOKE_ENABLED=false` por defecto; activarlos sólo para smoke técnico controlado
- apuntar `VITE_OBSERVABILITY_INGEST_URL` a un endpoint equivalente si además se quiere forward local
- conservar `X-Request-Id` en reverse proxy / ingress para correlación punta a punta
- definir `ALLOWED_ORIGINS` con dominios reales de frontend y evitar defaults `localhost`
- usar Grafana en `http://localhost:${STAGING_GRAFANA_PORT:-3000}` con el dashboard provisionado `Barmi Operational MVP`
- usar Prometheus en `http://localhost:${STAGING_PROMETHEUS_PORT:-9090}` para consultas operativas puntuales
- revisar [docs/production/OBSERVABILITY_RUNBOOK.md](/home/anita/Desktop/barmi/docs/production/OBSERVABILITY_RUNBOOK.md:1)
- no dejar la sesión frontend en `localStorage` para una exposición pública prolongada; hoy sigue siendo la principal deuda de auth del lado cliente

Prometheus/Grafana staging:

- `docker-compose.staging.yml` levanta `prometheus` y `grafana`.
- Prometheus scrapea `api:8080/actuator/prometheus` dentro de la red de Compose.
- El endpoint scrapeable no se publica por Nginx: `/actuator/prometheus` devuelve `404` desde el edge.
- Grafana se provisiona con datasource Prometheus y el dashboard `Barmi Operational MVP`.
- Prometheus carga alertas MVP desde `infra/prometheus/rules/barmi-alerts.yml`.
- Alertas incluidas: API down, high 5xx rate, checkout failures spike, payment mismatch, webhook failures, outbox failed/stuck, DB pool pressure y rate limit abuse.
- Grafana provisiona el contact point `Barmi Alerts Webhook`.
- Para local, `GRAFANA_ALERT_WEBHOOK_URL` cae por defecto a `http://127.0.0.1:9/barmi-alerts-placeholder`.
- Para beta real, setear `GRAFANA_ALERT_WEBHOOK_URL` y `OBSERVABILITY_REQUIRE_ALERTS=true`; `scripts/validate-env.sh staging` rechaza placeholders/loopback.
- Opcionales: `GRAFANA_ALERT_WEBHOOK_USERNAME` y `GRAFANA_ALERT_WEBHOOK_TITLE`.
- Prometheus y Grafana se publican sólo en loopback por defecto: `OBSERVABILITY_BIND_ADDRESS=127.0.0.1`.
- Para beta real, mantener loopback y entrar por SSH/VPN, o definir un bind no público detrás de firewall/VPN.
- Grafana no usa `admin/admin` por defecto. Para beta real, definir `GRAFANA_ADMIN_USER` y `GRAFANA_ADMIN_PASSWORD`, y setear `OBSERVABILITY_REQUIRE_STRONG_GRAFANA=true` para que `scripts/validate-env.sh staging` rechace defaults locales.
- Queries útiles:
  - API up: `up{job="barmi-api"}`
  - 5xx: `sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))`
  - p95 latency: `histogram_quantile(0.95, sum by (le) (rate(http_server_requests_seconds_bucket[5m])))`
  - outbox viejo: `barmi_outbox_oldest_pending_age_seconds`
  - DB pending: `hikaricp_connections_pending`
  - firing alerts: `ALERTS{alertstate="firing"}`

Smoke técnico controlado:

- `APP_OBSERVABILITY_SMOKE_ENABLED=true` habilita el endpoint backend no productivo `/api/admin/dev/observability/error`.
- `VITE_OBSERVABILITY_SMOKE_ENABLED=true` habilita la ruta frontend oculta `/__observability`.
- `VITE_SENTRY_SMOKE_ENABLED=true` permite que la ruta oculta envie un evento Sentry controlado; mantenerlo `false` salvo prueba puntual.
- sin ambos flags, el smoke no debe quedar accesible.
- upload manual de sourcemaps: `cd frontend && VITE_APP_RELEASE_ID=<release> SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... npm run sentry:sourcemaps:upload`
- validación sin stack: `CHECK_MODE=static ./scripts/smoke-observability.sh`
- validación end-to-end local/staging: `APP_OBSERVABILITY_SMOKE_ENABLED=true VITE_OBSERVABILITY_SMOKE_ENABLED=true docker compose -f docker-compose.staging.yml up -d --build` y luego `BASE_URL=http://localhost:8088 PROMETHEUS_URL=http://localhost:9090 GRAFANA_URL=http://localhost:3000 RELEASE_ID="$VITE_APP_RELEASE_ID" ./scripts/smoke-observability.sh`
- opt-in Sentry real: construir con `VITE_SENTRY_SMOKE_ENABLED=true` y correr `EXPECT_SENTRY_EVENT=true SENTRY_EXPECT_DSN_HOST=<host-del-dsn> ./scripts/smoke-observability.sh`
- opt-in alert webhook real: `EXPECT_ALERT_WEBHOOK=true ./scripts/smoke-observability.sh` exige que el contact point no sea placeholder/loopback, pero no envia notificaciones.

## CI / deploy checklist

El workflow de GitHub ahora corre:

- baseline rápida
- validación full frontend (`check:architecture` + `build` + baseline tests)
- validación full backend (`test` + `integrationTest`)
- `docker build`
- `docker compose --profile prod config`

Antes de deploy real conviene verificar además:

- secrets reales para `JWT_SECRET` y `MP_WEBHOOK_SECRET`
- `STORE_BASE_DOMAIN` real
- emails reales: `NOTIFICATION_EMAIL_MODE=smtp`, `NOTIFICATION_EMAIL_FROM`, `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME` y `SPRING_MAIL_PASSWORD`
- availability del datastore Redis si se usa profile `prod`
- `./scripts/smoke-staging.sh` con demo data cargada y backend/frontend accesibles

## Notes

- Multi-tenant is modeled as a **column strategy**: every store-owned row carries `store_id`.
- The backend resolves the current store by **Host header** (subdomain) using a simple resolver.
- Outbox dispatcher runs on a schedule; you can later switch to a message broker.

## Endpoints relevantes hoy

No es una referencia exhaustiva. Para payloads más detallados, ver `backend/README.md` y los contracts/adapters del frontend.

### STORE público

- `GET /api/public/stores/{slug}`
- `GET /api/public/stores/{slug}/products?q={optional}&availableOnly={optional}&sort={optional}&categoryId={optional}`
- `POST /api/public/beta/telemetry`
- `POST /api/public/beta/feedback`
- `GET /api/store/shipping/quote`
- `POST /api/store/checkout/preview`
- `POST /api/store/checkout`
- `GET /api/store/orders`
- `GET /api/store/orders/{orderId}`
- `POST /api/store/payments/initiate`

### STORE admin / operaciones

- `GET /api/store/analytics/summary`
- `GET /api/store/analytics/report?range={today|7d|30d}`
- `GET /api/store/analytics/products?range=7d`
- `GET /api/store/analytics/commerce?range=7d`
- `GET /api/store/members`
- `POST /api/store/members`
- `PATCH /api/store/members/{memberId}/role`
- `PATCH /api/store/members/{memberId}/status`
- `GET /api/store/products`
- `GET /api/store/products/{productId}`
- `POST /api/store/products`
- `PUT /api/store/products/{productId}`
- `DELETE /api/store/products/{productId}`
- `GET /api/store/categories`
- `POST /api/store/categories`
- `PATCH /api/store/categories/{categoryId}/active`
- `GET /api/store/promotions`
- `POST /api/store/promotions`
- `PATCH /api/store/promotions/{promotionId}/active`
- `GET /api/store/shipping/zones`
- `POST /api/store/shipping/zones`
- `DELETE /api/store/shipping/zones/{zoneId}`
- `GET /api/store/fulfillments`
- `GET /api/store/fulfillments/{fulfillmentId}`
- `POST /api/store/orders/{orderId}/fulfillment`
- `GET /api/store/admin/orders?page={n}&size={n}&status={optional}&hasOperationalConflict={optional}&hasFulfillment={optional}`
- `GET /api/store/admin/orders/{orderId}`
- `POST /api/store/admin/orders/{orderId}/cancel`
- `POST /api/store/admin/orders/{orderId}/retry-processing`
- `PATCH /api/store/fulfillments/{fulfillmentId}/status`

STORE admin orders separa el estado real de la orden de indicadores operativos derivados como conflicto post-pago, pago confirmado, fulfillment creado y cancelación manual.

Promociones STORE siguen un flujo MVP simple: el cupón se valida en checkout y el descuento queda persistido en la order, pero el `usageCount` sólo se consume cuando el pago queda efectivamente confirmado. Si la orden no se paga, el cupón no gasta uso.
STORE también suma notificaciones MVP por email basadas en eventos reales del outbox para orden creada, pago confirmado, cancelación manual y cambios relevantes de fulfillment. En Fase 1, el pago confirmado avisa al comprador y también envía "nueva orden pagada" a miembros activos `OWNER`/`ADMIN` de la tienda. El checkout STORE persiste `buyerEmail` en la order para cubrir guest checkout y usarlo como fuente confiable en notificaciones posteriores.
El delivery real de email queda configurable por environment: `NOTIFICATION_EMAIL_MODE=logging|smtp`. El default sigue siendo `logging` y no falla si SMTP no está configurado. Para `smtp` también hace falta `NOTIFICATION_EMAIL_FROM` más la configuración estándar `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` y propiedades SMTP equivalentes. La entrega es at-least-once: Barmi registra el delivery después de enviar para no marcar como enviado algo que falló antes de SMTP; si el proceso cae justo después del envío y antes del registro, un retry puede duplicar ese email.

El módulo ahora expone:
- listado admin con indicadores operativos derivados y filtros por `status`, conflicto operativo y fulfillment creado
- detalle admin con resumen operativo y timeline derivada
- dos acciones manuales mínimas:
- cancelar una orden mientras no tenga fulfillment creado
- reintentar el procesamiento de un conflicto de stock post-pago después de corregir stock manualmente

No hay refunds automáticos. Si el reintento no puede resolver stock, la orden mantiene el conflicto operativo hasta nueva intervención manual.

STORE analytics sigue teniendo un `summary` agregado y ahora suma un reporting operativo MVP con rango corto (`today`, `7d`, `30d`). El reporte mezcla dos bloques explícitos: métricas del período por fecha de creación/confirmación/evento, y snapshot actual de fulfillments por estado. También expone un primer dashboard de producto público para los últimos 7 días, agregado desde telemetry beta por `productSlug` con views, clicks, add to cart, CTR y add-to-cart rate.

Para alineación incremental con ADR-007, el naming recomendado para nuevas métricas es `paymentsConfirmed`. En STORE se mantiene también `ordersPaid` como alias compatible en el contrato actual.

### ECOSYSTEM público

- `GET /api/public/ecosystems/{slug}`
- `GET /api/public/ecosystems/{slug}/home`
- `GET /api/public/ecosystems/{slug}/stores/map?q={optional}&category={optional}&location={optional}&sort={optional}`
- `GET /api/public/ecosystems/{slug}/products?q={optional}&sort={optional}&deliverySupported={optional}&activeOnly={optional}`
- `GET /robots.txt`
- `GET /sitemap.xml`

SEO público básico:

- indexables: `/ecosystem`, `/ecosystem/catalog`, `/ecosystem/categories/{categorySlug}` para categorías públicas con stores activas, `/public/{storeSlug}` para stores activas del ecosystem público configurado
- noindex: `/ecosystem/stores/map`, auth, admin, checkout y órdenes públicas
- canonical: las páginas públicas limpian query params de filtros, búsqueda, sort y paginación
- sitemap: incluye home ecosystem, catálogo ecosystem, categorías públicas con stores activas y stores activas asociadas; no incluye búsquedas arbitrarias con query params
- JSON-LD básico en rutas públicas indexables: `WebSite` para `/ecosystem`, `CollectionPage` + `ItemList` para `/ecosystem/catalog`, `CollectionPage` + `ItemList` + `BreadcrumbList` para `/ecosystem/categories/{categorySlug}` y `Store` + `BreadcrumbList` + `ItemList` para `/public/{storeSlug}`; no se emite en páginas `noindex`, rutas con query params ni cuando faltan datos mínimos
- limitación: al seguir siendo React SPA sin SSR, crawlers con poco soporte JavaScript pueden ver sólo metadata base de `index.html`; páginas de detalle de producto y schema `Product` detallado quedan para PRs posteriores

Endpoints operativos internos de beta:

- `GET /api/admin/beta/summary`
- `GET /api/ecosystem/shipping/quote`
- `POST /api/ecosystem/checkout`
- `GET /api/ecosystem/orders`
- `GET /api/ecosystem/orders/{orderId}`
- `POST /api/ecosystem/payments/initiate`

Notas de modelado público para stores del ecosystem:

- cada store puede tener `0..1` categoría pública principal
- la categoría se persiste en `stores.public_category_key`
- el filtro público por categoría usa ese key estable
- no hay tags libres ni many-to-many en esta fase

### ECOSYSTEM admin

- `GET /api/ecosystem/admin/analytics/summary?ecosystemId={uuid}`
- `GET /api/ecosystem/admin/analytics/report?ecosystemId={uuid}&range={today|7d|30d}`
- `GET /api/ecosystem/orders?page={n}&size={n}&status={optional}`
- `GET /api/ecosystem/orders/{orderId}`
- `GET /api/ecosystem/admin/products?ecosystemId={uuid}&activeOnly={boolean}&query={optional}`
- `GET /api/ecosystem/admin/products/{id}?ecosystemId={uuid}`
- `POST /api/ecosystem/admin/products`
- `PUT /api/ecosystem/admin/products/{id}`
- `DELETE /api/ecosystem/admin/products/{id}?ecosystemId={uuid}`
- `GET /api/ecosystem/admin/shipping/zones?ecosystemId={uuid}`
- `POST /api/ecosystem/admin/shipping/zones`
- `DELETE /api/ecosystem/admin/shipping/zones/{zoneId}?ecosystemId={uuid}`
- `GET /api/ecosystem/fulfillments?ecosystemId={uuid}`
- `GET /api/ecosystem/fulfillments/{fulfillmentId}?ecosystemId={uuid}`
- `POST /api/ecosystem/orders/{orderId}/fulfillment`
- `PATCH /api/ecosystem/fulfillments/{fulfillmentId}/status`

ECOSYSTEM analytics mantiene el `summary` agregado y ahora suma un reporting operativo MVP con rango corto (`today`, `7d`, `30d`). A diferencia de STORE, el reporte se limita a órdenes creadas, pagos confirmados, fulfillments creados y venta confirmada, porque hoy no existe un equivalente modelado de conflicto operativo post-pago.

## Documentación relacionada

- `backend/README.md`: endpoints backend documentados con más detalle
- `docs/production/MVP_LAUNCH_CHECKLIST.md`: checklist corta de salida real MVP
- `docs/production/CONFIGURATION.md`: variables sensibles y criterios de configuración
- `docs/adr/*`: decisiones de arquitectura
- `AGENTS.md`: reglas operativas del repo
- `frontend/src/api/contracts/v1/*`: contratos tipados consumidos por frontend
- `README_DEV.md`: flujo de desarrollo y validación mínima del baseline

## Pendientes reales hoy

Estos puntos siguen fuera del baseline actual o sólo existen en forma MVP:

- analytics administrativos sólo como summary operativo; no hay dashboards BI avanzados
- STORE sólo tiene stock/disponibilidad operativa MVP por producto; no hay reservas, historial de movimientos ni inventario profundo
- los conflictos de stock post-payment STORE se muestran en backoffice, pero no tienen resolución automática ni refunds automáticos
- no hay exportaciones operativas ni reporting batch
- la documentación del proyecto sigue siendo mínima y está orientada a continuidad técnica, no a manual de producto completo

## Local development (backend + dedicated DB)

1) Start local DB + Redis:

```bash
docker compose -f docker-compose.dev.yml up -d
```

2) Run the backend using the local profile:

```bash
cd backend
./gradlew bootRun -Dspring.profiles.active=local
```

- Postgres runs on `localhost:5434` (user `barmi`, password `barmi123`).
- Redis runs on `localhost:6379`.
