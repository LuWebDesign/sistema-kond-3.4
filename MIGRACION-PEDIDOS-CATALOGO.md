# 🚀 MIGRACIÓN PEDIDOS CATÁLOGO → SUPABASE

**Estado:** ✅ Completado (Paso 1)  
**Fecha:** 2025-01-14

---

## 📋 Resumen

Se migró el módulo `pedidos_catalogo` de **localStorage** a **Supabase PostgreSQL**, resolviendo problemas de límite de almacenamiento causados por imágenes de comprobantes en base64.

---

## 🎯 Objetivos Logrados

### ✅ Creación de Esquema
- **Tabla:** `pedidos_catalogo` con campos normalizados (cliente_nombre, metodo_pago, estado_pago, comprobante_url, fecha_solicitud_entrega, total)
- **Tabla:** `pedidos_catalogo_items` con relación a `productos` (producto_id, producto_nombre, producto_precio, cantidad, medidas)
- **RLS Policies:**
  - ✅ Cualquier usuario (anon/authenticated) puede crear pedidos (INSERT)
  - ✅ Solo admins pueden leer pedidos (SELECT)
  - ✅ Solo admins pueden actualizar/eliminar (UPDATE/DELETE)

### ✅ Funciones CRUD Implementadas
**Archivo:** `next-app/utils/supabasePedidos.js`

- `getAllPedidosCatalogo()` - Obtener todos los pedidos (solo admins)
- `getPedidoCatalogoById(id)` - Obtener pedido por ID
- `createPedidoCatalogo(pedido, items)` - Crear nuevo pedido
- `updatePedidoCatalogo(id, pedidoUpdate)` - Actualizar pedido completo
- `updateEstadoPago(id, estadoPago)` - Actualizar estado de pago
- `deletePedidoCatalogo(id)` - Eliminar pedido (solo admins)

### ✅ Integración con `useCatalog.js`
**Archivo:** `next-app/hooks/useCatalog.js`

#### `loadOrders()` - Carga híbrida
```javascript
// 1. Intenta cargar desde Supabase (requiere auth)
// 2. Fallback a localStorage si falla
// 3. Mapea snake_case → camelCase
```

#### `saveOrder()` - Guardado híbrido
```javascript
// 1. Intenta guardar en Supabase primero
// 2. Fallback a localStorage si falla (sin auth, error de red)
// 3. Manejo de QuotaExceededError (omite comprobante si es necesario)
// 4. Actualiza estado local y notifica listeners
```

#### `updateOrderStatus()` - Actualización híbrida
```javascript
// 1. Intenta actualizar en Supabase
// 2. Fallback a localStorage si falla
```

#### `updateOrderPaymentStatus()` - Actualización de pago híbrida
```javascript
// 1. Intenta actualizar en Supabase usando updateEstadoPago()
// 2. Fallback a localStorage si falla
```

#### `deleteOrder()` - Eliminación híbrida
```javascript
// 1. Intenta eliminar de Supabase
// 2. Fallback a localStorage si falla
```

---

## 🔄 Flujo de Trabajo

### Crear Pedido (Catálogo Público)
1. Usuario completa checkout en `/catalog`
2. `saveOrder()` intenta guardar en Supabase
3. Si falla (sin auth/red), guarda en localStorage con fallback de comprobante
4. Notifica a listeners con evento `pedidosCatalogo:updated`

### Ver Pedidos (Admin)
1. Admin accede a `/pedidos-catalogo`
2. `loadOrders()` carga desde Supabase (con auth)
3. Si falla, muestra pedidos de localStorage

### Actualizar Estado/Pago (Admin)
1. Admin cambia estado en UI
2. `updateOrderStatus()` o `updateOrderPaymentStatus()` actualiza Supabase
3. Si falla, actualiza localStorage

### Eliminar Pedido (Admin)
1. Admin elimina pedido
2. `deleteOrder()` elimina de Supabase
3. Si falla, elimina de localStorage

---

## 🧪 Testing

### ✅ Verificar Creación de Pedido
1. Ejecutar: `npm run dev` en `next-app/`
2. Abrir: `http://localhost:3000/catalog`
3. Agregar productos al carrito
4. Completar checkout con método "transferencia"
5. Subir comprobante (imagen pequeña para evitar QuotaExceeded)
6. Verificar en consola: `✅ Pedido guardado en Supabase: [id]`
7. Verificar en Supabase Dashboard: tabla `pedidos_catalogo` tiene el nuevo registro

