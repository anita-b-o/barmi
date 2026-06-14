CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE INDEX idx_ecosystem_external_products_public_created
  ON ecosystem_external_products(ecosystem_id, is_active, created_at DESC);

CREATE INDEX idx_ecosystem_external_products_public_delivery_created
  ON ecosystem_external_products(ecosystem_id, is_active, delivery_supported, created_at DESC);

CREATE INDEX idx_ecosystem_external_products_public_name_created
  ON ecosystem_external_products(ecosystem_id, is_active, name, created_at DESC);

CREATE INDEX idx_ecosystem_external_products_public_price_created
  ON ecosystem_external_products(ecosystem_id, is_active, price_amount, created_at DESC);

CREATE INDEX idx_ecosystem_external_products_name_trgm
  ON ecosystem_external_products USING gin (ecosystem_id, lower(name) gin_trgm_ops);
