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
    metadata_json   TEXT NOT NULL DEFAULT '{}',
    occurred_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beta_product_events_event_name ON beta_product_events (event_name);
CREATE INDEX idx_beta_product_events_store_id ON beta_product_events (store_id);
CREATE INDEX idx_beta_product_events_ecosystem_slug ON beta_product_events (ecosystem_slug);
CREATE INDEX idx_beta_product_events_search_term ON beta_product_events (search_term);
CREATE INDEX idx_beta_product_events_occurred_at ON beta_product_events (occurred_at DESC);

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
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beta_feedback_entries_created_at ON beta_feedback_entries (created_at DESC);
CREATE INDEX idx_beta_feedback_entries_category ON beta_feedback_entries (category);
