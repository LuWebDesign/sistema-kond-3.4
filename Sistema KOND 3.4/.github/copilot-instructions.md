# Sistema KOND 3.4 — Instrucciones para AI Assistants

> Este archivo es leído automáticamente por GitHub Copilot (VS Code) y por opencode.
> Contiene el contexto técnico completo del proyecto para que el asistente genere código correcto sin necesidad de re-explicar la arquitectura en cada sesión.

---

## 1. Descripción del Proyecto

Sistema integral de gestión de producción para una empresa manufacturera. Incluye:

- **Dashboard administrativo**: gestión de productos, pedidos de producción, calendario, finanzas.
- **Catálogo público**: checkout para clientes con transferencia, WhatsApp o retiro en local.
- **Marketing**: promociones con múltiples tipos, cupones de descuento, badges dinámicos.
- **Finanzas**: ingresos, egresos, cierres de caja.

**URL en producción**: https://sistema-kond-3-4.vercel.app

---

## 2. Stack Tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend admin/catálogo | HTML + CSS + JavaScript vanilla | Sin bundler, scripts cargados directamente |
| Framework (migración) | Next.js 16 + React 19 | En `next-app/`, migración progresiva |
| Base de datos | Supabase (PostgreSQL) | Con fallback automático a localStorage |
| Storage | Supabase Storage | Comprobantes de pago e imágenes de productos |
| Autenticación | Supabase Auth | Opcional, en desarrollo |
| Deploy | Vercel | Rama `main` → producción automática |
| Node | 22.x | Definido en `package.json` → `engines` |

**Dependencias clave** (`next-app/package.json`):
```
@supabase/supabase-js ^2.80.0
next ^16.1.6
react ^19.2.0
bcryptjs ^3.0.3
```

---

## 3. Estructura del Proyecto

```
Sistema KOND 3.4/
├── .github/
│   └── copilot-instructions.md   ← Este archivo
├── css/                          ← Estilos por sección (catalog.css, modals.css, calendar.css...)
├── js/                           ← Lógica frontend vanilla
│   ├── main.js                   ← Inicialización global, carga de datos
│   ├── utils.js                  ← Utilidades compartidas (ver sección 6)
│   ├── catalog.js                ← Catálogo público y flujo de checkout
│   ├── products.js               ← CRUD de productos
│   ├── calendar.js               ← Calendario de producción
│   ├── marketing.js              ← Sistema de promociones y cupones
│   ├── promo-engine.js           ← Motor de aplicación de promociones
│   ├── finanzas.js               ← Módulo financiero
│   └── supabase-init.js          ← Inicialización del cliente Supabase en browser
├── supabase/
│   ├── client.js                 ← Cliente Supabase (export `supabase`, `USE_SUPABASE`)
│   ├── schema.sql                ← Definición de tablas, índices, RLS, triggers
│   ├── storage-buckets.sql       ← Configuración de buckets de Storage
│   └── migrate-data.js           ← Script de migración localStorage → Supabase
├── next-app/                     ← Aplicación Next.js (migración progresiva)
│   ├── components/               ← Componentes React reutilizables
│   ├── pages/                    ← Rutas (Next.js Pages Router)
│   ├── hooks/                    ← Custom hooks React
│   ├── styles/                   ← CSS Modules + globals
│   ├── utils/                    ← Helpers JS para Next.js
│   └── public/                   ← Archivos estáticos
├── index.html                    ← Dashboard administrativo
├── home.html                     ← Página de inicio
├── marketing.html                ← Gestión de promociones y cupones
├── user-public.html              ← Vista pública de usuario
├── .env.example                  ← Variables de entorno de referencia
└── EJECUTAR-SISTEMA.bat          ← Script para iniciar el sistema en Windows
```

---

## 4. Configuración y Variables de Entorno

