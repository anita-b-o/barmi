CREATE TABLE store_capabilities (
  id          UUID PRIMARY KEY,
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  capability  TEXT NOT NULL CHECK (capability IN (
    'ABOUT',
    'GALLERY',
    'BLOG',
    'PRODUCTS',
    'RESERVATIONS',
    'PROMOTIONS',
    'SHIPPING',
    'CHECKOUT',
    'CONTACT'
  )),
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, capability)
);

INSERT INTO store_capabilities (
  id,
  store_id,
  capability,
  enabled
)
SELECT
  (md5(random()::text || clock_timestamp()::text || s.id::text || capability.key))::uuid,
  s.id,
  capability.key,
  capability.enabled
FROM stores s
CROSS JOIN (
  VALUES
    ('ABOUT', TRUE),
    ('GALLERY', FALSE),
    ('BLOG', FALSE),
    ('PRODUCTS', TRUE),
    ('RESERVATIONS', FALSE),
    ('PROMOTIONS', TRUE),
    ('SHIPPING', TRUE),
    ('CHECKOUT', TRUE),
    ('CONTACT', TRUE)
) AS capability(key, enabled)
ON CONFLICT (store_id, capability) DO NOTHING;

CREATE OR REPLACE FUNCTION ensure_store_default_capabilities()
RETURNS trigger AS $$
BEGIN
  INSERT INTO store_capabilities (
    id,
    store_id,
    capability,
    enabled
  )
  SELECT
    (md5(random()::text || clock_timestamp()::text || NEW.id::text || capability.key))::uuid,
    NEW.id,
    capability.key,
    capability.enabled
  FROM (
    VALUES
      ('ABOUT', TRUE),
      ('GALLERY', FALSE),
      ('BLOG', FALSE),
      ('PRODUCTS', TRUE),
      ('RESERVATIONS', FALSE),
      ('PROMOTIONS', TRUE),
      ('SHIPPING', TRUE),
      ('CHECKOUT', TRUE),
      ('CONTACT', TRUE)
  ) AS capability(key, enabled)
  ON CONFLICT (store_id, capability) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_ensure_default_capabilities
AFTER INSERT ON stores
FOR EACH ROW
EXECUTE FUNCTION ensure_store_default_capabilities();
