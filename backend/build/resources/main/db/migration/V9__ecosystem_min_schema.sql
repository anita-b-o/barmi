CREATE TABLE ecosystems (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ecosystem_external_products (
  id                  UUID PRIMARY KEY,
  ecosystem_id        UUID NOT NULL REFERENCES ecosystems(id),
  name                TEXT NOT NULL,
  price_amount        NUMERIC(19, 2) NOT NULL CHECK (price_amount >= 0),
  currency            TEXT NOT NULL CHECK (char_length(currency) > 0),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_supported  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ecosystem_external_products_ecosystem_id
  ON ecosystem_external_products(ecosystem_id);

CREATE INDEX idx_ecosystem_external_products_ecosystem_id_is_active
  ON ecosystem_external_products(ecosystem_id, is_active);

CREATE INDEX idx_ecosystem_external_products_ecosystem_id_name
  ON ecosystem_external_products(ecosystem_id, name);

CREATE TABLE ecosystem_orders (
  id                    UUID PRIMARY KEY,
  ecosystem_id          UUID NOT NULL REFERENCES ecosystems(id),
  status                TEXT NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED')),
  currency              TEXT NOT NULL CHECK (char_length(currency) > 0),
  subtotal_amount       NUMERIC(19, 2) NOT NULL CHECK (subtotal_amount >= 0),
  shipping_cost_amount  NUMERIC(19, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost_amount >= 0),
  shipping_currency     TEXT NOT NULL DEFAULT '',
  shipping_zone_id      UUID NULL,
  shipping_postal_code  TEXT NULL,
  total_amount          NUMERIC(19, 2) NOT NULL CHECK (total_amount >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ecosystem_orders
  ADD CONSTRAINT chk_ecosystem_orders_shipping_snapshot
  CHECK (
    shipping_cost_amount = 0
    OR (shipping_zone_id IS NOT NULL AND shipping_postal_code IS NOT NULL)
  );

CREATE INDEX idx_ecosystem_orders_ecosystem_id
  ON ecosystem_orders(ecosystem_id);

CREATE INDEX idx_ecosystem_orders_ecosystem_id_created_at
  ON ecosystem_orders(ecosystem_id, created_at);

CREATE INDEX idx_ecosystem_orders_ecosystem_id_status_created_at
  ON ecosystem_orders(ecosystem_id, status, created_at);

CREATE TABLE ecosystem_order_items (
  id                  UUID PRIMARY KEY,
  ecosystem_order_id  UUID NOT NULL REFERENCES ecosystem_orders(id),
  external_product_id UUID NULL,
  qty                 INT NOT NULL CHECK (qty > 0),
  unit_price_amount   NUMERIC(19, 2) NOT NULL CHECK (unit_price_amount >= 0),
  line_total_amount   NUMERIC(19, 2) NOT NULL CHECK (line_total_amount >= 0),
  item_snapshot       JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ecosystem_order_items_order_id
  ON ecosystem_order_items(ecosystem_order_id);

CREATE TABLE ecosystem_shipping_zones (
  id          UUID PRIMARY KEY,
  ecosystem_id UUID NOT NULL REFERENCES ecosystems(id),
  type        TEXT NOT NULL,
  postal_code TEXT NULL,
  range_start INT NULL,
  range_end   INT NULL,
  cost_amount NUMERIC(19, 2) NOT NULL CHECK (cost_amount >= 0),
  currency    TEXT NOT NULL CHECK (char_length(currency) > 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (type = 'EXACT' AND postal_code IS NOT NULL AND range_start IS NULL AND range_end IS NULL)
    OR
    (type = 'RANGE' AND postal_code IS NULL AND range_start IS NOT NULL AND range_end IS NOT NULL AND range_start <= range_end)
  )
);

CREATE UNIQUE INDEX ux_ecosystem_shipping_zones_ecosystem_postal_exact
  ON ecosystem_shipping_zones(ecosystem_id, postal_code)
  WHERE type = 'EXACT';

CREATE INDEX idx_ecosystem_shipping_zones_ecosystem_id
  ON ecosystem_shipping_zones(ecosystem_id);

CREATE INDEX idx_ecosystem_shipping_zones_ecosystem_id_type
  ON ecosystem_shipping_zones(ecosystem_id, type);

CREATE INDEX idx_ecosystem_shipping_zones_ecosystem_id_postal_exact
  ON ecosystem_shipping_zones(ecosystem_id, postal_code)
  WHERE type = 'EXACT';

CREATE INDEX idx_ecosystem_shipping_zones_ecosystem_id_range
  ON ecosystem_shipping_zones(ecosystem_id, range_start, range_end)
  WHERE type = 'RANGE';

ALTER TABLE ecosystem_shipping_zones
  ADD CONSTRAINT ex_ecosystem_shipping_zones_range_overlap
  EXCLUDE USING gist (
    ecosystem_id WITH =,
    int4range(range_start, range_end, '[]') WITH &&
  )
  WHERE (type = 'RANGE');
