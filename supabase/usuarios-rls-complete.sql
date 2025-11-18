-- ============================================
-- Políticas RLS completas para tabla usuarios
-- Permite a usuarios autenticados gestionar su propio perfil
-- ============================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "read_own_profile" ON usuarios;
DROP POLICY IF EXISTS "update_own_profile" ON usuarios;
DROP POLICY IF EXISTS "insert_own_profile" ON usuarios;
DROP POLICY IF EXISTS "delete_own_profile" ON usuarios;

-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- SELECT: Los usuarios pueden leer su propio perfil
CREATE POLICY "read_own_profile"
ON usuarios
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- INSERT: Los usuarios pueden crear su propio perfil
CREATE POLICY "insert_own_profile"
ON usuarios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Los usuarios pueden actualizar su propio perfil (por ID o por email)
CREATE POLICY "update_own_profile"
ON usuarios
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR
  (auth.email() = email AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  auth.uid() = id OR
  (auth.email() = email AND auth.uid() IS NOT NULL)
);

-- DELETE: Los usuarios pueden eliminar su propio perfil
CREATE POLICY "delete_own_profile"
ON usuarios
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY cmd, policyname;
