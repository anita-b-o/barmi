CREATE TABLE payments (
  id                   UUID PRIMARY KEY,
  scope                TEXT NOT NULL,
  operation_id         UUID NOT NULL,
  provider             TEXT NOT NULL,
  provider_payment_id  TEXT NOT NULL,
  status               TEXT NOT NULL,
  amount               NUMERIC(19, 2) NOT NULL CHECK (amount >= 0),
  currency             TEXT NOT NULL CHECK (char_length(currency) > 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at         TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX ux_payments_confirmed_scope_operation
  ON payments(scope, operation_id)
  WHERE status = 'CONFIRMED';
