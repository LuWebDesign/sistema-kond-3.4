-- ============================================
-- SCRIPT DE LIMPIEZA Y REAPLICACIÓN DE POLÍTICAS
-- Ejecutar COMPLETO en Supabase SQL Editor
-- ============================================

-- PASO 1: Eliminar TODAS las políticas de usuarios
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'usuarios'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON usuarios', pol.policyname);
        RAISE NOTICE 'Política eliminada: %', pol.policyname;
    END LOOP;
END $$;

-- PASO 2: Verificar que RLS está habilitado
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- PASO 3: Crear políticas nuevas

-- SELECT: Acceso público (necesario para login con anon key)
CREATE POLICY "select_usuarios_public"
ON usuarios
FOR SELECT
TO PUBLIC
USING (true);

-- INSERT: Crear nuevos usuarios (registro público)
CREATE POLICY "insert_usuarios_publico"
ON usuarios
FOR INSERT
TO PUBLIC
WITH CHECK (true);

-- UPDATE: Solo el propio usuario puede actualizar sus datos
CREATE POLICY "update_usuarios_own"
ON usuarios
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASO 4: Verificación
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'usuarios';
    
    RAISE NOTICE '✅ Total de políticas creadas: %', policy_count;
    
    IF policy_count < 3 THEN
        RAISE WARNING '⚠️  Se esperaban 3 políticas pero se encontraron %', policy_count;
    END IF;
END $$;

-- Listar políticas creadas
SELECT 
    policyname as "Política",
    cmd as "Comando",
    roles as "Roles",
    permissive as "Permisiva"
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;
