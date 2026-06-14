CREATE TABLE saas_plans (
  id                  UUID PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  description         TEXT NULL,
  max_products        INTEGER NOT NULL CHECK (max_products >= 0),
  analytics_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  seo_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saas_subscriptions (
  id                  UUID PRIMARY KEY,
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES saas_plans(id),
  status              TEXT NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id)
);

CREATE INDEX idx_saas_subscriptions_plan_id ON saas_subscriptions(plan_id);

INSERT INTO saas_plans (
  id,
  code,
  name,
  active,
  description,
  max_products,
  analytics_enabled,
  seo_enabled
) VALUES (
  '00000000-0000-0000-0000-000000000034',
  'FREE',
  'Free',
  TRUE,
  'Default free plan for new stores',
  50,
  FALSE,
  FALSE
);

INSERT INTO saas_subscriptions (
  id,
  store_id,
  plan_id,
  status,
  started_at
)
SELECT
  (md5(random()::text || clock_timestamp()::text || s.id::text))::uuid,
  s.id,
  '00000000-0000-0000-0000-000000000034',
  'ACTIVE',
  NOW()
FROM stores s
WHERE NOT EXISTS (
  SELECT 1
  FROM saas_subscriptions ss
  WHERE ss.store_id = s.id
);

CREATE OR REPLACE FUNCTION ensure_store_saas_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO saas_subscriptions (
    id,
    store_id,
    plan_id,
    status,
    started_at
  )
  SELECT
    (md5(random()::text || clock_timestamp()::text || NEW.id::text))::uuid,
    NEW.id,
    p.id,
    'ACTIVE',
    NOW()
  FROM saas_plans p
  WHERE p.code = 'FREE'
  ON CONFLICT (store_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_ensure_saas_subscription
AFTER INSERT ON stores
FOR EACH ROW
EXECUTE FUNCTION ensure_store_saas_subscription();
