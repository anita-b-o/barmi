CREATE TABLE store_orders (
  id               UUID PRIMARY KEY,
  store_id         UUID NOT NULL REFERENCES stores(id),
  status           TEXT NOT NULL,
  currency         TEXT NOT NULL CHECK (char_length(currency) > 0),
  subtotal_amount  NUMERIC(19, 2) NOT NULL CHECK (subtotal_amount >= 0),
  total_amount     NUMERIC(19, 2) NOT NULL CHECK (total_amount >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_orders_store_id ON store_orders(store_id);
CREATE INDEX idx_store_orders_store_id_created_at ON store_orders(store_id, created_at);

CREATE TABLE store_order_items (
  id                UUID PRIMARY KEY,
  order_id          UUID NOT NULL REFERENCES store_orders(id),
  product_id        UUID NOT NULL REFERENCES products(id),
  qty               INT NOT NULL CHECK (qty > 0),
  unit_price_amount NUMERIC(19, 2) NOT NULL CHECK (unit_price_amount >= 0),
  line_total_amount NUMERIC(19, 2) NOT NULL CHECK (line_total_amount >= 0),
  currency          TEXT NOT NULL CHECK (char_length(currency) > 0),
  item_snapshot     JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_order_items_order_id ON store_order_items(order_id);
CREATE INDEX idx_store_order_items_product_id ON store_order_items(product_id);
