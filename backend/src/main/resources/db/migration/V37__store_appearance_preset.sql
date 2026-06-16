ALTER TABLE stores
  ADD COLUMN appearance_preset TEXT NOT NULL DEFAULT 'MODERN';

ALTER TABLE stores
  ADD CONSTRAINT chk_stores_appearance_preset
  CHECK (appearance_preset IN ('MODERN', 'CLASSIC', 'LOCAL_BUSINESS', 'PORTFOLIO'));
