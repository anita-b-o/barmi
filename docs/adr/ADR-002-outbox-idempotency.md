# ADR-002: Outbox Pattern and Idempotency

Status: Accepted

## Context

- The system emits domain events for integration.
- Events must be persisted transactionally with state changes.
- Consumers/processors can retry; duplicates must not cause double-processing.

## Decision

- Outbox table/entity: `outbox_events` / `OutboxEvent`.
- Key fields: `event_id` (UUID, PK), `event_type`, `scope`, `aggregate_id`, `payload_json`, `occurred_at`, `published_at`.
- `event_id` is supplied by the caller (e.g., webhook payload) and used as the primary idempotency key.
- No `correlation_id` is currently stored.
- Processed events are tracked in `processed_events` / `ProcessedEvent` with `event_id` (PK) and `processed_at`.
- Delivery semantics are at-least-once: unpublished events are polled and published, then marked with `published_at`.
- Dedupe rule: process once per `event_id` (checked via `processed_events`).
- Retry behavior: if publishing/processing fails, the event remains unpublished/unprocessed and will be retried on the next poll or webhook retry.

## Consequences

- Every transactional business operation that changes aggregate state must emit exactly one domain event into `outbox_events`.
- Consumers must be idempotent.
- Monitoring/ops: a growing outbox backlog indicates downstream processing issues.