Archivo: `.env.local` (basado en `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_USE_SUPABASE=true        # false = modo localStorage (legacy)
SUPABASE_SERVICE_ROLE_KEY=           # NUNCA exponer en cliente, solo scripts servidor
```

**Regla crítica**: `SUPABASE_SERVICE_ROLE_KEY` JAMÁS debe usarse en el browser ni en código client-side. Solo en scripts de migración o server-side.

---

## 5. Base de Datos — Esquema Supabase

### Tabla `productos`
```sql
id BIGSERIAL PRIMARY KEY
nombre TEXT NOT NULL
categoria TEXT
tipo TEXT DEFAULT 'Venta'
medidas TEXT
tiempo_unitario TEXT          -- formato 'HH:MM:SS'
unidades NUMERIC DEFAULT 1
unidades_por_placa NUMERIC
uso_placas NUMERIC
costo_placa NUMERIC
costo_material NUMERIC
margen_material NUMERIC
precio_unitario NUMERIC
ensamble TEXT DEFAULT 'Sin ensamble'
imagen TEXT                   -- URL Supabase Storage o data URL (transición)
costo NUMERIC
material TEXT
dimensiones TEXT
utilidad NUMERIC
precio1 NUMERIC
stock_actual NUMERIC
active BOOLEAN DEFAULT true
publicado BOOLEAN DEFAULT false
hidden_in_productos BOOLEAN DEFAULT false
allow_promotions BOOLEAN DEFAULT true
promo_badge TEXT
static_promo_price NUMERIC
static_promo_start DATE
static_promo_end DATE
tags TEXT[]
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### Tabla `pedidos` (internos / producción)
```sql
id BIGSERIAL PRIMARY KEY
producto_id BIGINT → productos.id
fecha DATE NOT NULL
cantidad NUMERIC NOT NULL
cliente TEXT
observaciones TEXT
estado TEXT  -- 'pendiente' | 'en_proceso' | 'completado' | 'entregado'
```

### Tabla `pedidos_catalogo` (pedidos de clientes públicos)
```sql
id BIGSERIAL PRIMARY KEY
cliente_nombre TEXT NOT NULL
cliente_apellido TEXT
cliente_telefono TEXT
cliente_email TEXT
cliente_direccion TEXT
productos JSONB              -- [{productId, name, price, quantity, measures, subtotal}]
metodo_pago TEXT             -- 'transferencia' | 'whatsapp' | 'retiro'
estado_pago TEXT             -- 'sin_seña' | 'seña_pagada' | 'pagado'
comprobante_url TEXT         -- URL en Supabase Storage
comprobante_omitido BOOLEAN DEFAULT false
fecha_creacion TIMESTAMPTZ
fecha_solicitud_entrega DATE
total NUMERIC NOT NULL
asignado_al_calendario BOOLEAN DEFAULT false
fecha_produccion_calendario DATE
fecha_entrega_calendario DATE
estado TEXT  -- 'pendiente' | 'confirmado' | 'produccion' | 'listo' | 'entregado' | 'cancelado'
cupon_codigo TEXT
cupon_descuento NUMERIC DEFAULT 0
```

### Tabla `promociones`
```sql
id BIGSERIAL PRIMARY KEY
title TEXT NOT NULL
type TEXT   -- 'percentage_discount' | 'fixed_price' | 'buy_x_get_y' | 'free_shipping' | 'badge_only'
summary TEXT
start_date DATE
end_date DATE
badge TEXT
color TEXT DEFAULT '#3b82f6'
text_color TEXT DEFAULT 'auto'
tags TEXT[]
active BOOLEAN DEFAULT true
product_ids BIGINT[]         -- IDs de productos afectados
config JSONB                 -- configuración específica por tipo de promo
```

### Tabla `cupones`
```sql
id BIGSERIAL PRIMARY KEY
code TEXT NOT NULL UNIQUE    -- código alfanumérico uppercase (ej: 'VERANO20')
description TEXT
type TEXT                    -- 'percentage' | 'fixed'
value NUMERIC NOT NULL       -- 20 para 20%, o 1000 para $1000 fijo
min_amount NUMERIC
min_quantity INTEGER
start_date DATE
end_date DATE
active BOOLEAN DEFAULT true
```

### Tabla `finanzas`
```sql
id BIGSERIAL PRIMARY KEY
fecha DATE NOT NULL
tipo TEXT                    -- 'ingreso' | 'egreso'
categoria TEXT
monto NUMERIC NOT NULL
descripcion TEXT
pedido_catalogo_id BIGINT → pedidos_catalogo.id
registro_id BIGINT           -- agrupa movimientos de un cierre de caja
```

### Tabla `registros` (cierres de caja)
```sql
id BIGSERIAL PRIMARY KEY
fecha_inicio DATE NOT NULL
fecha_fin DATE NOT NULL
total_ingresos NUMERIC DEFAULT 0
total_egresos NUMERIC DEFAULT 0
saldo NUMERIC DEFAULT 0
```

**RLS activo en todas las tablas.** Políticas clave:
- `productos` con `publicado = true` → lectura pública.
- `cupones` con `active = true` → lectura pública.
- `pedidos_catalogo` → INSERT público (cualquier cliente puede crear).
- Operaciones admin → requieren autenticación (en desarrollo).

---

## 6. Patrones y Convenciones de Código

### 6.1 JavaScript (vanilla — `js/`)

```js
// ✅ Correcto
const items = JSON.parse(localStorage.getItem('productosBase') || '[]')
const precio = formatCurrency(producto.precio_unitario)

// ❌ Incorrecto
var items = ...   // nunca var
console.log(...)  // nunca en producción
```

**Reglas:**
- `const`/`let` siempre. `var` nunca.
- Arrow functions para callbacks.
- `escapeHtml()` SIEMPRE antes de insertar contenido dinámico en el DOM.
- `guardarProductos()` después de TODA mutación de `productosBase` o `pedidos`.
- `safeLocalStorageSetItem()` para guardar pedidos con comprobantes (maneja `QuotaExceededError`).
- Sin `console.log` en producción.

### 6.2 Patrón Dual: Supabase ↔ localStorage

El proyecto opera en dos modos según `NEXT_PUBLIC_USE_SUPABASE`:

```js
// Detectar modo activo
function isSupabaseEnabled() {
  return window.KOND_USE_SUPABASE === true
      || process.env?.NEXT_PUBLIC_USE_SUPABASE === 'true'
}

// Patrón estándar: siempre intentar Supabase, fallback a localStorage
async function loadProductos() {
  if (isSupabaseEnabled() && window.supabaseClient) {
    try {
      const { data, error } = await supabase.from('productos').select('*')
      if (error) throw error
      return data
    } catch (err) {
      console.error('Supabase falló, usando localStorage:', err)
      return JSON.parse(localStorage.getItem('productosBase') || '[]')
    }
  }
  return JSON.parse(localStorage.getItem('productosBase') || '[]')
}
```

**Claves de localStorage** (modo legacy):
| Clave | Contenido |
|-------|-----------|
| `productosBase` | Array de productos |
| `pedidos` | Array de pedidos de producción |
| `pedidosCatalogo` | Array de pedidos de clientes |
| `cart` | Carrito activo |
| `marketing_promotions` | Array de promociones |
| `marketing_coupons` | Array de cupones |
| `notifications` | Array de notificaciones (máx 300) |

### 6.3 Motor de Promociones (`js/promo-engine.js`)

- Se aplican **TODAS** las promociones activas a un producto (no solo la primera).
- Descuentos porcentuales son acumulativos (compounding): `precio * 0.8 * 0.9 = 28% dto`.
- Para `buy_x_get_y`: solo se aplica el primero encontrado.
- Para `fixed_price`: se usa el precio más bajo entre todas las promos.
- Resultado: `{ finalPrice, badges[], discountPercent }`.
- **Orden de carga**: `promo-engine.js` DEBE cargarse ANTES que `catalog.js`.

### 6.4 Cupones

```js
// Estructura de cupón
{
  code: 'VERANO20',         // uppercase, alfanumérico
  type: 'percentage',       // 'percentage' | 'fixed'
  value: 20,                // 20% o $20 fijo
  minAmount: 5000,          // monto mínimo (opcional)
  minQuantity: 2,           // cantidad mínima de items (opcional)
  startDate: '2025-12-01',  // opcional
  endDate: '2025-12-31',    // opcional
  active: true
}
```

### 6.5 Comprobantes de Pago

1. **Modo Supabase**: subir a bucket `comprobantes` → guardar URL en `pedidos_catalogo.comprobante_url`.
2. **Modo localStorage**: guardar como dataURL base64. Si lanza `QuotaExceededError`, usar `savePedidosCatalogoSafely()` que omite el comprobante y marca `comprobante_omitido: true`.

### 6.6 Calendario (checkout transferencia)

- Domingo: NO seleccionable.
- Sábado: permitido.
- Día actual: NO seleccionable.
- Método envío: fecha mínima = hoy + 2 días.

### 6.7 Next.js (`next-app/`)

```js
// ✅ Importar cliente Supabase
import { supabase, USE_SUPABASE } from '../supabase/client'

// ✅ Manejo de errores Supabase siempre con destructuring
const { data, error } = await supabase.from('productos').select('*')
if (error) throw error

// ✅ Server Components vs Client Components
// Usa 'use client' solo cuando necesites hooks, eventos o browser APIs
'use client'
```

---

## 7. Funciones Clave

### `js/utils.js`
| Función | Descripción |
|---------|-------------|
| `escapeHtml(text)` | Sanitiza HTML antes de insertar en DOM |
| `formatCurrency(value)` | Formatea como ARS (Intl.NumberFormat) |
| `guardarProductos()` | Persiste `productosBase` y `pedidos` en localStorage |
| `safeLocalStorageSetItem(key, obj, opts)` | Guarda en localStorage manejando QuotaExceededError |
| `savePedidosCatalogoSafely(pedidos)` | Wrapper para guardar pedidos sin romper por cuota |
| `showCustomConfirm(title, msg, onConfirm)` | Modal de confirmación (reemplaza `confirm()`) |
| `showCustomAlert(title, msg, type, onClose)` | Modal de alerta (reemplaza `alert()`) |
| `showNotification(message, type)` | Toast de notificación |
| `addNotification({title, body, date})` | Agrega notificación persistente |
| `timeToMinutes(str)` | Convierte 'HH:MM:SS' a minutos |
| `minutesToTime(min)` | Convierte minutos a 'HH:MM:SS' |
| `isSupabaseEnabled()` | Detecta si el modo Supabase está activo |
| `saveProductos(productos)` | Wrapper dual: Supabase o localStorage |
| `loadProductos()` | Wrapper dual: Supabase o localStorage |
| `savePedidoCatalogo(pedido, file)` | Guarda pedido + sube comprobante |

### `supabase/client.js`
| Export | Descripción |
|--------|-------------|
| `supabase` | Cliente Supabase configurado |
| `USE_SUPABASE` | Boolean: modo activo |
| `isSupabaseConfigured()` | Verifica credenciales |
| `uploadFile(file, bucket, path)` | Sube archivo a Storage |
| `deleteFile(bucket, path)` | Elimina archivo de Storage |
| `getCurrentUser()` | Obtiene usuario autenticado |

---

## 8. Reglas para AI Assistants (opencode / Copilot)

### Al generar código nuevo:
1. **Verificar el modo de persistencia**: ¿Supabase o localStorage? Siempre usar el patrón dual con fallback.
2. **Campos de BD**: usar `snake_case` en Supabase, `camelCase` en el frontend. Convertir al pasar entre capas.
3. **RLS**: no asumir que cualquier operación está permitida. Las operaciones admin requieren sesión.
4. **Modales**: nunca usar `alert()` ni `confirm()` nativos. Usar `showCustomAlert()` y `showCustomConfirm()`.
5. **Imágenes**: pueden ser URL de Supabase Storage o data URL base64 (durante transición). Manejar ambos.
6. **Seguridad**: siempre `escapeHtml()` antes de `.innerHTML`. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente.

### Al modificar datos estructurales:
- Si agregás campos a `pedidos_catalogo`, actualizar: schema.sql, el render admin, y los wrappers de `utils.js`.
- Si cambiás el formato de un campo Supabase, verificar el mapeo en `loadProductos()` / `saveProductos()`.
- Si agregás una tabla nueva, agregar política RLS correspondiente.

### Orden de carga de scripts en HTML vanilla:
```
utils.js → supabase-init.js → promo-engine.js → [módulo específico] → main.js
```

### Convenciones de commit:
```
feat: descripción corta en presente
fix: descripción corta
refactor: descripción corta
docs: descripción corta
```

---

## 9. Tareas Frecuentes

| Tarea | Dónde ir |
|-------|----------|
| Agregar producto | `js/products.js` → listener del formulario `addProduct` |
| Modificar visibilidad de producto | `js/database.js` → `showToggleVisibilityModal()` |
| Editar calendario | `js/calendar.js` + `js/catalog.js` → `renderAvailabilityCalendar()` |
| Agregar tipo de promoción | `js/promo-engine.js` + `js/marketing.js` |
| Validar cupón en checkout | `js/catalog.js` → sección de validación de cupones |
| Migrar datos localStorage → Supabase | `supabase/migrate-data.js` |
| Cambiar políticas RLS | `supabase/schema.sql` → sección POLÍTICAS RLS |

---

## 10. Debugging Rápido

```
# Inspeccionar localStorage
DevTools > Application > Local Storage > localhost
Claves: productosBase, pedidos, pedidosCatalogo, cart, marketing_promotions, marketing_coupons

# Verificar conexión Supabase
console.log(window.supabaseClient) // debe existir si está configurado
console.log(window.KOND_USE_SUPABASE) // debe ser true en modo Supabase

# Errores comunes
QuotaExceededError → usar savePedidosCatalogoSafely(), o activar Supabase
"No se guardan datos" → verificar .env.local y que el schema SQL fue ejecutado
"Imágenes no cargan" → verificar bucket 'productos' es público en Supabase Storage
```

---

## 11. Checklist Antes de Commits

- [ ] No hay `console.log` en código de producción.
- [ ] Todo contenido dinámico en DOM pasa por `escapeHtml()`.
- [ ] Mutaciones de estado van seguidas de la función de persistencia correspondiente.
- [ ] Si se modificó el modelo de datos, se actualizaron los wrappers dual (Supabase + localStorage).
- [ ] Flujo completo de checkout testeado manualmente (transferencia, WhatsApp, retiro).
- [ ] No se exponen claves secretas (`SUPABASE_SERVICE_ROLE_KEY`) en código cliente.
- [ ] Políticas RLS revisadas si se agregaron tablas o columnas sensibles.

---

*Última actualización: 2026-04-12 — Stack: Next.js 16 + React 19 + Supabase + Vanilla JS*
