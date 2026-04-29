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

## Notes

- Multi-tenant is modeled as a **column strategy**: every store-owned row carries `store_id`.
- The backend resolves the current store by **Host header** (subdomain) using a simple resolver.
- Outbox dispatcher runs on a schedule; you can later switch to a message broker.

## Endpoints relevantes hoy

No es una referencia exhaustiva. Para payloads más detallados, ver `backend/README.md` y los contracts/adapters del frontend.

### STORE público

- `GET /api/public/stores/{slug}`
- `GET /api/public/stores/{slug}/products?q={optional}&availableOnly={optional}&sort={optional}&categoryId={optional}`
- `GET /api/store/shipping/quote`
- `POST /api/store/checkout/preview`
- `POST /api/store/checkout`
- `GET /api/store/orders`
- `GET /api/store/orders/{orderId}`
- `POST /api/store/payments/initiate`

### STORE admin / operaciones

- `GET /api/store/analytics/summary`
- `GET /api/store/analytics/report?range={today|7d|30d}`
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
STORE también suma notificaciones MVP por email basadas en eventos reales del outbox para orden creada, pago confirmado, cancelación manual y cambios relevantes de fulfillment. El checkout STORE ahora persiste `buyerEmail` en la order para cubrir también guest checkout y usarlo como fuente confiable en notificaciones posteriores.
El delivery real de email queda configurable por environment: `NOTIFICATION_EMAIL_MODE=logging|smtp`. El default sigue siendo `logging`. Para `smtp` también hace falta `NOTIFICATION_EMAIL_FROM` más la configuración estándar `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` y propiedades SMTP equivalentes.

El módulo ahora expone:
- listado admin con indicadores operativos derivados y filtros por `status`, conflicto operativo y fulfillment creado
- detalle admin con resumen operativo y timeline derivada
- dos acciones manuales mínimas:
- cancelar una orden mientras no tenga fulfillment creado
- reintentar el procesamiento de un conflicto de stock post-pago después de corregir stock manualmente

No hay refunds automáticos. Si el reintento no puede resolver stock, la orden mantiene el conflicto operativo hasta nueva intervención manual.

STORE analytics sigue teniendo un `summary` agregado y ahora suma un reporting operativo MVP con rango corto (`today`, `7d`, `30d`). El reporte mezcla dos bloques explícitos: métricas del período por fecha de creación/confirmación/evento, y snapshot actual de fulfillments por estado.

Para alineación incremental con ADR-007, el naming recomendado para nuevas métricas es `paymentsConfirmed`. En STORE se mantiene también `ordersPaid` como alias compatible en el contrato actual.

### ECOSYSTEM público

- `GET /api/public/ecosystems/{slug}`
- `GET /api/public/ecosystems/{slug}/home`
- `GET /api/public/ecosystems/{slug}/stores/map?q={optional}&category={optional}&location={optional}&sort={optional}`
- `GET /api/public/ecosystems/{slug}/products?q={optional}&sort={optional}&deliverySupported={optional}&activeOnly={optional}`
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
