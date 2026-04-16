-- Migration: Migrate single `imagen_url` -> array `imagenes_urls` for `productos` (archivado)

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS imagenes_urls TEXT[];

UPDATE productos
SET imagenes_urls = ARRAY[imagen_url]
WHERE imagen_url IS NOT NULL
  AND (
    imagenes_urls IS NULL
    OR cardinality(imagenes_urls) = 0
  );

-- Fin de 2025-11-migrate-imagen_url-to-imagenes_urls.sql (archivado)
