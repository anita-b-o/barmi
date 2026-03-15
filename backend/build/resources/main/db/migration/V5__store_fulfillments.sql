CREATE TABLE store_fulfillments (
  id             UUID PRIMARY KEY,
  store_order_id UUID NOT NULL REFERENCES store_orders(id),
  store_id       UUID NOT NULL REFERENCES stores(id),
  method         TEXT NOT NULL,
  status         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_store_fulfillments_store_order_id
  ON store_fulfillments(store_order_id);

CREATE INDEX idx_store_fulfillments_store_id
  ON store_fulfillments(store_id);

CREATE INDEX idx_store_fulfillments_store_id_status
  ON store_fulfillments(store_id, status);
