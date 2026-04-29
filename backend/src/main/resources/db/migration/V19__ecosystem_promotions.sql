CREATE TABLE ecosystem_promotions (
  id                 UUID PRIMARY KEY,
  ecosystem_id       UUID NOT NULL REFERENCES ecosystems(id),
  code               TEXT NOT NULL,
  type               TEXT NOT NULL,
  value_amount       NUMERIC(19, 2) NOT NULL CHECK (value_amount > 0),
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  expiration_date    TIMESTAMPTZ,
  usage_limit        BIGINT,
  usage_count        BIGINT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ecosystem_promotions_usage_limit CHECK (usage_limit IS NULL OR usage_limit >= 0)
);

CREATE UNIQUE INDEX uq_ecosystem_promotions_ecosystem_code ON ecosystem_promotions(ecosystem_id, code);
CREATE INDEX idx_ecosystem_promotions_ecosystem_id_created_at ON ecosystem_promotions(ecosystem_id, created_at);

ALTER TABLE ecosystem_orders
  ADD COLUMN original_amount NUMERIC(19, 2) NOT NULL DEFAULT 0 CHECK (original_amount >= 0),
  ADD COLUMN discount_amount NUMERIC(19, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN applied_promotion_id UUID NULL REFERENCES ecosystem_promotions(id),
  ADD COLUMN applied_coupon_code TEXT NULL,
  ADD COLUMN promotion_consumed_at TIMESTAMPTZ NULL;

UPDATE ecosystem_orders
SET original_amount = total_amount,
    discount_amount = 0
WHERE original_amount = 0;
