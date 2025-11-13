-- ============================================
-- Agregar columna config a tabla promociones
-- ============================================
-- Esta columna guarda configuración JSON adicional para promociones
-- Específicamente para buy_x_get_y (buyQuantity, payQuantity)
-- ============================================

-- Agregar columna config de tipo JSONB si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'promociones' 
    AND column_name = 'config'
  ) THEN
    ALTER TABLE promociones ADD COLUMN config JSONB DEFAULT NULL;
    RAISE NOTICE 'Columna config agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna config ya existe';
  END IF;
END $$;

-- Verificar la columna
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'promociones'
AND column_name = 'config';
