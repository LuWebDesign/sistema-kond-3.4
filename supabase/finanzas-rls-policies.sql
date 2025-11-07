-- ============================================
-- POLÍTICAS RLS para módulo de finanzas
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE categorias_financieras ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_financieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_cierre ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CATEGORÍAS FINANCIERAS
-- ============================================

-- Los usuarios autenticados pueden leer categorías
CREATE POLICY "Usuarios autenticados pueden leer categorías financieras"
  ON categorias_financieras
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden insertar categorías
CREATE POLICY "Solo admins pueden crear categorías financieras"
  ON categorias_financieras
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden actualizar categorías
CREATE POLICY "Solo admins pueden actualizar categorías financieras"
  ON categorias_financieras
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden eliminar categorías
CREATE POLICY "Solo admins pueden eliminar categorías financieras"
  ON categorias_financieras
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
-- MOVIMIENTOS FINANCIEROS
-- ============================================

-- Los usuarios autenticados pueden leer movimientos
CREATE POLICY "Usuarios autenticados pueden leer movimientos financieros"
  ON movimientos_financieros
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden crear movimientos
CREATE POLICY "Solo admins pueden crear movimientos financieros"
  ON movimientos_financieros
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden actualizar movimientos
CREATE POLICY "Solo admins pueden actualizar movimientos financieros"
  ON movimientos_financieros
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden eliminar movimientos
CREATE POLICY "Solo admins pueden eliminar movimientos financieros"
  ON movimientos_financieros
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
-- REGISTROS CIERRE
-- ============================================

-- Los usuarios autenticados pueden leer registros de cierre
CREATE POLICY "Usuarios autenticados pueden leer registros de cierre"
  ON registros_cierre
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden crear registros de cierre
CREATE POLICY "Solo admins pueden crear registros de cierre"
  ON registros_cierre
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden actualizar registros de cierre
CREATE POLICY "Solo admins pueden actualizar registros de cierre"
  ON registros_cierre
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Solo admins pueden eliminar registros de cierre
CREATE POLICY "Solo admins pueden eliminar registros de cierre"
  ON registros_cierre
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );
