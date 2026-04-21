# BOOTSTRAP RÁPIDO — Inicio en este repositorio

- **Comandos rápidos**:
  - `node verify-setup.js` — Verifica archivos y estado de migración.
  - `cd next-app && cp ../.env.example .env.local && npm install && npm run dev` — Iniciar la app Next.js en desarrollo.
  - Ejecutar SQL de Supabase en este orden: `supabase/schema.sql` -> `supabase/storage-buckets.sql`.

- **Archivos y rutas clave**: AGENTS.md, README.md, `verify-setup.js`, `supabase/`, `js/`, `next-app/`, `.github/copilot-instructions.md`.
- **Reglas críticas**: Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente o en el repo. Mantener `NEXT_PUBLIC_USE_SUPABASE` consistente entre frontends.

# Sistema KOND 3.4 ÔÇö Instrucciones para AI Assistants

> Este archivo es le├¡do autom├íticamente por GitHub Copilot (VS Code) y por opencode.
> Contiene el contexto t├®cnico completo del proyecto para que el asistente genere c├│digo correcto sin necesidad de re-explicar la arquitectura en cada sesi├│n.

---

## 1. Descripci├│n del Proyecto

Sistema integral de gesti├│n de producci├│n para una empresa manufacturera. Incluye:

- **Dashboard administrativo**: gesti├│n de productos, pedidos de producci├│n, calendario, finanzas.
- **Cat├ílogo p├║blico**: checkout para clientes con transferencia, WhatsApp o retiro en local.
- **Marketing**: promociones con m├║ltiples tipos, cupones de descuento, badges din├ímicos.
- **Finanzas**: ingresos, egresos, cierres de caja.

**URL en producci├│n**: https://sistema-kond-3-4.vercel.app

---

## 2. Stack Tecnol├│gico

