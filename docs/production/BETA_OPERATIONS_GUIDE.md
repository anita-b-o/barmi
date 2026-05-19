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

## Deploy

1. Validar variables de staging:

```bash
./scripts/validate-env.sh staging
```

2. Reconstruir y levantar staging:

```bash
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
BASE_URL=http://localhost:${STAGING_HTTP_PORT:-8088} \
STORE_HOST=${VITE_PUBLIC_STORE_HOST} \
./scripts/smoke-staging.sh
```

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

## Beta Telemetry Light

Eventos de producto activos:

- discovery:
  - `ecosystem_home_view`
  - `catalog_view`
  - `map_view`
  - `store_view`
  - `search_used`
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
- checkout started
- checkout success
- checkout failure
- checkout success rate
- login success
- login failure
- login failure rate
- feedback enviados
- top stores vistas
- top búsquedas

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

Señales a registrar:

- fricción
- copy confuso
- pasos largos
- loaders persistentes
- errores técnicos visibles
- estados vacíos sin CTA claro
- reconexión post-restart
- expiración de sesión y retorno post-login
