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
  price_cents   BIGINT NOT NULL CHECK (price_cents >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (store_id, sku)
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
  scope           TEXT NOT NULL,
  aggregate_id    UUID,
  payload_json    CLOB NOT NULL,
  occurred_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at    TIMESTAMP NULL
);

CREATE TABLE processed_events (
  event_id        UUID PRIMARY KEY,
  processed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
