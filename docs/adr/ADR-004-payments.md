# ADR-004: Payments Model, Scope, and Idempotent Confirmation

Status: Accepted

## Context

- Payments must be confirmed via provider webhooks (MercadoPago).
- Webhooks can be delivered multiple times.
- System must guarantee at most one CONFIRMED payment per operation per scope.
- Order state must transition monotonically based on confirmed payment.

## Decision

- Payments are stored in `payments` with fields:
  - `id` (UUID PK)
  - `scope` (TEXT)
  - `operation_id` (UUID)
  - `provider` (TEXT)
  - `provider_payment_id` (TEXT)
  - `status` (TEXT: PENDING|CONFIRMED|FAILED)
  - `amount` (NUMERIC(19,2) >= 0)
  - `currency` (TEXT, non-empty)
  - `created_at`, `confirmed_at`
- Constraint: a UNIQUE partial index enforces at most one CONFIRMED payment per `(scope, operation_id)`:
  - `UNIQUE (scope, operation_id) WHERE status = 'CONFIRMED'`
- Scope semantics:
  - `STORE` for store order payments.
  - `ECOSYSTEM` for ecosystem order payments.
- Idempotency:
  - Use `ProcessedEvent` keyed by the webhook `event_id` (or provider event id).
  - Delivery is at-least-once; side effects are exactly-once via processed-event dedupe plus the confirmed-payment uniqueness constraint.
- Order transition rule:
  - `StoreOrder` transitions `PENDING_PAYMENT -> PAID` upon confirmed payment.

## Consequences

- Duplicate webhook deliveries are safe and do not create double effects.
- Monitoring should track pending vs confirmed payments; confirmed uniqueness is enforced by DB.
- Requires stable provider event id extraction from webhook payloads.
