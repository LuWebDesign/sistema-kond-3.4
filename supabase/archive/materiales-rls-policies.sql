-- ============================================
-- RLS POLICIES: MATERIALES (archivado)
-- Control de acceso a nivel de fila
-- ============================================

-- Habilitar RLS
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamanos_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE espesores_materiales ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS - MATERIALES
CREATE POLICY "Usuarios autenticados pueden leer materiales"
ON materiales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Solo admins pueden crear materiales"
ON materiales FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Solo admins pueden actualizar materiales"
ON materiales FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Solo admins pueden eliminar materiales"
ON materiales FOR DELETE
TO authenticated
USING (true);

-- Fin de materiales-rls-policies.sql (archivado)
