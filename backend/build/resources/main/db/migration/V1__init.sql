-- Multi-tenant by store_id (column strategy)

CREATE TABLE stores (
  id            UUID PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id            UUID PRIMARY KEY,
  store_id      UUID NOT NULL REFERENCES stores(id),
  sku           TEXT NOT NULL,
  name          TEXT NOT NULL,
  price_cents   BIGINT NOT NULL CHECK (price_cents >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, sku)
);

-- External products live in ecosystem scope (no store_id)
CREATE TABLE external_products (
  id              UUID PRIMARY KEY,
  provider_id     TEXT NOT NULL,
  provider_sku    TEXT NOT NULL,
  name            TEXT NOT NULL,
  price_cents     BIGINT NOT NULL CHECK (price_cents >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, provider_sku)
);

-- Outbox: 1 event per operation
CREATE TABLE outbox_events (
  event_id        UUID PRIMARY KEY,
  event_type      TEXT NOT NULL,
  scope           TEXT NOT NULL, -- STORE|ECOSYSTEM|RESERVATION
  aggregate_id    UUID,
  payload_json    JSONB NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ NULL
);

-- Idempotency: track processed event ids (webhooks, dispatcher, etc.)
CREATE TABLE processed_events (
  event_id        UUID PRIMARY KEY,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
