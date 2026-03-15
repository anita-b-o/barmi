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
