-- ============================================
-- MIGRACIÓN: Agregar campos faltantes a productos
-- ============================================

-- Agregar campos que faltan en la tabla productos
ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS material_id INTEGER,
  ADD COLUMN IF NOT EXISTS material VARCHAR(255),
  ADD COLUMN IF NOT EXISTS margen_material NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_promos NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidades INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ensamble VARCHAR(100) DEFAULT 'Sin ensamble',
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Comentarios sobre los campos
COMMENT ON COLUMN productos.material_id IS 'ID del material asociado (si aplica)';
COMMENT ON COLUMN productos.material IS 'Nombre del material';
COMMENT ON COLUMN productos.margen_material IS 'Margen de ganancia sobre el material';
COMMENT ON COLUMN productos.precio_unitario IS 'Precio unitario base del producto';
COMMENT ON COLUMN productos.precio_promos IS 'Precio con promociones aplicadas';
COMMENT ON COLUMN productos.unidades IS 'Cantidad de unidades en stock';
COMMENT ON COLUMN productos.ensamble IS 'Tipo de ensamble requerido';
COMMENT ON COLUMN productos.active IS 'Indica si el producto está activo/visible';
