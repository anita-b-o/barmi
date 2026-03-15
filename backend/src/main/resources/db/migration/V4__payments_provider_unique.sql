CREATE UNIQUE INDEX ux_payments_provider_payment_id
  ON payments(provider, provider_payment_id);