| Capa | Tecnolog├¡a | Notas |
|------|-----------|-------|
| Frontend admin/cat├ílogo | HTML + CSS + JavaScript vanilla | Sin bundler, scripts cargados directamente |
| Framework (migraci├│n) | Next.js 16 + React 19 | En `next-app/`, migraci├│n progresiva |
| Base de datos | Supabase (PostgreSQL) | Con fallback autom├ítico a localStorage |
| Storage | Supabase Storage | Comprobantes de pago e im├ígenes de productos |
| Autenticaci├│n | Supabase Auth | Opcional, en desarrollo |
| Deploy | Vercel | Rama `main` ÔåÆ producci├│n autom├ítica |
| Node | 22.x | Definido en `package.json` ÔåÆ `engines` |

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
Ôö£ÔöÇÔöÇ .github/
Ôöé   ÔööÔöÇÔöÇ copilot-instructions.md   ÔåÉ Este archivo
Ôö£ÔöÇÔöÇ css/                          ÔåÉ Estilos por secci├│n (catalog.css, modals.css, calendar.css...)
Ôö£ÔöÇÔöÇ js/                           ÔåÉ L├│gica frontend vanilla
Ôöé   Ôö£ÔöÇÔöÇ main.js                   ÔåÉ Inicializaci├│n global, carga de datos
Ôöé   Ôö£ÔöÇÔöÇ utils.js                  ÔåÉ Utilidades compartidas (ver secci├│n 6)
Ôöé   Ôö£ÔöÇÔöÇ catalog.js                ÔåÉ Cat├ílogo p├║blico y flujo de checkout
Ôöé   Ôö£ÔöÇÔöÇ products.js               ÔåÉ CRUD de productos
Ôöé   Ôö£ÔöÇÔöÇ calendar.js               ÔåÉ Calendario de producci├│n
Ôöé   Ôö£ÔöÇÔöÇ marketing.js              ÔåÉ Sistema de promociones y cupones
Ôöé   Ôö£ÔöÇÔöÇ promo-engine.js           ÔåÉ Motor de aplicaci├│n de promociones
Ôöé   Ôö£ÔöÇÔöÇ finanzas.js               ÔåÉ M├│dulo financiero
Ôöé   ÔööÔöÇÔöÇ supabase-init.js          ÔåÉ Inicializaci├│n del cliente Supabase en browser
Ôö£ÔöÇÔöÇ supabase/
Ôöé   Ôö£ÔöÇÔöÇ client.js                 ÔåÉ Cliente Supabase (export `supabase`, `USE_SUPABASE`)
Ôöé   Ôö£ÔöÇÔöÇ schema.sql                ÔåÉ Definici├│n de tablas, ├¡ndices, RLS, triggers
Ôöé   Ôö£ÔöÇÔöÇ storage-buckets.sql       ÔåÉ Configuraci├│n de buckets de Storage
Ôöé   ÔööÔöÇÔöÇ migrate-data.js           ÔåÉ Script de migraci├│n localStorage ÔåÆ Supabase
Ôö£ÔöÇÔöÇ next-app/                     ÔåÉ Aplicaci├│n Next.js (migraci├│n progresiva)
Ôöé   Ôö£ÔöÇÔöÇ components/               ÔåÉ Componentes React reutilizables
Ôöé   Ôö£ÔöÇÔöÇ pages/                    ÔåÉ Rutas (Next.js Pages Router)
Ôöé   Ôö£ÔöÇÔöÇ hooks/                    ÔåÉ Custom hooks React
Ôöé   Ôö£ÔöÇÔöÇ styles/                   ÔåÉ CSS Modules + globals
Ôöé   Ôö£ÔöÇÔöÇ utils/                    ÔåÉ Helpers JS para Next.js
Ôöé   ÔööÔöÇÔöÇ public/                   ÔåÉ Archivos est├íticos
Ôö£ÔöÇÔöÇ index.html                    ÔåÉ Dashboard administrativo
Ôö£ÔöÇÔöÇ home.html                     ÔåÉ P├ígina de inicio
Ôö£ÔöÇÔöÇ marketing.html                ÔåÉ Gesti├│n de promociones y cupones
Ôö£ÔöÇÔöÇ user-public.html              ÔåÉ Vista p├║blica de usuario
Ôö£ÔöÇÔöÇ .env.example                  ÔåÉ Variables de entorno de referencia
ÔööÔöÇÔöÇ EJECUTAR-SISTEMA.bat          ÔåÉ Script para iniciar el sistema en Windows
```

---

## 4. Configuraci├│n y Variables de Entorno

Archivo: `.env.local` (basado en `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_USE_SUPABASE=true        # false = modo localStorage (legacy)
SUPABASE_SERVICE_ROLE_KEY=           # NUNCA exponer en cliente, solo scripts servidor
```

**Regla cr├¡tica**: `SUPABASE_SERVICE_ROLE_KEY` JAM├üS debe usarse en el browser ni en c├│digo client-side. Solo en scripts de migraci├│n o server-side.

---

## 5. Base de Datos ÔÇö Esquema Supabase

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
imagen TEXT                   -- URL Supabase Storage o data URL (transici├│n)
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

### Tabla `pedidos` (internos / producci├│n)
```sql
id BIGSERIAL PRIMARY KEY
producto_id BIGINT ÔåÆ productos.id
fecha DATE NOT NULL
cantidad NUMERIC NOT NULL
cliente TEXT
observaciones TEXT
estado TEXT  -- 'pendiente' | 'en_proceso' | 'completado' | 'entregado'
```

### Tabla `pedidos_catalogo` (pedidos de clientes p├║blicos)
```sql
id BIGSERIAL PRIMARY KEY
cliente_nombre TEXT NOT NULL
cliente_apellido TEXT
cliente_telefono TEXT
cliente_email TEXT
cliente_direccion TEXT
productos JSONB              -- [{productId, name, price, quantity, measures, subtotal}]
metodo_pago TEXT             -- 'transferencia' | 'whatsapp' | 'retiro'
estado_pago TEXT             -- 'sin_se├▒a' | 'se├▒a_pagada' | 'pagado'
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
config JSONB                 -- configuraci├│n espec├¡fica por tipo de promo
```

### Tabla `cupones`
```sql
id BIGSERIAL PRIMARY KEY
code TEXT NOT NULL UNIQUE    -- c├│digo alfanum├®rico uppercase (ej: 'VERANO20')
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
pedido_catalogo_id BIGINT ÔåÆ pedidos_catalogo.id
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

**RLS activo en todas las tablas.** Pol├¡ticas clave:
- `productos` con `publicado = true` ÔåÆ lectura p├║blica.
- `cupones` con `active = true` ÔåÆ lectura p├║blica.
- `pedidos_catalogo` ÔåÆ INSERT p├║blico (cualquier cliente puede crear).
- Operaciones admin ÔåÆ requieren autenticaci├│n (en desarrollo).

---

## 6. Patrones y Convenciones de C├│digo

### 6.1 JavaScript (vanilla ÔÇö `js/`)

```js
// Ô£à Correcto
const items = JSON.parse(localStorage.getItem('productosBase') || '[]')
const precio = formatCurrency(producto.precio_unitario)

// ÔØî Incorrecto
var items = ...   // nunca var
console.log(...)  // nunca en producci├│n
```

**Reglas:**
- `const`/`let` siempre. `var` nunca.
- Arrow functions para callbacks.
- `escapeHtml()` SIEMPRE antes de insertar contenido din├ímico en el DOM.
- `guardarProductos()` despu├®s de TODA mutaci├│n de `productosBase` o `pedidos`.
- `safeLocalStorageSetItem()` para guardar pedidos con comprobantes (maneja `QuotaExceededError`).
- Sin `console.log` en producci├│n.

