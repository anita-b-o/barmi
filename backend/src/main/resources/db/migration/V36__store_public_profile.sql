ALTER TABLE stores
  ADD COLUMN public_description VARCHAR(1000) NULL,
  ADD COLUMN public_email VARCHAR(160) NULL,
  ADD COLUMN public_phone VARCHAR(160) NULL,
  ADD COLUMN public_whatsapp VARCHAR(160) NULL;
