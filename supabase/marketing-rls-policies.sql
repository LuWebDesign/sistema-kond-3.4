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

-- Permitir lectura pública de promociones activas (para el catálogo)
CREATE POLICY "Cualquiera puede leer promociones activas"
  ON promociones
  FOR SELECT
  USING (activo = true);

-- Solo admins pueden crear promociones
CREATE POLICY "Solo admins pueden crear promociones"
  ON promociones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden actualizar promociones
CREATE POLICY "Solo admins pueden actualizar promociones"
  ON promociones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden eliminar promociones
CREATE POLICY "Solo admins pueden eliminar promociones"
  ON promociones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- ============================================
-- CUPONES
-- ============================================

-- Permitir lectura pública de cupones activos (para validación en checkout)
CREATE POLICY "Cualquiera puede leer cupones activos"
  ON cupones
  FOR SELECT
  USING (activo = true);

-- Solo admins pueden crear cupones
CREATE POLICY "Solo admins pueden crear cupones"
  ON cupones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden actualizar cupones
CREATE POLICY "Solo admins pueden actualizar cupones"
  ON cupones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden eliminar cupones
CREATE POLICY "Solo admins pueden eliminar cupones"
  ON cupones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );
