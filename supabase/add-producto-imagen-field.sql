-- ============================================
-- MIGRACIÓN: Agregar campo producto_imagen a pedidos_catalogo_items
-- ============================================
-- Este campo permite guardar la URL de la imagen del producto
-- para mostrarla en vistas previas sin tener que buscarla en productos

-- Agregar columna producto_imagen si no existe
ALTER TABLE pedidos_catalogo_items 
  ADD COLUMN IF NOT EXISTS producto_imagen TEXT;

-- Comentario descriptivo
COMMENT ON COLUMN pedidos_catalogo_items.producto_imagen IS 'URL o dataURL de la imagen del producto para vista previa rápida';

-- ============================================
-- MIGRAR DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- Actualizar pedidos existentes con las imágenes desde la tabla productos
-- Solo si quieres llenar los registros históricos

-- Preferir la primera URL en `imagenes_urls`; si no existe usar `imagen_url` como fallback.
UPDATE pedidos_catalogo_items pci
SET producto_imagen = COALESCE(
  -- Postgres arrays son 1-based; p.imagenes_urls[1] devuelve la primera URL si existe
  (CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'imagenes_urls') > 0
        THEN p.imagenes_urls[1]
        ELSE NULL END),
  p.imagen_url
)
FROM productos p
WHERE pci.producto_id = p.id
  AND (pci.producto_imagen IS NULL OR pci.producto_imagen = '');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Consulta para verificar items con su imagen
-- SELECT id, producto_nombre, producto_imagen FROM pedidos_catalogo_items LIMIT 10;
