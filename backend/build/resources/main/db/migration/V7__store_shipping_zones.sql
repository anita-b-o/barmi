CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE store_shipping_zones (
  id           UUID PRIMARY KEY,
  store_id     UUID NOT NULL REFERENCES stores(id),
  type         TEXT NOT NULL,
  postal_code  TEXT NULL,
  range_start  INT NULL,
  range_end    INT NULL,
  cost_amount  NUMERIC(19, 2) NOT NULL CHECK (cost_amount >= 0),
  currency     TEXT NOT NULL CHECK (char_length(currency) > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (type = 'EXACT' AND postal_code IS NOT NULL AND range_start IS NULL AND range_end IS NULL)
    OR
    (type = 'RANGE' AND postal_code IS NULL AND range_start IS NOT NULL AND range_end IS NOT NULL AND range_start <= range_end)
  )
);

CREATE UNIQUE INDEX ux_store_shipping_zones_store_postal_exact
  ON store_shipping_zones(store_id, postal_code)
  WHERE type = 'EXACT';

CREATE INDEX idx_store_shipping_zones_store_id
  ON store_shipping_zones(store_id);

CREATE INDEX idx_store_shipping_zones_store_id_type
  ON store_shipping_zones(store_id, type);

ALTER TABLE store_shipping_zones
  ADD CONSTRAINT ex_store_shipping_zones_range_overlap
  EXCLUDE USING gist (
    store_id WITH =,
    int4range(range_start, range_end, '[]') WITH &&
  )
  WHERE (type = 'RANGE');
