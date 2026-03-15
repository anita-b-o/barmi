# Production Readiness Review (PRR) — Backend Stabilized Baseline

## Scope
Included:
- Barmi backend API (Spring Boot)
- Payments confirmation + idempotency
- Transactional outbox + dispatcher
- Observability (Actuator health + metrics)
- DB constraints for core integrity
- Integration + unit test suites

Excluded:
- Frontend and mobile apps
- External infra (LB, CDN, WAF)
- Alerting/monitoring stack configuration
- Data migrations beyond Flyway
- New features or API changes

## GO/NO-GO Checklist
- [ ] /actuator/health returns UP or DEGRADED only for known backlog conditions
- [ ] /actuator/metrics available and includes barmi_ metrics
- [ ] Database reachable; Flyway applied cleanly
- [ ] Payments confirmation idempotent by webhook_event_id and provider_payment_id
- [ ] Unique confirmed payment constraint enforced
- [ ] Outbox backlog health detail visible
- [ ] integrationTest suite passes
- [ ] test suite passes
- [ ] Secrets configured (DB, JWT, webhook secret)
- [ ] Scheduler toggle configured for prod as intended

## Known Risks + Mitigations (max 8)
1. Outbox backlog growth under load
   - Mitigation: monitor barmi_outbox_pending_events and health DEGRADED threshold
2. Webhook replay/flood
   - Mitigation: webhook_event_id idempotency + provider_payment_id conflict checks
3. Payment mismatch spikes due to upstream errors
   - Mitigation: monitor barmi_payments_mismatch_total; investigate currency/amount mismatches
4. DB contention on payments unique index
   - Mitigation: NO-OP deterministic handling on unique(scope, operation_id)
5. Scheduler disabled in prod by mistake
   - Mitigation: verify scheduler property at deploy
6. Actuator endpoints exposed too broadly
   - Mitigation: keep exposure limited to health/info/metrics
7. Flyway drift
   - Mitigation: enforce flyway validation on startup
8. Secrets misconfiguration
   - Mitigation: validate env vars on deploy, use secret manager

## Observability
Actuator endpoints:
- /actuator/health
- /actuator/metrics
- /actuator/info

Metrics (Micrometer):
- barmi_payments_confirmed_total (tag: scope=STORE|ECOSYSTEM)
- barmi_payments_mismatch_total (tag: scope=STORE|ECOSYSTEM)
- barmi_outbox_pending_events (gauge)

## Integrity Constraints (DB-level)
- store_orders.status CHECK IN ('PENDING_PAYMENT','PAID','CANCELLED')
- ecosystem_orders.status CHECK IN ('PENDING_PAYMENT','PAID','CANCELLED')
- store_orders shipping snapshot CHECK (shipping_cost_amount and related fields)
- store_shipping_zones range CHECK (non-overlap constraints)
- payments unique index: (scope, operation_id) WHERE status='CONFIRMED'

## Idempotency Rules
- webhook_event_id: processed_events ensures exactly-once processing
- provider_payment_id: conflict detection prevents mismatched scope/operation
- (scope, operation_id): only one CONFIRMED payment allowed

## Outbox
- Outbox events are persisted in the same transaction as domain changes
- Backlog health:
  - pending > observability.outbox.backlog-threshold => Health status DEGRADED
  - pending <= threshold => Health UP

## Tests
Commands:
- ./backend/gradlew -p backend test
  - Unit tests and fast checks
- ./backend/gradlew -p backend integrationTest
  - Integration tests with Testcontainers (DB, flows, idempotency)
