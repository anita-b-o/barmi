-- H2 test schema (compatible with PostgreSQL mode)

CREATE TABLE stores (
  id            UUID PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id            UUID PRIMARY KEY,
  store_id      UUID NOT NULL REFERENCES stores(id),
  sku           TEXT NOT NULL,
  name          TEXT NOT NULL,
  public_slug   TEXT NOT NULL,
  price_cents   BIGINT NOT NULL CHECK (price_cents >= 0),
  stock_quantity BIGINT NOT NULL DEFAULT 999999,
  category_id    UUID,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (store_id, sku),
  UNIQUE (store_id, public_slug)
);

CREATE TABLE external_products (
  id              UUID PRIMARY KEY,
  provider_id     TEXT NOT NULL,
  provider_sku    TEXT NOT NULL,
  name            TEXT NOT NULL,
  price_cents     BIGINT NOT NULL CHECK (price_cents >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider_id, provider_sku)
);

CREATE TABLE ecosystems (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ecosystem_external_products (
  id                  UUID PRIMARY KEY,
  ecosystem_id        UUID NOT NULL REFERENCES ecosystems(id),
  name                TEXT NOT NULL,
  price_amount        NUMERIC(19, 2) NOT NULL CHECK (price_amount >= 0),
  currency            TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_supported  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ecosystem_promotions (
  id               UUID PRIMARY KEY,
  ecosystem_id     UUID NOT NULL REFERENCES ecosystems(id),
  code             TEXT NOT NULL,
  type             TEXT NOT NULL,
  value_amount     NUMERIC(19, 2) NOT NULL CHECK (value_amount > 0),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  expiration_date  TIMESTAMP NULL,
  usage_limit      BIGINT NULL,
  usage_count      BIGINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_ecosystem_promotions_usage_limit CHECK (usage_limit IS NULL OR usage_limit >= 0),
  UNIQUE (ecosystem_id, code)
);

CREATE TABLE outbox_events (
  event_id        UUID PRIMARY KEY,
  event_type      TEXT NOT NULL,
  scope           TEXT NOT NULL CHECK (scope IN ('STORE', 'ECOSYSTEM')),
  aggregate_id    UUID,
  payload_json    CLOB NOT NULL,
  occurred_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at    TIMESTAMP NULL,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
  attempt_count   INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at      TIMESTAMP NULL,
  claimed_by      TEXT NULL,
  last_attempt_at TIMESTAMP NULL,
  last_error      TEXT NULL,
  failed_at       TIMESTAMP NULL
);

CREATE TABLE processed_events (
  event_id        UUID PRIMARY KEY,
  processed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_email_deliveries (
  idempotency_key TEXT PRIMARY KEY,
  event_id        UUID NOT NULL,
  template        TEXT NOT NULL,
  recipient       TEXT NOT NULL,
  sent_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beta_product_events (
  id              UUID PRIMARY KEY,
  event_name      TEXT NOT NULL,
  event_category  TEXT NOT NULL,
  store_id        UUID NULL REFERENCES stores(id),
  store_slug      TEXT NULL,
  store_name      TEXT NULL,
  ecosystem_slug  TEXT NULL,
  product_id      TEXT NULL,
  search_term     TEXT NULL,
  request_id      TEXT NULL,
  session_id      TEXT NOT NULL,
  route           TEXT NOT NULL,
  release_id      TEXT NOT NULL,
  environment     TEXT NOT NULL,
  metadata_json   CLOB NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMP NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beta_feedback_entries (
  id              UUID PRIMARY KEY,
  category        TEXT NOT NULL,
  score           INTEGER NULL,
  message         TEXT NOT NULL,
  route           TEXT NOT NULL,
  store_id        UUID NULL REFERENCES stores(id),
  store_slug      TEXT NULL,
  ecosystem_slug  TEXT NULL,
  request_id      TEXT NULL,
  session_id      TEXT NOT NULL,
  release_id      TEXT NOT NULL,
  environment     TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saas_plans (
  id                  UUID PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  description         TEXT NULL,
  max_products        INTEGER NOT NULL CHECK (max_products >= 0),
  analytics_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  seo_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saas_subscriptions (
  id                  UUID PRIMARY KEY,
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES saas_plans(id),
  status              TEXT NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED')),
  started_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

ALTER TABLE stores
  ADD COLUMN ecosystem_id UUID NULL REFERENCES ecosystems(id);

ALTER TABLE stores
  ADD COLUMN public_location_label TEXT NULL;

ALTER TABLE stores
  ADD COLUMN public_latitude NUMERIC(9, 6) NULL;

ALTER TABLE stores
  ADD COLUMN public_longitude NUMERIC(9, 6) NULL;

ALTER TABLE stores
  ADD COLUMN public_category_key TEXT NULL;

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_public_coordinates
  CHECK (
    (public_latitude IS NULL AND public_longitude IS NULL)
    OR (public_latitude IS NOT NULL AND public_longitude IS NOT NULL)
  );

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_public_category_key
  CHECK (
    public_category_key IS NULL OR public_category_key IN (
      'almacen',
      'panaderia',
      'verduleria',
      'kiosco',
      'carniceria',
      'farmacia',
      'libreria',
      'cafeteria'
    )
  );
