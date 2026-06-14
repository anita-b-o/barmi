# Ecosystem Product Search Baseline

## Scope

This baseline covers `GET /api/public/ecosystems/{slug}/products` backed by
`ecosystem_external_products`.

The current public discovery query filters by:

- `ecosystem_id`
- `is_active` when `activeOnly=true`
- `delivery_supported` when `deliverySupported` is provided
- `lower(name) like '%term%'` when `q` or `query` is provided

The current public sorts are:

- default: `created_at desc`
- `relevance` when `q` or `query` is present
- `name,asc` / `name,desc`
- `price,asc` / `price,desc`
- `createdAt,desc`

## Existing Indexes

The table already had:

- `idx_ecosystem_external_products_ecosystem_id`
- `idx_ecosystem_external_products_ecosystem_id_is_active`
- `idx_ecosystem_external_products_ecosystem_id_name`

These help tenant filtering and some name-ordered scans, but they do not cover
the default `created_at` rail, `delivery_supported` filtering, price ordering,
or substring search with `LIKE '%term%'`.

## Baseline Dataset

`EcosystemExternalProductSearchPlanIT` creates a controlled PostgreSQL dataset:

- 10,000 products in the target ecosystem
- 1,000 products in another ecosystem
- mixed `is_active`
- mixed `delivery_supported`
- deterministic `created_at`, `name`, and `price_amount`
- 50 active target products matching the rare substring `needle`

The test runs `ANALYZE ecosystem_external_products` before collecting plans.

## Queries Reviewed

The integration baseline runs `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for:

- no `q`, default `created_at desc`
- `q=needle`
- `q=needle` with relevance ordering
- `sort=name,asc`
- `sort=price,asc`
- `deliverySupported=true`

The assertions intentionally check index selection, not exact timing, because
CI hardware and Testcontainers storage vary.

For the 10k target-product dataset, PostgreSQL may still choose the existing
tenant btree path and filter names afterward because scanning one tenant's small
catalog is cheap. The test therefore records the real `q` plan shape instead of
forcing the trigram path.

## Relevance Ranking

When `q` or `query` is present and `sort` is omitted, `default`, or
`relevance`, the public endpoint uses a simple SQL ranking:

- exact `lower(name)` match
- prefix `lower(name)` match
- substring match from the existing `LIKE '%term%'` filter
- `delivery_supported=true` boost when that filter is not explicitly set
- `is_active=true` boost when `activeOnly=false`
- `created_at desc`
- `id asc` as a stable tie-break

Explicit `name`, `price`, and `createdAt,desc` sorts still bypass relevance.
This is intentionally not typo tolerance, synonym expansion, ML ranking, or
cross-field relevance. `pg_trgm` remains a PostgreSQL-native support for
substring matching/performance; it is not a relevance engine.

## Added Indexes

Migration `V31__ecosystem_product_search_indexes.sql` adds:

- `idx_ecosystem_external_products_public_created`
  - supports tenant + active filtering with default `created_at desc` pagination
- `idx_ecosystem_external_products_public_delivery_created`
  - supports the public delivery rail/filter without scanning all active products
- `idx_ecosystem_external_products_public_name_created`
  - supports name sorting within tenant + active public catalog scans
- `idx_ecosystem_external_products_public_price_created`
  - supports price sorting within tenant + active public catalog scans
- `idx_ecosystem_external_products_name_trgm`
  - supports tenant-scoped `lower(name) like '%term%'`

`pg_trgm` is enabled with `CREATE EXTENSION IF NOT EXISTS pg_trgm`. The trigram
index also includes `ecosystem_id`, so `btree_gin` is enabled for the UUID
equality operator class. A btree or plain expression index on `lower(name)` is
not enough for the current substring query shape, so a tenant-aware GIN trigram
index is the narrow PostgreSQL-native baseline.

## When To Consider External Search

Stay on PostgreSQL while discovery remains simple substring filtering plus
deterministic sorting over catalog-sized data.

Consider an external search engine only when product discovery needs real
ranking, typo tolerance, facets with high cardinality, cross-field relevance,
language-specific stemming, or operational search isolation that PostgreSQL
cannot provide without harming write/read latency.
