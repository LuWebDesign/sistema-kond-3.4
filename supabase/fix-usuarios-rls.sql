-- ============================================
-- Corregir políticas RLS para tabla usuarios
-- SOLUCIÓN FINAL: Eliminar políticas con recursión
-- ============================================

-- Eliminar las dos políticas de SELECT que causan problemas
DROP POLICY IF EXISTS "Solo admins gestionan usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer su perfil" ON usuarios;

-- Crear UNA ÚNICA política simple sin recursión
CREATE POLICY "read_own_profile"
ON usuarios
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Verificar
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'usuarios' AND cmd = 'SELECT';
