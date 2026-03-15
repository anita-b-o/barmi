# Barmi

Barmi es una base modular para operar dos dominios separados:

- **STORE**
  - storefront público
  - checkout, pagos y tracking de órdenes
  - backoffice de órdenes, shipping zones, members y fulfillments
- **ECOSYSTEM**
  - catálogo público, checkout, pagos y tracking de órdenes
  - backoffice de products y shipping zones

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

## Estado funcional actual

### STORE público

- catálogo público por slug
- carrito local
- quote de shipping
- checkout STORE
- success screen post-checkout
- listado y detalle público de órdenes
- initiation de pago STORE
- tracking post-payment en detalle de orden

### STORE admin / operaciones

- dashboard básico
- orders admin + detalle
- create fulfillment desde orden pagada
- listado y detalle de fulfillments + update de estado
- members admin
- shipping zones admin

### ECOSYSTEM público

- catálogo público
- checkout con shipping quote
- success screen post-checkout
- listado y detalle de órdenes
- initiation de pago ecosystem
- tracking post-payment y journey post-checkout/post-payment

### ECOSYSTEM admin

- products admin alineado con backend real
- shipping zones admin alineado con backend real

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
- `GET /api/public/stores/{slug}/products`
- `GET /api/store/shipping/quote`
- `POST /api/store/checkout`
- `GET /api/store/orders`
- `GET /api/store/orders/{orderId}`
- `POST /api/store/payments/initiate`

### STORE admin / operaciones

- `GET /api/store/members`
- `POST /api/store/members`
- `PATCH /api/store/members/{memberId}/role`
- `PATCH /api/store/members/{memberId}/status`
- `GET /api/store/shipping/zones`
- `POST /api/store/shipping/zones`
- `DELETE /api/store/shipping/zones/{zoneId}`
- `GET /api/store/fulfillments`
- `GET /api/store/fulfillments/{fulfillmentId}`
- `POST /api/store/orders/{orderId}/fulfillment`
- `PATCH /api/store/fulfillments/{fulfillmentId}/status`

### ECOSYSTEM público

- `GET /api/public/ecosystems/{slug}`
- `GET /api/public/ecosystems/{slug}/products`
- `GET /api/ecosystem/shipping/quote`
- `POST /api/ecosystem/checkout`
- `GET /api/ecosystem/orders`
- `GET /api/ecosystem/orders/{orderId}`
- `POST /api/ecosystem/payments/initiate`

### ECOSYSTEM admin

- `GET /api/ecosystem/admin/products?ecosystemId={uuid}&activeOnly={boolean}&query={optional}`
- `GET /api/ecosystem/admin/products/{id}?ecosystemId={uuid}`
- `POST /api/ecosystem/admin/products`
- `PUT /api/ecosystem/admin/products/{id}`
- `DELETE /api/ecosystem/admin/products/{id}?ecosystemId={uuid}`
- `GET /api/ecosystem/admin/shipping/zones?ecosystemId={uuid}`
- `POST /api/ecosystem/admin/shipping/zones`
- `DELETE /api/ecosystem/admin/shipping/zones/{zoneId}?ecosystemId={uuid}`

## Documentación relacionada

- `backend/README.md`: endpoints backend documentados con más detalle
- `docs/adr/*`: decisiones de arquitectura
- `AGENTS.md`: reglas operativas del repo
- `frontend/src/api/contracts/v1/*`: contratos tipados consumidos por frontend

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