### 6.2 Patr├│n Dual: Supabase Ôåö localStorage

El proyecto opera en dos modos seg├║n `NEXT_PUBLIC_USE_SUPABASE`:

```js
// Detectar modo activo
function isSupabaseEnabled() {
  return window.KOND_USE_SUPABASE === true
      || process.env?.NEXT_PUBLIC_USE_SUPABASE === 'true'
}

// Patr├│n est├índar: siempre intentar Supabase, fallback a localStorage
async function loadProductos() {
  if (isSupabaseEnabled() && window.supabaseClient) {
    try {
      const { data, error } = await supabase.from('productos').select('*')
      if (error) throw error
      return data
    } catch (err) {
      console.error('Supabase fall├│, usando localStorage:', err)
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
| `pedidos` | Array de pedidos de producci├│n |
| `pedidosCatalogo` | Array de pedidos de clientes |
| `cart` | Carrito activo |
| `marketing_promotions` | Array de promociones |
| `marketing_coupons` | Array de cupones |
| `notifications` | Array de notificaciones (m├íx 300) |

### 6.3 Motor de Promociones (`js/promo-engine.js`)

- Se aplican **TODAS** las promociones activas a un producto (no solo la primera).
- Descuentos porcentuales son acumulativos (compounding): `precio * 0.8 * 0.9 = 28% dto`.
- Para `buy_x_get_y`: solo se aplica el primero encontrado.
- Para `fixed_price`: se usa el precio m├ís bajo entre todas las promos.
- Resultado: `{ finalPrice, badges[], discountPercent }`.
- **Orden de carga**: `promo-engine.js` DEBE cargarse ANTES que `catalog.js`.

### 6.4 Cupones

```js
// Estructura de cup├│n
{
  code: 'VERANO20',         // uppercase, alfanum├®rico
  type: 'percentage',       // 'percentage' | 'fixed'
  value: 20,                // 20% o $20 fijo
  minAmount: 5000,          // monto m├¡nimo (opcional)
  minQuantity: 2,           // cantidad m├¡nima de items (opcional)
  startDate: '2025-12-01',  // opcional
  endDate: '2025-12-31',    // opcional
  active: true
}
```

### 6.5 Comprobantes de Pago

1. **Modo Supabase**: subir a bucket `comprobantes` ÔåÆ guardar URL en `pedidos_catalogo.comprobante_url`.
2. **Modo localStorage**: guardar como dataURL base64. Si lanza `QuotaExceededError`, usar `savePedidosCatalogoSafely()` que omite el comprobante y marca `comprobante_omitido: true`.

### 6.6 Calendario (checkout transferencia)

- Domingo: NO seleccionable.
- S├íbado: permitido.
- D├¡a actual: NO seleccionable.
- M├®todo env├¡o: fecha m├¡nima = hoy + 2 d├¡as.

### 6.7 Next.js (`next-app/`)

```js
// Ô£à Importar cliente Supabase
import { supabase, USE_SUPABASE } from '../supabase/client'

// Ô£à Manejo de errores Supabase siempre con destructuring
const { data, error } = await supabase.from('productos').select('*')
if (error) throw error

