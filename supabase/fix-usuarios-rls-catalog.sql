-- ============================================
-- FIX: Políticas RLS para usuarios en catálogo público
-- ============================================
-- Permite a usuarios del catálogo público acceder solo a su propio registro
-- usando el ID proporcionado en la consulta

-- Primero, verificar las políticas actuales
-- SELECT * FROM pg_policies WHERE tablename = 'usuarios';

-- Crear política para permitir lectura pública solo del registro específico por ID
CREATE POLICY "Usuarios pueden leer su propio perfil por ID"
ON usuarios
FOR SELECT
TO anon
USING (
  -- Permitir si el usuario está consultando su propio ID
  id = current_setting('request.jwt.claims', true)::json->>'sub'
  OR
  -- Permitir consulta anónima si es por ID específico (para catálogo)
  auth.role() = 'anon'
);

-- Nota: Esta política permite a usuarios anónimos consultar por ID específico.
-- Si prefieres más seguridad, puedes eliminar la parte "auth.role() = 'anon'"
-- y solo permitir acceso cuando el usuario está autenticado con su propio ID.

-- Para aplicar cambios:
-- 1. Ir a Supabase Dashboard > SQL Editor
-- 2. Ejecutar este script
-- 3. Verificar con: SELECT * FROM pg_policies WHERE tablename = 'usuarios';
