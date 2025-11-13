-- ============================================
-- CONFIGURACIÓN COMPLETA PARA TABLA PROMOCIONES
-- ============================================
-- Este script realiza:
-- 1. Agrega columna config (JSONB)
-- 2. Configura políticas RLS
-- ============================================

-- PASO 1: Agregar columna config de tipo JSONB si no existe
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'promociones' 
    AND column_name = 'config'
  ) THEN
    ALTER TABLE promociones ADD COLUMN config JSONB DEFAULT NULL;
    RAISE NOTICE '✅ Columna config agregada exitosamente';
  ELSE
    RAISE NOTICE '✓ La columna config ya existe';
  END IF;
END $$;

-- PASO 2: Configurar Row Level Security (RLS)
-- ============================================

-- Habilitar RLS en la tabla
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Permitir lectura pública de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir inserción autenticada de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir actualización autenticada de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir eliminación autenticada de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir todas las operaciones a usuarios autenticados" ON promociones;

-- Crear política: lectura pública (cualquiera puede ver promociones)
CREATE POLICY "Permitir lectura pública de promociones"
ON promociones
FOR SELECT
USING (true);

-- Crear política: todas las operaciones para usuarios autenticados
CREATE POLICY "Permitir todas las operaciones a usuarios autenticados"
ON promociones
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar columna config
SELECT 
  '✓ Columna config' as estado,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'promociones'
AND column_name = 'config';

-- Verificar políticas RLS
SELECT 
  '✓ Políticas RLS' as estado,
  policyname as nombre_politica,
  cmd as operacion,
  CASE 
    WHEN qual::text LIKE '%auth.role%' THEN 'Solo autenticados'
    WHEN qual::text = 'true' THEN 'Público'
    ELSE 'Otra condición'
  END as acceso
FROM pg_policies
WHERE tablename = 'promociones'
ORDER BY policyname;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Columna config (JSONB) agregada
-- ✅ 2 políticas RLS configuradas:
--    1. Lectura pública
--    2. Todas las operaciones para autenticados
-- ============================================
