CREATE TABLE users (
  id            UUID PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ecosystem_members (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  ecosystem_id  UUID NOT NULL REFERENCES ecosystems(id),
  role          TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ecosystem_id)
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id),
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
