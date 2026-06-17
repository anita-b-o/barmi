ALTER TABLE stores
  ADD COLUMN appearance_palette TEXT NOT NULL DEFAULT 'CORAL';

ALTER TABLE stores
  ADD COLUMN appearance_shape TEXT NOT NULL DEFAULT 'ROUNDED';

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_appearance_palette
  CHECK (appearance_palette IN ('CORAL', 'OCEAN', 'FOREST', 'GRAPHITE'));

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_appearance_shape
  CHECK (appearance_shape IN ('SQUARE', 'ROUNDED', 'SOFT'));
