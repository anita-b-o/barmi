ALTER TABLE stores
    ADD COLUMN ecosystem_id UUID NULL REFERENCES ecosystems(id);

CREATE INDEX idx_stores_ecosystem_id ON stores (ecosystem_id);
