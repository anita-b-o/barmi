# Configuration — Barmi Backend

## Properties (relevant)
- management.endpoints.web.exposure.include
  - Default: health,info,metrics
- observability.outbox.backlog-threshold
  - Default: 1000
  - Used by OutboxBacklogHealthIndicator
- app.security.allowDevIdentityHeader
  - Dev-only convenience header; keep false in prod
- app.mercadoPago.webhookSecret (MP_WEBHOOK_SECRET)
  - Webhook auth
- app.security.jwtSecret (JWT_SECRET)
  - JWT signing secret
- spring.datasource.*
  - DB connection
- spring.flyway.enabled
  - Migrations on startup

## Profiles
- default
  - Normal runtime configuration
- prod
  - Use environment variables; same features as default
- integrationtest
  - Used by Testcontainers and integration tests

## Sensitive variables (no hardcode)
- DB_PASSWORD
- JWT_SECRET
- MP_WEBHOOK_SECRET
- DB_USER / DB_HOST / DB_PORT / DB_NAME
