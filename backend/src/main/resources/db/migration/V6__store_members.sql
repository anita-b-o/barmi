CREATE TABLE store_members (
  id            UUID PRIMARY KEY,
  store_id      UUID NOT NULL REFERENCES stores(id),
  member_email  TEXT NOT NULL,
  role          TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_store_members_store_id_email
  ON store_members(store_id, member_email);

CREATE INDEX idx_store_members_store_id
  ON store_members(store_id);

CREATE INDEX idx_store_members_store_id_role
  ON store_members(store_id, role);

CREATE INDEX idx_store_members_store_id_status
  ON store_members(store_id, status);
