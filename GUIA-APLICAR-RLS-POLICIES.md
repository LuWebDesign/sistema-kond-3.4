# 🔒 Guía: Aplicar Políticas RLS en Supabase

## ¿Qué son las políticas RLS?

**Row Level Security (RLS)** permite controlar qué usuarios pueden acceder a qué filas de una tabla. Es fundamental para la seguridad de tu aplicación.

## 📋 Checklist rápido

- [ ] RLS habilitado en `pedidos_catalogo`
- [ ] RLS habilitado en `pedidos_catalogo_items`
- [ ] Política INSERT pública en `pedidos_catalogo`
- [ ] Política SELECT en `pedidos_catalogo`
- [ ] Política INSERT pública en `pedidos_catalogo_items`
- [ ] Política SELECT en `pedidos_catalogo_items`
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` configurada en Vercel

---

## 🚀 Paso 1: Verificar estado actual de RLS

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. **Table Editor** → Selecciona `pedidos_catalogo`
4. Mira abajo en la sección **"Row Level Security"**
5. Si dice **"RLS is disabled"** → haz clic en **"Enable RLS"**

Repite para `pedidos_catalogo_items`.

---

## 🛠️ Paso 2: Aplicar políticas SQL

### Método A: Desde SQL Editor (recomendado)

1. En Supabase Dashboard, ve a **SQL Editor** (ícono `</>` en sidebar)
2. Haz clic en **"New query"**
3. Copia y pega el contenido de `supabase-rls-policies.sql`
4. Haz clic en **"Run"** (o Ctrl+Enter)
5. Si sale éxito: ✅ **"Success. No rows returned"**
6. Si sale error: lee el mensaje (probablemente la política ya existe)

### Método B: Desde Table Editor (manual, más lento)

1. **Table Editor** → `pedidos_catalogo`
2. Scroll down → **"Add RLS policy"**
3. **Create a new policy**
4. Configura cada política manualmente (ver `supabase-rls-policies.sql` para detalles)

---

## 📊 Paso 3: Verificar políticas creadas

### Para `pedidos_catalogo`:

1. **Table Editor** → `pedidos_catalogo`
2. Scroll down → **"View policies"**
3. Debes ver:
   - ✅ `insert_pedidos_publico` (INSERT, público)
   - ✅ `select_pedidos_authenticated` (SELECT, autenticado)
   - ✅ `update_pedidos_authenticated` (UPDATE, autenticado)
   - ❌ **NO** debe haber política DELETE (se maneja por API route)

### Para `pedidos_catalogo_items`:

1. **Table Editor** → `pedidos_catalogo_items`
2. Scroll down → **"View policies"**
3. Debes ver:
   - ✅ `insert_items_publico` (INSERT, público)
   - ✅ `select_items_publico` (SELECT, público)

---

## 🧪 Paso 4: Probar que funciona

### Test 1: Crear pedido desde catálogo público

1. Abre tu catálogo en producción: `https://TU_DOMINIO/catalog`
2. Agrega productos al carrito
3. Completa checkout con método "whatsapp" o "transferencia"
4. **Debe funcionar sin errores** ✅
5. Si falla con error 403/401 → revisa política INSERT

### Test 2: Ver pedidos en admin

1. Abre: `https://TU_DOMINIO/pedidos-catalogo`
2. **Debe cargar la lista de pedidos** ✅
3. Si no aparecen → revisa política SELECT
4. Si aparece error en consola → revisa logs de Supabase

### Test 3: Eliminar pedido

1. En admin, selecciona un pedido
2. Haz clic en **"Eliminar"**
3. Confirma eliminación
4. **Debe eliminarse y NO reaparecer** al refrescar ✅
5. Si falla → revisa que `SUPABASE_SERVICE_ROLE_KEY` esté en Vercel

---

## 🔍 Diagnóstico de problemas

### Problema: "new row violates row-level security policy"

**Causa:** Política INSERT demasiado restrictiva o mal configurada

**Solución:**
1. Ve a la política `insert_pedidos_publico`
2. Verifica que el `WITH CHECK` sea:
   ```sql
   WITH CHECK (
     cliente_email IS NOT NULL
     AND metodo_pago IS NOT NULL
     AND total > 0
   )
   ```
3. Asegúrate de que los datos que envías cumplan esas condiciones

### Problema: "permission denied for table pedidos_catalogo"

**Causa:** RLS habilitado pero sin políticas, o políticas mal configuradas

**Solución:**
1. Verifica que RLS esté habilitado
2. Verifica que las políticas existan
3. Si usas `anon` key, las políticas deben permitir acceso sin autenticación

### Problema: Pedidos no aparecen en admin

**Causa:** Política SELECT demasiado restrictiva

**Solución temporal:**
```sql
-- Permitir SELECT público (menos seguro pero funcional)
CREATE POLICY "select_pedidos_publico"
ON pedidos_catalogo
FOR SELECT
USING (true);
```

**Solución permanente:** Implementar autenticación admin y restringir por JWT

### Problema: Eliminación falla en producción

**Causa:** Falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel

**Solución:**
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Agrega: `SUPABASE_SERVICE_ROLE_KEY` = [tu service_role key]
3. Redeploy

---

## 🔐 Mejores prácticas de seguridad

### ✅ Lo que está bien configurado:

- INSERT público para checkout (necesario para que clientes compren)
- SELECT autenticado (solo con clave válida de Supabase)
- DELETE por API route con service_role (más seguro que política pública)

### ⚠️ Mejoras opcionales futuras:

1. **Implementar autenticación de admin**
   - Usar Supabase Auth para login admin
   - Agregar `is_admin` en `app_metadata` del JWT
   - Restringir UPDATE/SELECT solo a admin

2. **Política SELECT por email para usuarios**
   - Permitir que clientes vean solo sus propios pedidos
   - Útil para página "Mis pedidos"

3. **Rate limiting en INSERT**
   - Evitar spam de pedidos desde IP única
   - Implementar en API route antes del INSERT

4. **Validación de productos**
   - Verificar que `producto_id` exista en tabla `productos`
   - Validar que `precio` no sea manipulado desde el cliente

---

## 📝 Resumen de configuración actual

```
pedidos_catalogo
├── RLS: Habilitado ✅
├── INSERT: Público (para checkout) ✅
├── SELECT: Autenticado (anon/service_role) ✅
├── UPDATE: Autenticado (anon/service_role) ✅
└── DELETE: API route con service_role ✅

pedidos_catalogo_items
├── RLS: Habilitado ✅
├── INSERT: Público (para checkout) ✅
├── SELECT: Público ✅
└── DELETE: CASCADE desde pedidos_catalogo ✅
```

---

## ✅ Checklist final

Antes de dar por terminado:

- [ ] RLS habilitado en ambas tablas
- [ ] Políticas SQL ejecutadas sin errores
- [ ] Checkout funciona en producción
- [ ] Admin puede ver listado de pedidos
- [ ] Admin puede eliminar pedidos sin que reaparezcan
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada en Vercel
- [ ] No hay errores 403/401 en consola del navegador

---

**¿Tienes dudas?** Revisa los logs de Supabase en Dashboard → Logs → Query logs para ver qué queries están fallando.
