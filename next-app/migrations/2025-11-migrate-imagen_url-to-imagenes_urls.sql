-- Migración: copiar `imagen_url` a `imagenes_urls` (array) y verificación
-- Fecha: 2025-11-22
-- Instrucciones: ejecutar en Supabase SQL Editor.

-- 0) Recomendación: revisar antes de ejecutar en producción. Se recomienda ejecutar en un entorno de staging primero.

-- 1) BACKUP: crear tabla de respaldo (estructura + datos).
CREATE TABLE IF NOT EXISTS productos_backup (LIKE productos INCLUDING ALL);

-- Insertar solo filas no duplicadas en el backup (evita duplicar si ejecutas varias veces)
INSERT INTO productos_backup
SELECT * FROM productos p
WHERE NOT EXISTS (
  SELECT 1 FROM productos_backup b WHERE b.id = p.id
);

-- 2) Asegurar columna array `imagenes_urls` existe
-- Usar bloque DO para evitar errores si la versión de Postgres no soporta
-- ADD COLUMN IF NOT EXISTS o si la columna ya existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'imagenes_urls'
  ) THEN
    EXECUTE 'ALTER TABLE productos ADD COLUMN imagenes_urls text[] DEFAULT ''{}''';
  END IF;
END
$$;

-- 3) Migración: copiar valores no nulos de `imagen_url` a `imagenes_urls`
-- Solo afecta filas donde `imagenes_urls` está vacía o NULL.
UPDATE productos
SET imagenes_urls = ARRAY[imagen_url]
WHERE imagen_url IS NOT NULL
  AND (imagenes_urls IS NULL OR array_length(imagenes_urls, 1) = 0);

-- 4) Verificaciones útiles (ejecutar manualmente después del UPDATE):
-- Mostrar ejemplos donde hay valores en cualquiera de las columnas
SELECT id, imagen_url, imagenes_urls
FROM productos
WHERE imagen_url IS NOT NULL
   OR (imagenes_urls IS NOT NULL AND array_length(imagenes_urls,1) > 0)
LIMIT 200;

-- Filas que NO tienen imágenes en la nueva columna (posible contenido faltante)
SELECT id
FROM productos
WHERE imagenes_urls IS NULL OR array_length(imagenes_urls,1) = 0
LIMIT 200;

-- Comprobar un producto concreto (reemplaza <ID> antes de ejecutar)
-- SELECT id, imagen_url, imagenes_urls FROM productos WHERE id = <ID>;

-- 5) (OPCIONAL) DROP COLUMN `imagen_url`
-- Ejecutar SOLO cuando verifiques que todo funciona y tengas backup.
-- Descomenta la siguiente línea para eliminar la columna.
-- ALTER TABLE productos DROP COLUMN IF EXISTS imagen_url;

-- 6) ROLLBACK en caso de emergencia (ejemplo: restaurar tabla desde backup)
-- Puedes restaurar filas o la tabla completa desde `productos_backup` si es necesario.
-- Ejemplo de restauración completa (sobrescribe datos actuales):
-- BEGIN;
-- TRUNCATE TABLE productos RESTART IDENTITY;
-- INSERT INTO productos SELECT * FROM productos_backup;
-- COMMIT;

-- Fin del script de migración.