// Ô£à Server Components vs Client Components
// Usa 'use client' solo cuando necesites hooks, eventos o browser APIs
'use client'
```

---

## 7. Funciones Clave

### `js/utils.js`
| Funci├│n | Descripci├│n |
|---------|-------------|
| `escapeHtml(text)` | Sanitiza HTML antes de insertar en DOM |
| `formatCurrency(value)` | Formatea como ARS (Intl.NumberFormat) |
| `guardarProductos()` | Persiste `productosBase` y `pedidos` en localStorage |
| `safeLocalStorageSetItem(key, obj, opts)` | Guarda en localStorage manejando QuotaExceededError |
| `savePedidosCatalogoSafely(pedidos)` | Wrapper para guardar pedidos sin romper por cuota |
| `showCustomConfirm(title, msg, onConfirm)` | Modal de confirmaci├│n (reemplaza `confirm()`) |
| `showCustomAlert(title, msg, type, onClose)` | Modal de alerta (reemplaza `alert()`) |
| `showNotification(message, type)` | Toast de notificaci├│n |
| `addNotification({title, body, date})` | Agrega notificaci├│n persistente |
| `timeToMinutes(str)` | Convierte 'HH:MM:SS' a minutos |
| `minutesToTime(min)` | Convierte minutos a 'HH:MM:SS' |
| `isSupabaseEnabled()` | Detecta si el modo Supabase est├í activo |
| `saveProductos(productos)` | Wrapper dual: Supabase o localStorage |
| `loadProductos()` | Wrapper dual: Supabase o localStorage |
| `savePedidoCatalogo(pedido, file)` | Guarda pedido + sube comprobante |

### `supabase/client.js`
| Export | Descripci├│n |
|--------|-------------|
| `supabase` | Cliente Supabase configurado |
| `USE_SUPABASE` | Boolean: modo activo |
| `isSupabaseConfigured()` | Verifica credenciales |
| `uploadFile(file, bucket, path)` | Sube archivo a Storage |
| `deleteFile(bucket, path)` | Elimina archivo de Storage |
| `getCurrentUser()` | Obtiene usuario autenticado |

---

## 8. Reglas para AI Assistants (opencode / Copilot)

### Al generar c├│digo nuevo:
1. **Verificar el modo de persistencia**: ┬┐Supabase o localStorage? Siempre usar el patr├│n dual con fallback.
2. **Campos de BD**: usar `snake_case` en Supabase, `camelCase` en el frontend. Convertir al pasar entre capas.
3. **RLS**: no asumir que cualquier operaci├│n est├í permitida. Las operaciones admin requieren sesi├│n.
4. **Modales**: nunca usar `alert()` ni `confirm()` nativos. Usar `showCustomAlert()` y `showCustomConfirm()`.
5. **Im├ígenes**: pueden ser URL de Supabase Storage o data URL base64 (durante transici├│n). Manejar ambos.
6. **Seguridad**: siempre `escapeHtml()` antes de `.innerHTML`. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente.

### Al modificar datos estructurales:
- Si agreg├ís campos a `pedidos_catalogo`, actualizar: schema.sql, el render admin, y los wrappers de `utils.js`.
- Si cambi├ís el formato de un campo Supabase, verificar el mapeo en `loadProductos()` / `saveProductos()`.
- Si agreg├ís una tabla nueva, agregar pol├¡tica RLS correspondiente.

### Orden de carga de scripts en HTML vanilla:
```
utils.js ÔåÆ supabase-init.js ÔåÆ promo-engine.js ÔåÆ [m├│dulo espec├¡fico] ÔåÆ main.js
```

### Convenciones de commit:
```
feat: descripci├│n corta en presente
fix: descripci├│n corta
refactor: descripci├│n corta
docs: descripci├│n corta
```

---

## 9. Tareas Frecuentes

| Tarea | D├│nde ir |
|-------|----------|
| Agregar producto | `js/products.js` ÔåÆ listener del formulario `addProduct` |
| Modificar visibilidad de producto | `js/database.js` ÔåÆ `showToggleVisibilityModal()` |
| Editar calendario | `js/calendar.js` + `js/catalog.js` ÔåÆ `renderAvailabilityCalendar()` |
| Agregar tipo de promoci├│n | `js/promo-engine.js` + `js/marketing.js` |
| Validar cup├│n en checkout | `js/catalog.js` ÔåÆ secci├│n de validaci├│n de cupones |
| Migrar datos localStorage ÔåÆ Supabase | `supabase/migrate-data.js` |
| Cambiar pol├¡ticas RLS | `supabase/schema.sql` ÔåÆ secci├│n POL├ìTICAS RLS |

---

## 10. Debugging R├ípido

```
# Inspeccionar localStorage
DevTools > Application > Local Storage > localhost
Claves: productosBase, pedidos, pedidosCatalogo, cart, marketing_promotions, marketing_coupons

# Verificar conexi├│n Supabase
console.log(window.supabaseClient) // debe existir si est├í configurado
console.log(window.KOND_USE_SUPABASE) // debe ser true en modo Supabase

# Errores comunes
QuotaExceededError ÔåÆ usar savePedidosCatalogoSafely(), o activar Supabase
"No se guardan datos" ÔåÆ verificar .env.local y que el schema SQL fue ejecutado
"Im├ígenes no cargan" ÔåÆ verificar bucket 'productos' es p├║blico en Supabase Storage
```

---

## 11. Checklist Antes de Commits

- [ ] No hay `console.log` en c├│digo de producci├│n.
- [ ] Todo contenido din├ímico en DOM pasa por `escapeHtml()`.
- [ ] Mutaciones de estado van seguidas de la funci├│n de persistencia correspondiente.
- [ ] Si se modific├│ el modelo de datos, se actualizaron los wrappers dual (Supabase + localStorage).
- [ ] Flujo completo de checkout testeado manualmente (transferencia, WhatsApp, retiro).
- [ ] No se exponen claves secretas (`SUPABASE_SERVICE_ROLE_KEY`) en c├│digo cliente.
- [ ] Pol├¡ticas RLS revisadas si se agregaron tablas o columnas sensibles.

---

*├Ültima actualizaci├│n: 2026-04-12 ÔÇö Stack: Next.js 16 + React 19 + Supabase + Vanilla JS*
