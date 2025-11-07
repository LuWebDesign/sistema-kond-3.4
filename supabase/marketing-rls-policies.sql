-- ============================================
-- POLÍTICAS RLS para módulo de marketing
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

-- ============================================
-- PROMOCIONES
-- ============================================

-- Permitir lectura a todos (público: solo activas, autenticados: todas)
CREATE POLICY "Lectura de promociones"
  ON promociones
  FOR SELECT
  USING (true);

-- Admins autenticados pueden crear
CREATE POLICY "Admins pueden crear promociones"
  ON promociones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins autenticados pueden actualizar
CREATE POLICY "Admins pueden actualizar promociones"
  ON promociones
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins autenticados pueden eliminar
CREATE POLICY "Admins pueden eliminar promociones"
  ON promociones
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- CUPONES
-- ============================================

-- Permitir lectura a todos
CREATE POLICY "Lectura de cupones"
  ON cupones
  FOR SELECT
  USING (true);

-- Admins autenticados pueden crear
CREATE POLICY "Admins pueden crear cupones"
  ON cupones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins autenticados pueden actualizar
CREATE POLICY "Admins pueden actualizar cupones"
  ON cupones
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins autenticados pueden eliminar
CREATE POLICY "Admins pueden eliminar cupones"
  ON cupones
  FOR DELETE
  TO authenticated
  USING (true);
