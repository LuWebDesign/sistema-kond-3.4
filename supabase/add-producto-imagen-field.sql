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

UPDATE pedidos_catalogo_items pci
SET producto_imagen = p.imagen_url
FROM productos p
WHERE pci.producto_id = p.id
  AND (pci.producto_imagen IS NULL OR pci.producto_imagen = '');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Consulta para verificar items con su imagen
-- SELECT id, producto_nombre, producto_imagen FROM pedidos_catalogo_items LIMIT 10;
