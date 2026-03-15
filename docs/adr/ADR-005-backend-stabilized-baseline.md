# ADR-005 — Backend Stabilized Baseline

## Status
Accepted

## Decision
Declare the backend “Stabilized Baseline” for production readiness with minimal observability and integrity guarantees in place.

## Guarantees
- Payments idempotency by webhook_event_id and provider_payment_id
- Only one CONFIRMED payment per (scope, operation_id)
- Transactional outbox for downstream processing
- Minimal observability via Actuator health + metrics
- Status enum constraints at DB level

## Out of Scope
- New business features
- Correlation IDs / distributed tracing
- Multi-region or HA infrastructure
- Major refactors or architecture changes

## Rationale
The current system is stable, tests pass, and critical integrity constraints and idempotency rules are enforced. The baseline is sufficient for production roll-out with controlled operational visibility.
