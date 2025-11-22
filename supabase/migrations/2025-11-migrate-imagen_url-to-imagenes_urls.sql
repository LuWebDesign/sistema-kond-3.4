-- Migration: Migrate single `imagen_url` -> array `imagenes_urls` for `productos`
-- Location: supabase/migrations/2025-11-migrate-imagen_url-to-imagenes_urls.sql
-- Generated: 2025-11-22
-- Run this file in Supabase SQL Editor. It's idempotent and includes verification queries.

-- Runbook (summary):
-- 1) Revisar y ejecutar este script en el SQL Editor de Supabase (ambiente staging primero).
-- 2) Verificar que `productos_backup` se creó y que `imagenes_urls` se pobló correctamente.
-- 3) Si todo está bien, opcionalmente ejecutar la sentencia DROP (comentada al final) para remover la columna legacy `imagen_url`.

-- WARNING: Hacer backup de la DB o ejecutar en staging antes de producción.

-- =====================================================
-- 1) Crear respaldo (productos_backup) si no existe
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'productos_backup'
  ) THEN
    EXECUTE 'CREATE TABLE productos_backup AS SELECT * FROM productos';
    RAISE NOTICE 'productos_backup created';
  ELSE
    RAISE NOTICE 'productos_backup already exists, skipping creation';
  END IF;
END$$;

-- =====================================================
-- 2) Asegurar columna `imagenes_urls` (idempotente)
-- =====================================================
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS imagenes_urls TEXT[];

-- Comentario descriptivo
COMMENT ON COLUMN productos.imagenes_urls IS 'Array de URLs públicas de las imágenes del producto (ordenadas preferentemente)';

-- =====================================================
-- 3) Migrar datos desde `imagen_url` a `imagenes_urls` cuando corresponda
--    Sólo afecta filas donde `imagen_url` existe y `imagenes_urls` esté vacío o NULL.
-- =====================================================
UPDATE productos
SET imagenes_urls = ARRAY[imagen_url]
WHERE imagen_url IS NOT NULL
  AND (
    imagenes_urls IS NULL
    OR cardinality(imagenes_urls) = 0
  );

-- =====================================================
-- 4) Verificaciones recomendadas
-- =====================================================
-- Cuántas filas aún tienen imagen_url no nulo
SELECT COUNT(*) AS filas_con_imagen_url FROM productos WHERE imagen_url IS NOT NULL;

-- Cuántas filas ahora tienen imagenes_urls poblado
SELECT COUNT(*) AS filas_con_imagenes_urls FROM productos WHERE imagenes_urls IS NOT NULL AND cardinality(imagenes_urls) > 0;

-- Mostrar algunas filas para revisión manual (primeras 20)
SELECT id, imagen_url, imagenes_urls
FROM productos
ORDER BY id
LIMIT 20;

-- =====================================================
-- 5) Opcional: eliminar columna legacy `imagen_url`
-- =====================================================
-- Ejecutar MANUALMENTE sólo después de verificar que `imagenes_urls` contiene las URLs correctas
-- ALTER TABLE productos DROP COLUMN IF EXISTS imagen_url;

-- Fin de migración
