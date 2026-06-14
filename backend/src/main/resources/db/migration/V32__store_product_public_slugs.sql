ALTER TABLE products
  ADD COLUMN public_slug TEXT NULL;

WITH normalized AS (
  SELECT
    id,
    store_id,
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(
            lower(translate(
              name,
              'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
              'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC'
            )),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '(^-+|-+$)',
          '',
          'g'
        ),
        ''
      ),
      'product'
    ) AS base_slug
  FROM products
),
ranked AS (
  SELECT
    id,
    base_slug,
    COUNT(*) OVER (PARTITION BY store_id, base_slug) AS duplicate_count,
    ROW_NUMBER() OVER (PARTITION BY store_id, base_slug ORDER BY id) AS duplicate_rank
  FROM normalized
)
UPDATE products p
SET public_slug = CASE
  WHEN ranked.duplicate_count = 1 THEN ranked.base_slug
  WHEN ranked.duplicate_rank = 1 THEN ranked.base_slug
  ELSE ranked.base_slug || '-' || right(replace(p.id::text, '-', ''), 12)
END
FROM ranked
WHERE ranked.id = p.id;

ALTER TABLE products
  ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX ux_products_store_public_slug
  ON products(store_id, public_slug);
