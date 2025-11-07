-- ============================================
-- SISTEMA KOND - RLS Y POLÍTICAS
-- Paso 2: Habilitar Row Level Security y crear políticas
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_catalogo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - PRODUCTOS
-- ============================================

-- Productos: Lectura pública solo de publicados
CREATE POLICY "Lectura pública de productos publicados"
ON productos FOR SELECT
TO anon, authenticated
USING (publicado = true);

-- Productos: Admins pueden ver todos
CREATE POLICY "Admins ven todos los productos"
ON productos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- Productos: Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "Solo admins modifican productos"
ON productos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - PEDIDOS CATÁLOGO
-- ============================================

-- Pedidos catálogo: Cualquiera puede crear (público)
CREATE POLICY "Cualquiera puede crear pedidos catálogo"
ON pedidos_catalogo FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Pedidos catálogo: Solo admins pueden leer
CREATE POLICY "Solo admins leen pedidos catálogo"
ON pedidos_catalogo FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- Pedidos catálogo: Solo admins pueden actualizar
CREATE POLICY "Solo admins actualizan pedidos catálogo"
ON pedidos_catalogo FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - ITEMS PEDIDOS CATÁLOGO
-- ============================================

-- Items: Cualquiera puede insertar (junto con pedido)
CREATE POLICY "Cualquiera puede crear items de pedido"
ON pedidos_catalogo_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Items: Solo admins pueden leer
CREATE POLICY "Solo admins leen items de pedido"
ON pedidos_catalogo_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - PEDIDOS INTERNOS
-- ============================================

-- Pedidos internos: Solo admins
CREATE POLICY "Solo admins gestionan pedidos internos"
ON pedidos_internos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - USUARIOS
-- ============================================

-- Usuarios: Solo admins pueden leer/modificar
CREATE POLICY "Solo admins gestionan usuarios"
ON usuarios FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- Fin de rls-policies.sql
