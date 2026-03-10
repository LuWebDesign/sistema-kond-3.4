# Resumen de Cambios - Migración a Supabase

**Fecha:** 21 de octubre de 2025  
**Objetivo:** Preparar Sistema KOND para usar Supabase como base de datos principal

## ✅ Cambios Realizados

### 1. Nueva estructura Supabase creada

```
supabase/
├── client.js           ← Cliente Supabase configurado
├── schema.sql          ← Definiciones de tablas (productos, pedidos, promociones, etc.)
├── storage-buckets.sql ← Configuración de Storage para comprobantes e imágenes
├── migrate-data.js     ← Script para migrar datos desde localStorage
└── README.md           ← Guía completa de configuración
```

**Tablas creadas:**
- `productos` — Catálogo de productos con todos los campos del sistema actual
- `pedidos` — Pedidos internos/producción
- `pedidos_catalogo` — Pedidos de clientes desde catálogo público
- `promociones` — Sistema de marketing y promociones
- `cupones` — Cupones de descuento
- `finanzas` — Movimientos financieros
- `registros` — Cierres de caja

**Storage configurado:**
- Bucket `comprobantes` — Para comprobantes de pago (privado, 5 MB máx)
- Bucket `productos` — Para imágenes de productos (público, 2 MB máx)

### 2. Sistema de persistencia dual (localStorage + Supabase)

**Archivo modificado:** `js/utils.js`

**Nuevas funciones agregadas:**
- `isSupabaseEnabled()` — Detecta si Supabase está activo
- `saveProductos(productos)` — Guarda productos con fallback automático
- `loadProductos()` — Carga productos desde Supabase o localStorage
- `savePedidoCatalogo(pedido, file)` — Sube comprobantes a Storage automáticamente

**Modo híbrido:**
- Si `window.KOND_USE_SUPABASE = true` → usa Supabase
- Si es `false` o no está configurado → usa localStorage (modo actual)
- **Fallback automático:** si Supabase falla, guarda en localStorage

### 3. Archivos eliminados

**Carpeta `backend/` eliminada por completo** (todos los archivos estaban vacíos):
- ❌ `backend/server.js`
- ❌ `backend/config/database.js`
- ❌ `backend/controllers/*`
- ❌ `backend/models/*`
- ❌ `backend/routes/*`
- ❌ `backend/middleware/*`

**Razón:** El backend nunca funcionó y todos los archivos estaban vacíos. Con Supabase, el backend ya no es necesario.

### 4. Documentación creada

- `.env.example` — Plantilla para variables de entorno
- `supabase/README.md` — Guía paso a paso de configuración
- `supabase/migrate-data.js` — Script de migración documentado

## 🚀 Próximos Pasos

### Paso 1: Configurar Supabase (5-10 minutos)

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto
3. Copiar URL y anon key
4. Ejecutar scripts SQL:
   ```sql
   -- En SQL Editor de Supabase:
   -- 1. Ejecutar supabase/schema.sql
   -- 2. Ejecutar supabase/storage-buckets.sql
   ```

### Paso 2: Configurar variables de entorno

```bash
# Copiar plantilla
cp .env.example .env.local

# Editar .env.local con tus credenciales:
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
NEXT_PUBLIC_USE_SUPABASE=true
```

### Paso 3: Instalar dependencias

```bash
npm install @supabase/supabase-js
```

### Paso 4: Migrar datos existentes (opcional)

Si ya tienes datos en localStorage:

```bash
# 1. Exportar datos desde navegador (ver instrucciones en migrate-data.js)
# 2. Ejecutar migración
node supabase/migrate-data.js
```

### Paso 5: Activar Supabase en la app

Agregar al inicio de tus archivos HTML o en `js/main.js`:

```javascript
// Cargar cliente Supabase
import { supabase, uploadFile } from './supabase/client.js';
window.supabaseClient = supabase;
window.uploadFileToSupabase = uploadFile;
window.KOND_USE_SUPABASE = true; // Activar modo Supabase
```

## 📋 Modo de Uso

### Guardar productos (automático con fallback)

```javascript
// Ahora usa la función wrapper que detecta el modo
await saveProductos(productosBase);
// ✅ Guarda en Supabase si está activo
// ✅ Fallback a localStorage si falla
```

### Cargar productos

```javascript
const productos = await loadProductos();
// Carga desde Supabase o localStorage automáticamente
```

### Guardar pedido con comprobante

```javascript
const file = document.getElementById('comprobante').files[0];
await savePedidoCatalogo(pedido, file);
// ✅ Sube el archivo a Supabase Storage
// ✅ Guarda el pedido con la URL del comprobante
// ✅ Fallback a localStorage si falla
```

## 🔒 Seguridad

- **RLS habilitado** en todas las tablas
- **Políticas básicas** creadas (ajustar según necesidades)
- **Storage privado** para comprobantes
- **anon key** segura para frontend (solo permisos limitados)
- **service key** solo para migración (NUNCA exponerla en frontend)

## ⚠️ Notas Importantes

1. **No se eliminaron datos:** Todo en localStorage sigue intacto
2. **Modo híbrido:** Puedes probar Supabase sin romper nada (set `USE_SUPABASE=false` para volver a localStorage)
3. **Imágenes:** Las imágenes base64 actuales seguirán funcionando, pero puedes migrarlas a Storage para mejor rendimiento
4. **Comprobantes grandes:** Ahora se suben a Storage en vez de localStorage (evita QuotaExceeded)

## 📊 Beneficios de la Migración

✅ **Sin límite de almacenamiento** (vs 5-10 MB de localStorage)  
✅ **Comprobantes en la nube** (no se pierden al limpiar caché)  
✅ **Sincronización multi-dispositivo** (datos en tiempo real)  
✅ **Backup automático** (Supabase hace backups diarios)  
✅ **Mejor rendimiento** (queries optimizadas vs JSON parsing)  
✅ **Escalabilidad** (soporta miles de productos/pedidos)  

## 🆘 Soporte

Si tienes dudas o problemas:

1. Revisa `supabase/README.md` para troubleshooting
2. Verifica la configuración en `.env.local`
3. Comprueba la consola del navegador para errores
4. Puedes volver a localStorage en cualquier momento (set `USE_SUPABASE=false`)

## 📝 Checklist de Validación

Antes de usar en producción, verifica:

- [ ] Supabase configurado correctamente (URL y keys)
- [ ] Scripts SQL ejecutados sin errores
- [ ] Storage buckets creados
- [ ] Dependencia `@supabase/supabase-js` instalada
- [ ] Variables de entorno configuradas
- [ ] Modo híbrido funciona (prueba con `USE_SUPABASE=false` y `true`)
- [ ] Migración de datos completada (si aplica)
- [ ] Políticas RLS ajustadas según necesidades

---

**¡Migración lista para usar!** 🎉

Cualquier duda, revisa `supabase/README.md` o los comentarios en el código.
