CREATE TABLE payment_intents (
  id                     UUID PRIMARY KEY,
  scope                  TEXT NOT NULL,
  store_order_id         UUID NULL,
  store_id               UUID NULL,
  ecosystem_order_id     UUID NULL,
  ecosystem_id           UUID NULL,
  provider               TEXT NOT NULL,
  status                 TEXT NOT NULL,
  amount                 NUMERIC(19, 2) NOT NULL CHECK (amount >= 0),
  currency               TEXT NOT NULL CHECK (char_length(currency) > 0),
  provider_preference_id TEXT NULL,
  checkout_url           TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NULL,
  CONSTRAINT chk_payment_intents_scope_order
    CHECK (
      (scope = 'STORE' AND store_order_id IS NOT NULL AND store_id IS NOT NULL AND ecosystem_order_id IS NULL AND ecosystem_id IS NULL)
      OR (scope = 'ECOSYSTEM' AND ecosystem_order_id IS NOT NULL AND ecosystem_id IS NOT NULL AND store_order_id IS NULL AND store_id IS NULL)
    )
);

CREATE UNIQUE INDEX ux_payment_intents_store_pending
  ON payment_intents(store_order_id, provider)
  WHERE scope = 'STORE' AND status = 'PENDING';

CREATE UNIQUE INDEX ux_payment_intents_ecosystem_pending
  ON payment_intents(ecosystem_order_id, provider)
  WHERE scope = 'ECOSYSTEM' AND status = 'PENDING';
