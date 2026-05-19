UPDATE ecosystems
SET name = 'Distrito Barmi'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND slug = 'demo-ecosystem';

UPDATE stores
SET name = CASE id
    WHEN '11111111-1111-1111-1111-111111111111' THEN 'Cafe del Parque'
    WHEN '11111111-1111-1111-1111-111111111112' THEN 'Casa Roja Market'
    WHEN '11111111-1111-1111-1111-111111111113' THEN 'Mercado Centro'
    ELSE name
END
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111113'
);
