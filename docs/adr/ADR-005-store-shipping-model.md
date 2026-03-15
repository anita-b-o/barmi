# ADR-005: Store Shipping Model

Status: Accepted

## Context

- Store orders may require delivery (shipping).
- Shipping rules must be deterministic and auditable.
- A store can define multiple shipping zones.
- Zones must not overlap in ambiguous ways.
- Shipping cost must be snapshotted into the order at checkout time (future step).

## Decision

**Zone types**

- `EXACT`: applies to a specific postal code (string match).
- `RANGE`: applies to a numeric postal code range (int start/end).

**Rules**

- A store may define multiple zones.
- `EXACT` zones cannot overlap (the same postal code cannot appear twice for the same store).
- `RANGE` zones cannot overlap within the same store.
- `EXACT` and `RANGE` cannot conflict. If a postal code falls inside a range and also has an `EXACT` rule, `EXACT` takes precedence. This ensures a deterministic override for special-case pricing.

**Determinism**

- Shipping quote must return exactly one applicable rule.
- If multiple applicable rules exist, it is a configuration error (should be prevented by constraints/validation).

**Persistence (future schema)**

- `store_shipping_zones`
- `store_shipping_rules` or `store_shipping_coverage`

**Snapshots**

At checkout, the selected shipping rule must be snapshotted into `StoreOrder`:

- `zoneId`
- `cost`
- `method`
- `postalCode`

Order totals must never recompute shipping later.

## Consequences

- Requires DB constraints or application-level validation to prevent overlapping ranges.
- Shipping rules are store-scoped.
- Quote endpoint must validate postal code format.
