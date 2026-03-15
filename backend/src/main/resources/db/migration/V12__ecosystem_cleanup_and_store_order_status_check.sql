DROP INDEX IF EXISTS ux_ecosystem_orders_client_ref_pending;

ALTER TABLE ecosystem_orders
  DROP COLUMN IF EXISTS client_reference_id;

ALTER TABLE store_orders
  ADD CONSTRAINT chk_store_orders_status
  CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED'));
