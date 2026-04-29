ALTER TABLE stores
    ADD COLUMN public_location_label TEXT NULL,
    ADD COLUMN public_latitude NUMERIC(9, 6) NULL,
    ADD COLUMN public_longitude NUMERIC(9, 6) NULL;

ALTER TABLE stores
    ADD CONSTRAINT chk_stores_public_coordinates
    CHECK (
        (public_latitude IS NULL AND public_longitude IS NULL)
        OR (public_latitude IS NOT NULL AND public_longitude IS NOT NULL)
    );
