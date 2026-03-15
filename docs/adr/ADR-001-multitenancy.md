# ADR-001: Multi-Tenancy Strategy

Status: Accepted

## Context

- The system supports multiple stores (tenants).
- Each request must be scoped to a specific store.
- Data isolation is enforced at the application level.
- Store ID is required for all store-bound operations.

## Decision

- Store context is resolved from the request Host header using a subdomain strategy.
- `StoreResolverFilter` parses `Host` against `app.tenant.baseDomain` and sets the store slug in `TenantContext`.
- Controllers/services resolve the store slug to a store record, then use its `store_id` for all store-bound operations.

Behavior:

- Nonexistent store → 404
- Inactive store → 403
- Controllers and services must always require store context for store-scoped operations.

## Consequences

- Every repository query must include `store_id`.
- Cross-store operations are forbidden.
- Tests must include tenant scoping validation.
