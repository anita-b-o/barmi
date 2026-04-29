ALTER TABLE products
    ADD COLUMN stock_quantity BIGINT NOT NULL DEFAULT 999999 CHECK (stock_quantity >= 0);
