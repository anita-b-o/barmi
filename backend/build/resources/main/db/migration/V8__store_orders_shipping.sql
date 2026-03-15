ALTER TABLE store_orders
  ADD COLUMN shipping_cost_amount NUMERIC(19, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost_amount >= 0),
  ADD COLUMN shipping_currency TEXT NOT NULL DEFAULT '',
  ADD COLUMN shipping_zone_id UUID NULL,
  ADD COLUMN shipping_postal_code TEXT NULL;

ALTER TABLE store_orders
  ADD CONSTRAINT chk_store_orders_shipping_snapshot
  CHECK (
    shipping_cost_amount = 0
    OR (shipping_zone_id IS NOT NULL AND shipping_postal_code IS NOT NULL)
  );
