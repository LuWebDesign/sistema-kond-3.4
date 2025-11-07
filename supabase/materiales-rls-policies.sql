-- ============================================
-- RLS POLICIES: MATERIALES
-- Control de acceso a nivel de fila
-- ============================================

-- Habilitar RLS
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamanos_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE espesores_materiales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - MATERIALES
-- ============================================

-- Materiales: Lectura para autenticados (productos necesitan ver materiales)
CREATE POLICY "Usuarios autenticados pueden leer materiales"
ON materiales FOR SELECT
TO authenticated
USING (true);

-- Materiales: Solo admins pueden crear
CREATE POLICY "Solo admins pueden crear materiales"
ON materiales FOR INSERT
TO authenticated
WITH CHECK (true);

-- Materiales: Solo admins pueden actualizar
CREATE POLICY "Solo admins pueden actualizar materiales"
ON materiales FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Materiales: Solo admins pueden eliminar
CREATE POLICY "Solo admins pueden eliminar materiales"
ON materiales FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POLÍTICAS RLS - PROVEEDORES
-- ============================================

-- Proveedores: Lectura para autenticados
CREATE POLICY "Usuarios autenticados pueden leer proveedores"
ON proveedores FOR SELECT
TO authenticated
USING (true);

-- Proveedores: Solo admins pueden modificar
CREATE POLICY "Solo admins pueden modificar proveedores"
ON proveedores FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS RLS - TAMAÑOS
-- ============================================

-- Tamaños: Lectura para autenticados
CREATE POLICY "Usuarios autenticados pueden leer tamaños"
ON tamanos_materiales FOR SELECT
TO authenticated
USING (true);

-- Tamaños: Solo admins pueden modificar
CREATE POLICY "Solo admins pueden modificar tamaños"
ON tamanos_materiales FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- POLÍTICAS RLS - ESPESORES
-- ============================================

-- Espesores: Lectura para autenticados
CREATE POLICY "Usuarios autenticados pueden leer espesores"
ON espesores_materiales FOR SELECT
TO authenticated
USING (true);

-- Espesores: Solo admins pueden modificar
CREATE POLICY "Solo admins pueden modificar espesores"
ON espesores_materiales FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

-- IMPORTANTE: Estas políticas asumen que todos los usuarios autenticados
-- son admins. Si se implementa un sistema de roles más granular,
-- actualizar las políticas para verificar:
--
-- EXISTS (
--   SELECT 1 FROM usuarios
--   WHERE usuarios.id = auth.uid()
--   AND usuarios.rol = 'admin'
-- )
