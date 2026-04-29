BEGIN;

-- Reserved demo identifiers. This script is idempotent as long as these IDs/slugs
-- remain owned by the demo dataset.

-- ECOSYSTEM demo
INSERT INTO ecosystems (id, name, slug, is_active, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Demo Ecosystem', 'demo-ecosystem', TRUE, '2026-03-05T09:00:00Z')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    is_active = EXCLUDED.is_active,
    created_at = EXCLUDED.created_at;

-- STORE demo stores
INSERT INTO stores (id, slug, name, is_active, created_at, ecosystem_id, public_location_label, public_latitude, public_longitude, public_category_key)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'demo-store', 'Demo Store Barmi', TRUE, '2026-03-01T10:00:00Z', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'La Plata Centro', -34.920494, -57.953565, 'cafeteria'),
  ('11111111-1111-1111-1111-111111111112', 'casa-roja', 'Casa Roja Market', TRUE, '2026-03-10T10:00:00Z', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Palermo, CABA', -34.588921, -58.430169, 'panaderia'),
  ('11111111-1111-1111-1111-111111111113', 'mercado-centro', 'Mercado Centro', TRUE, '2026-03-15T10:00:00Z', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Caballito, CABA', -34.618347, -58.441338, 'almacen')
ON CONFLICT (id) DO UPDATE
SET slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    created_at = EXCLUDED.created_at,
    ecosystem_id = EXCLUDED.ecosystem_id,
    public_location_label = EXCLUDED.public_location_label,
    public_latitude = EXCLUDED.public_latitude,
    public_longitude = EXCLUDED.public_longitude,
    public_category_key = EXCLUDED.public_category_key;

INSERT INTO store_categories (id, store_id, name, is_active, sort_order, created_at)
VALUES
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Cafeteria', TRUE, 1, '2026-03-01T10:05:00Z'),
  ('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Almacen', TRUE, 2, '2026-03-01T10:06:00Z'),
  ('21111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Listo para comer', TRUE, 3, '2026-03-01T10:07:00Z')
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    created_at = EXCLUDED.created_at;

INSERT INTO products (id, store_id, sku, name, price_cents, stock_quantity, category_id, is_active, created_at)
VALUES
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'CAF-ESP-001', 'Cafe de especialidad 250 g', 6800, 24, '21111111-1111-1111-1111-111111111111', TRUE, '2026-03-01T10:10:00Z'),
  ('31111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'CAF-CRO-001', 'Croissant de manteca', 2200, 18, '21111111-1111-1111-1111-111111111113', TRUE, '2026-03-01T10:11:00Z'),
  ('31111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'ALM-GRA-001', 'Granola con frutos secos 400 g', 5900, 12, '21111111-1111-1111-1111-111111111112', TRUE, '2026-03-01T10:12:00Z'),
  ('31111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'ALM-TE-001', 'Te blend citrus 20 saquitos', 4300, 0, '21111111-1111-1111-1111-111111111112', TRUE, '2026-03-01T10:13:00Z'),
  ('31111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111112', 'CASA-MER-001', 'Mermelada casera de frutos rojos', 5100, 9, NULL, TRUE, '2026-03-10T10:10:00Z'),
  ('31111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111112', 'CASA-PAN-001', 'Pan de masa madre', 3900, 7, NULL, TRUE, '2026-03-10T10:12:00Z'),
  ('31111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111113', 'MERC-SAL-001', 'Salsa pomodoro artesanal', 4700, 14, NULL, TRUE, '2026-03-15T10:10:00Z'),
  ('31111111-1111-1111-1111-111111111118', '11111111-1111-1111-1111-111111111113', 'MERC-ACE-001', 'Aceite de oliva extra virgen 500 ml', 8900, 11, NULL, TRUE, '2026-03-15T10:11:00Z')
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    stock_quantity = EXCLUDED.stock_quantity,
    category_id = EXCLUDED.category_id,
    is_active = EXCLUDED.is_active,
    created_at = EXCLUDED.created_at;

INSERT INTO store_promotions (id, store_id, code, type, value_amount, active, expiration_date, usage_limit, usage_count, created_at)
VALUES
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'CAFE10', 'PERCENTAGE', 10.00, TRUE, '2026-12-31T23:59:59Z', NULL, 0, '2026-03-01T10:20:00Z')
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    code = EXCLUDED.code,
    type = EXCLUDED.type,
    value_amount = EXCLUDED.value_amount,
    active = EXCLUDED.active,
    expiration_date = EXCLUDED.expiration_date,
    usage_limit = EXCLUDED.usage_limit,
    usage_count = EXCLUDED.usage_count,
    created_at = EXCLUDED.created_at;

INSERT INTO store_shipping_zones (id, store_id, type, postal_code, range_start, range_end, cost_amount, currency, created_at)
VALUES
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'EXACT', '1900', NULL, NULL, 1800.00, 'ARS', '2026-03-01T10:25:00Z'),
  ('51111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'RANGE', NULL, 1000, 1999, 2400.00, 'ARS', '2026-03-01T10:26:00Z')
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    type = EXCLUDED.type,
    postal_code = EXCLUDED.postal_code,
    range_start = EXCLUDED.range_start,
    range_end = EXCLUDED.range_end,
    cost_amount = EXCLUDED.cost_amount,
    currency = EXCLUDED.currency,
    created_at = EXCLUDED.created_at;

INSERT INTO ecosystem_external_products (id, ecosystem_id, name, price_amount, currency, is_active, delivery_supported, created_at)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bowl veggie con hummus', 9900.00, 'ARS', TRUE, TRUE, '2026-03-05T09:10:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Combo desayuno urbano', 7600.00, 'ARS', TRUE, TRUE, '2026-03-05T09:11:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kit brunch para dos', 18900.00, 'ARS', TRUE, FALSE, '2026-03-05T09:12:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ensalada Caesar fresh', 8500.00, 'ARS', TRUE, TRUE, '2026-03-05T09:13:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tostado integral premium', 6300.00, 'ARS', TRUE, TRUE, '2026-03-05T09:14:00Z'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Caja snack oficina', 14200.00, 'ARS', TRUE, FALSE, '2026-03-05T09:15:00Z')
ON CONFLICT (id) DO UPDATE
SET ecosystem_id = EXCLUDED.ecosystem_id,
    name = EXCLUDED.name,
    price_amount = EXCLUDED.price_amount,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    delivery_supported = EXCLUDED.delivery_supported,
    created_at = EXCLUDED.created_at;

INSERT INTO ecosystem_promotions (id, ecosystem_id, code, type, value_amount, active, expiration_date, usage_limit, usage_count, created_at)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'URBANO15', 'PERCENTAGE', 15.00, TRUE, '2026-12-31T23:59:59Z', NULL, 0, '2026-03-05T09:20:00Z')
ON CONFLICT (id) DO UPDATE
SET ecosystem_id = EXCLUDED.ecosystem_id,
    code = EXCLUDED.code,
    type = EXCLUDED.type,
    value_amount = EXCLUDED.value_amount,
    active = EXCLUDED.active,
    expiration_date = EXCLUDED.expiration_date,
    usage_limit = EXCLUDED.usage_limit,
    usage_count = EXCLUDED.usage_count,
    created_at = EXCLUDED.created_at;

INSERT INTO ecosystem_shipping_zones (id, ecosystem_id, type, postal_code, range_start, range_end, cost_amount, currency, is_active, created_at)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EXACT', '1900', NULL, NULL, 1500.00, 'ARS', TRUE, '2026-03-05T09:25:00Z'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RANGE', NULL, 1000, 1999, 2200.00, 'ARS', TRUE, '2026-03-05T09:26:00Z')
ON CONFLICT (id) DO UPDATE
SET ecosystem_id = EXCLUDED.ecosystem_id,
    type = EXCLUDED.type,
    postal_code = EXCLUDED.postal_code,
    range_start = EXCLUDED.range_start,
    range_end = EXCLUDED.range_end,
    cost_amount = EXCLUDED.cost_amount,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    created_at = EXCLUDED.created_at;

-- Optional admin login for local review
INSERT INTO users (id, email, password_hash, status, created_at)
VALUES
  ('99999999-9999-9999-9999-999999999999', 'admin@example.com', '$2y$10$8AWeRjWt63ihoQeCb6auZuDrwiEQPlQo12HT68rTd04YVabjAQKCO', 'ACTIVE', '2026-03-01T09:00:00Z')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

INSERT INTO store_members (id, store_id, member_email, role, status, created_at)
VALUES
  ('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@example.com', 'OWNER', 'ACTIVE', '2026-03-01T10:30:00Z')
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    member_email = EXCLUDED.member_email,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

INSERT INTO ecosystem_members (id, user_id, ecosystem_id, role, status, created_at)
VALUES
  ('71111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ECOSYSTEM_ADMIN', 'ACTIVE', '2026-03-05T09:30:00Z')
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    ecosystem_id = EXCLUDED.ecosystem_id,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

COMMIT;
