-- ============================================
-- POLÍTICAS RLS PARA TABLA PROMOCIONES
-- ============================================
-- Estas políticas permiten a usuarios autenticados
-- gestionar promociones, mientras mantienen
-- acceso público de solo lectura
-- ============================================

-- 1. Habilitar RLS en la tabla (si no está habilitado)
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Permitir lectura pública de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir inserción autenticada de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir actualización autenticada de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir eliminación autenticada de promociones" ON promociones;
DROP POLICY IF EXISTS "Permitir todas las operaciones a usuarios autenticados" ON promociones;

-- 3. Crear nueva política: lectura pública
CREATE POLICY "Permitir lectura pública de promociones"
ON promociones
FOR SELECT
USING (true);

-- 4. Crear políticas para usuarios autenticados
-- Opción A: Permitir TODAS las operaciones a usuarios autenticados
CREATE POLICY "Permitir todas las operaciones a usuarios autenticados"
ON promociones
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'promociones';

-- ============================================
-- NOTA IMPORTANTE:
-- Si el error persiste, verifica que:
-- 1. El usuario esté correctamente autenticado en tu app
-- 2. El token JWT sea válido y no haya expirado
-- 3. La conexión a Supabase use las credenciales correctas
-- ============================================