### ✅ Verificar Lectura de Pedidos (Admin)
1. Iniciar sesión como admin (admin@kond.local / Admin123!)
2. Ir a `/pedidos-catalogo`
3. Verificar que los pedidos se cargan desde Supabase
4. Verificar en consola: `✅ Pedidos cargados desde Supabase: [cantidad]`

### ✅ Verificar Actualización de Estado
1. En `/pedidos-catalogo`, cambiar estado de un pedido
2. Verificar en consola: `✅ Estado actualizado en Supabase`
3. Refrescar página y verificar que el cambio persiste

### ⚠️ Verificar Fallback a localStorage
1. Deshabilitar conexión de red (DevTools → Network → Offline)
2. Intentar crear pedido
3. Verificar en consola: `⚠️ Fallback a localStorage por error: [mensaje]`
4. Pedido debe guardarse en localStorage correctamente

---

## 📊 Comparación localStorage vs Supabase

| Aspecto | localStorage | Supabase |
|---------|-------------|----------|
| Límite de almacenamiento | ~5-10MB | Ilimitado (práctico) |
| Comprobantes grandes | ❌ QuotaExceededError | ✅ Storage bucket |
| Acceso multiusuario | ❌ Solo local | ✅ Sincronizado |
| Búsqueda avanzada | ❌ Manual | ✅ SQL queries |
| Seguridad | ⚠️ Client-side | ✅ RLS policies |
| Historial | ❌ Manual | ✅ created_at/updated_at |

---

## 🔧 Configuración Necesaria

### Supabase Dashboard
1. ✅ Tabla `pedidos_catalogo` creada (`supabase/init.sql`)
2. ✅ Tabla `pedidos_catalogo_items` creada
3. ✅ RLS policies aplicadas (`supabase/rls-policies-uuid.sql`)
4. ⚠️ Storage bucket `comprobantes-pago` (pendiente si se migran imágenes)

### Variables de Entorno
- `NEXT_PUBLIC_SUPABASE_URL` - Configurada en `.env.local`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configurada en `.env.local`

---

## 🚨 Consideraciones

### Migración de Datos Existentes
- Los pedidos existentes en localStorage **NO se migran automáticamente**
- Para migrar pedidos antiguos, crear script de migración manualmente
- Considerar si es necesario migrar historial antiguo o empezar desde cero

### Comprobantes de Pago
- Actualmente se guardan como `comprobante_url` (TEXT)
- Pueden ser dataURL base64 (temporal) o URL de Storage bucket
- **Recomendación:** Migrar a Storage bucket `comprobantes-pago` para liberar espacio

### Compatibilidad Backward
- Sistema mantiene fallback a localStorage
- Si Supabase falla, continúa funcionando con localStorage
- **Importante:** Los pedidos creados en localStorage NO se sincronizan a Supabase automáticamente

---

## 📝 Próximos Pasos

### Paso 2: Migrar Materiales
- Tabla: `materiales`
- Beneficios: Control de inventario centralizado, alertas de stock bajo

### Paso 3: Migrar Pedidos Internos
- Tabla: `pedidos_internos`
- Beneficios: Calendario sincronizado, asignación de producción

### Mejoras Opcionales
- [ ] Crear Storage bucket `comprobantes-pago` y migrar imágenes
- [ ] Script de migración de datos históricos localStorage → Supabase
- [ ] Implementar sincronización automática localStorage ↔ Supabase
- [ ] Dashboard de estadísticas en tiempo real con Supabase queries
- [ ] Notificaciones push para pedidos nuevos (Supabase Realtime)

---

## 🐛 Troubleshooting

### Error: "row-level security policy"
**Solución:** Verificar que el usuario está autenticado o que la policy permite `TO anon`

### Error: "No se pudo crear pedido en Supabase"
**Solución:** Verificar conexión a internet, revisar logs de Supabase, verificar que la tabla existe

### Pedidos no se cargan en `/pedidos-catalogo`
**Solución:** Verificar que el usuario tiene rol 'admin', revisar policy de SELECT

### QuotaExceededError persiste
**Solución:** El sistema debería usar Supabase ahora. Si persiste, revisar que `saveOrder()` no esté usando localStorage primero.

---

## 📞 Contacto

Para dudas sobre la migración:
- Revisar logs en consola (🔍 buscar emojis: ✅ ⚠️ ❌)
- Verificar Supabase Dashboard → Logs → Recent queries
- Revisar `next-app/hooks/useCatalog.js` líneas 321-730

---

**Última actualización:** 2025-01-14  
**Versión:** Sistema KOND 4.0 - Migración Supabase
