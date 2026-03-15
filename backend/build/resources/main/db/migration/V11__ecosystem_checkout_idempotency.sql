ALTER TABLE ecosystem_orders
  ADD COLUMN client_reference_id TEXT NULL;

CREATE UNIQUE INDEX ux_ecosystem_orders_client_ref_pending
  ON ecosystem_orders(ecosystem_id, client_reference_id)
  WHERE client_reference_id IS NOT NULL AND status = 'PENDING_PAYMENT';
