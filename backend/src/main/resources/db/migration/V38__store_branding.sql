ALTER TABLE stores
  ADD COLUMN logo_url VARCHAR(500) NULL,
  ADD COLUMN banner_url VARCHAR(500) NULL,
  ADD COLUMN primary_color VARCHAR(7) NOT NULL DEFAULT '#F65F55',
  ADD COLUMN secondary_color VARCHAR(7) NOT NULL DEFAULT '#E5544A';

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_primary_color_hex
  CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_secondary_color_hex
  CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$');
