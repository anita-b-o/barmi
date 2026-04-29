# Configuration — Barmi Backend

## Properties (relevant)
- app.tenant.baseDomain (STORE_BASE_DOMAIN)
  - Base domain used to resolve store subdomains and build public links
- app.notifications.storePublicScheme (STORE_PUBLIC_SCHEME)
  - Public scheme used in order notification tracking links (`https` recommended in real envs)
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
- app.notifications.email.mode (NOTIFICATION_EMAIL_MODE)
  - `logging` by default
  - Set `smtp` to enable real delivery
- app.notifications.email.from (NOTIFICATION_EMAIL_FROM)
  - Required when `app.notifications.email.mode=smtp`
- spring.mail.*
  - SMTP transport config when `app.notifications.email.mode=smtp`
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
- SPRING_MAIL_PASSWORD
- DB_USER / DB_HOST / DB_PORT / DB_NAME

## Launch note
- In a real MVP environment, verify that `STORE_BASE_DOMAIN` and `STORE_PUBLIC_SCHEME` match the public entrypoint actually used by buyers.
- If notifications are expected to leave the system, do not stay on `logging`; set `NOTIFICATION_EMAIL_MODE=smtp` and validate one real delivery end-to-end.
