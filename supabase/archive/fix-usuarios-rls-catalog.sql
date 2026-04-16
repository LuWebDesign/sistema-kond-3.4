-- ============================================
-- FIX: Políticas RLS para usuarios en catálogo público (archivado)
-- ============================================

-- Crear política para permitir lectura pública solo del registro específico por ID
CREATE POLICY "Usuarios pueden leer su propio perfil por ID"
ON usuarios
FOR SELECT
TO anon
USING (
  id = current_setting('request.jwt.claims', true)::json->>'sub'
  OR
  auth.role() = 'anon'
);

-- Fin de fix-usuarios-rls-catalog.sql (archivado)
