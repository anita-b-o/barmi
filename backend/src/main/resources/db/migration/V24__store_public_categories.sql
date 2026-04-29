ALTER TABLE stores
    ADD COLUMN public_category_key TEXT NULL;

ALTER TABLE stores
    ADD CONSTRAINT chk_stores_public_category_key
    CHECK (
        public_category_key IS NULL OR public_category_key IN (
            'almacen',
            'panaderia',
            'verduleria',
            'kiosco',
            'carniceria',
            'farmacia',
            'libreria',
            'cafeteria'
        )
    );

CREATE INDEX idx_stores_ecosystem_public_category
    ON stores (ecosystem_id, public_category_key);

UPDATE stores
SET public_category_key = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 'cafeteria'
    WHEN '11111111-1111-1111-1111-111111111112' THEN 'panaderia'
    WHEN '11111111-1111-1111-1111-111111111113' THEN 'almacen'
    ELSE public_category_key
END
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111113'
);
