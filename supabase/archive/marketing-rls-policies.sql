-- ============================================
-- POLÍTICAS RLS para módulo de marketing (archivado)
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Cualquiera puede leer promociones activas" ON promociones;
DROP POLICY IF EXISTS "Solo admins pueden crear promociones" ON promociones;
DROP POLICY IF EXISTS "Solo admins pueden actualizar promociones" ON promociones;
DROP POLICY IF EXISTS "Solo admins pueden eliminar promociones" ON promociones;
DROP POLICY IF EXISTS "Cualquiera puede leer cupones activos" ON cupones;
DROP POLICY IF EXISTS "Solo admins pueden crear cupones" ON cupones;
DROP POLICY IF EXISTS "Solo admins pueden actualizar cupones" ON cupones;
DROP POLICY IF EXISTS "Solo admins pueden eliminar cupones" ON cupones;

-- Habilitar RLS en las tablas
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;

-- Fin de marketing-rls-policies.sql (archivado)
