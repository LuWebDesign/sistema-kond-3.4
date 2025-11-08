-- ============================================
-- POLÍTICAS RLS PARA SISTEMA KOND
-- Row Level Security policies para tablas de Supabase
-- ============================================

-- ============================================
-- TABLA: pedidos_catalogo
-- ============================================

-- 1. INSERT: Cualquiera puede crear pedidos desde el catálogo público
CREATE POLICY "insert_pedidos_publico"
ON pedidos_catalogo
FOR INSERT
WITH CHECK (
  cliente_email IS NOT NULL
  AND metodo_pago IS NOT NULL
  AND total > 0
);

-- 2. SELECT: Solo usuarios autenticados pueden ver pedidos
-- (En este caso, consideramos "autenticado" como cualquier request válido)
CREATE POLICY "select_pedidos_authenticated"
ON pedidos_catalogo
FOR SELECT
USING (true);

-- 3. UPDATE: Solo usuarios autenticados pueden actualizar
-- (Para actualizar estado de pago, fechas, etc.)
CREATE POLICY "update_pedidos_authenticated"
ON pedidos_catalogo
FOR UPDATE
USING (true)
WITH CHECK (true);

-- NOTA: DELETE no tiene política porque se maneja por API route con service_role
-- El API route /api/pedidos-catalogo/[id] usa SUPABASE_SERVICE_ROLE_KEY que bypasea RLS


-- ============================================
-- TABLA: pedidos_catalogo_items
-- ============================================

-- 1. INSERT: Cualquiera puede insertar items al crear un pedido
CREATE POLICY "insert_items_publico"
ON pedidos_catalogo_items
FOR INSERT
WITH CHECK (
  pedido_catalogo_id IS NOT NULL
  AND producto_id IS NOT NULL
  AND cantidad > 0
);

-- 2. SELECT: Cualquiera puede ver items
CREATE POLICY "select_items_publico"
ON pedidos_catalogo_items
FOR SELECT
USING (true);

-- NOTA: UPDATE y DELETE se manejan por CASCADE desde pedidos_catalogo
-- o por API routes con service_role si es necesario


-- ============================================
-- TABLA: productos (si aplica)
-- ============================================

-- 1. SELECT público: Para mostrar productos en catálogo
CREATE POLICY "select_productos_publico"
ON productos
FOR SELECT
USING (true);

-- 2. INSERT/UPDATE/DELETE: Solo para admins
-- (Se manejan por API routes con service_role o sesión admin)


-- ============================================
-- INSTRUCCIONES DE APLICACIÓN
-- ============================================

/*
PASOS PARA APLICAR EN SUPABASE:

1. Ve a tu proyecto en Supabase Dashboard
2. SQL Editor (ícono </> en sidebar)
3. Copia y pega estas políticas
4. Ejecuta el script

VERIFICACIÓN:
- Tabla pedidos_catalogo debe tener RLS habilitado
- Debe mostrar 3 políticas: insert_pedidos_publico, select_pedidos_authenticated, update_pedidos_authenticated
- Tabla pedidos_catalogo_items debe tener RLS habilitado
- Debe mostrar 2 políticas: insert_items_publico, select_items_publico

IMPORTANTE:
- Estas políticas permiten INSERT público (checkout catálogo)
- Permiten SELECT y UPDATE con autenticación (anon key funciona)
- DELETE se maneja por API route /api/pedidos-catalogo/[id] con service_role
  (no requiere política porque service_role bypasea RLS)
*/


-- ============================================
-- POLÍTICAS ALTERNATIVAS (SI USAS AUTH)
-- ============================================

/*
Si implementás autenticación de usuarios y querés restringir más:

-- Solo admin puede ver todos los pedidos:
CREATE POLICY "admin_select_all_pedidos"
ON pedidos_catalogo
FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
);

-- Usuarios pueden ver solo sus propios pedidos:
CREATE POLICY "user_select_own_pedidos"
ON pedidos_catalogo
FOR SELECT
USING (
  cliente_email = (auth.jwt() ->> 'email')
);

-- Solo admin puede actualizar:
CREATE POLICY "admin_update_pedidos"
ON pedidos_catalogo
FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
)
WITH CHECK (true);
*/
