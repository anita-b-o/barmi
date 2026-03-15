CREATE TABLE ecosystem_fulfillments (
  id                  UUID PRIMARY KEY,
  ecosystem_order_id  UUID NOT NULL REFERENCES ecosystem_orders(id),
  ecosystem_id        UUID NOT NULL REFERENCES ecosystems(id),
  method              TEXT NOT NULL,
  status              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('PENDING','DISPATCHED','DELIVERED','CANCELLED'))
);

CREATE UNIQUE INDEX ux_ecosystem_fulfillments_order_id
  ON ecosystem_fulfillments(ecosystem_order_id);

CREATE INDEX idx_ecosystem_fulfillments_ecosystem_id
  ON ecosystem_fulfillments(ecosystem_id);

CREATE INDEX idx_ecosystem_fulfillments_ecosystem_id_status
  ON ecosystem_fulfillments(ecosystem_id, status);

CREATE INDEX idx_outbox_unpublished
  ON outbox_events(published_at)
  WHERE published_at IS NULL;
