# ADR-003: Snapshot Strategy for Commercial Records

Status: Accepted

## Context

- Prices, names, and availability can change over time.
- Orders must remain auditable and stable after creation.
- The system must not recalculate commercial totals from mutable catalog data after checkout.

## Decision

- `StoreOrderItem` must persist an immutable snapshot of the purchased item at checkout time.
- Snapshot minimum fields:
  - `name`
  - `unit_price_amount`
  - `currency`
  - `sku` (if present in the current domain)
- `StoreOrder` must persist order-level snapshots:
  - `subtotal_amount`
  - `total_amount`
  - `currency`
  - shipping/taxes placeholders may be added later as explicit snapshot fields.
- Post-checkout totals are read from snapshots only.
- Snapshot storage uses PostgreSQL `JSONB` columns or explicit columns per field.

## Consequences

- Refunding/reviewing orders uses snapshots, not `Product`.
- Catalog edits do not affect historical orders.
- Requires JSONB snapshot columns (or explicit columns) in DB.
