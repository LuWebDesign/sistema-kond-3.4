-- ============================================
-- MIGRACIÓN: Agregar campo stock a productos
-- ============================================
-- Este campo permite rastrear el inventario disponible
-- y se descuenta automáticamente al realizar pedidos

-- Agregar columna stock si no existe
ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Comentario descriptivo
COMMENT ON COLUMN productos.stock IS 'Cantidad de unidades disponibles en inventario. Se descuenta automáticamente al crear pedidos del catálogo.';

-- Índice para mejorar consultas de productos con stock disponible
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock) WHERE stock > 0;

-- Actualizar productos existentes con stock inicial si es necesario
-- (Opcional: establecer un stock inicial basado en el campo unidades si existe)
UPDATE productos 
SET stock = COALESCE(unidades, 0) 
WHERE stock = 0 AND unidades IS NOT NULL AND unidades > 0;

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Permitir a todos los usuarios leer el stock (público)
-- Solo administradores pueden modificar el stock

-- Drop existing policies if any
DROP POLICY IF EXISTS "Permitir lectura de stock a todos" ON productos;
DROP POLICY IF EXISTS "Permitir actualización de stock solo a admins" ON productos;

-- Policy para lectura (público puede ver stock)
CREATE POLICY "Permitir lectura de stock a todos"
  ON productos
  FOR SELECT
  USING (true);

-- Policy para actualización (solo admins)
CREATE POLICY "Permitir actualización de stock solo a admins"
  ON productos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- FUNCIÓN AUXILIAR: Descontar stock
-- ============================================
-- Esta función puede usarse para operaciones batch o desde triggers

CREATE OR REPLACE FUNCTION descontar_stock_producto(
  p_producto_id INTEGER,
  p_cantidad INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_stock_actual INTEGER;
  v_nuevo_stock INTEGER;
BEGIN
  -- Obtener stock actual
  SELECT stock INTO v_stock_actual
  FROM productos
  WHERE id = p_producto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto % no encontrado', p_producto_id;
  END IF;

  -- Calcular nuevo stock (mínimo 0)
  v_nuevo_stock := GREATEST(0, v_stock_actual - p_cantidad);

  -- Actualizar stock
  UPDATE productos
  SET stock = v_nuevo_stock
  WHERE id = p_producto_id;

  RETURN v_nuevo_stock;
END;
$$ LANGUAGE plpgsql;

-- Comentario sobre la función
COMMENT ON FUNCTION descontar_stock_producto IS 'Descuenta una cantidad del stock de un producto, asegurando que nunca sea negativo';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Consulta para verificar productos con su stock
-- SELECT id, nombre, stock, publicado FROM productos ORDER BY stock ASC LIMIT 10;
