# Contributing Guide (AGENTS.md)

## Stack
- Backend: Spring Boot + JPA + Flyway
- Frontend: Vite + React + TypeScript + React Query

## Domain Rules
- Store scope: everything that is “store-scoped” must include `store_id` and be tenant-filtered. Tenant resolution is via Host/slug.
- Cart: cart is stateless on the frontend; the backend always recalculates totals and validates stock/price.
- Events: use transactional outbox + idempotency. Events can only have scope `STORE` or `ECOSYSTEM` (no `RESERVATION`).
- Admin endpoints: all `admin/dev/*` endpoints are development-only and must be blocked in production.

## Standards
- Naming: use clear, consistent naming that reflects domain terms (e.g., `store_id`, `tenant_slug`, `outbox_event`).
- Packages: follow a layered structure (e.g., `controller`, `service`, `repository`, `domain`, `config`). Keep boundaries clear.
- Tests: minimum coverage for new/changed logic with unit tests; integration tests for critical flows (tenant filtering, cart validation, outbox publishing).
- Flyway: all schema changes must be versioned migrations. No manual edits in production.

## Definition of Done
- Tests pass.
- Flyway migrations apply cleanly.
- Endpoints relevant to changed features are documented in `README`.
- This `AGENTS.md` exists, is clear/specific, and does not contradict the repo.
