## Sistema KOND - Gestión de Producción

### Stack actual
- **Frontend / SSR**: Next.js 16 + React 19 — todo en `next-app/`
- **Base de datos**: Supabase (PostgreSQL) — fuente de verdad principal
- **Auth**: Supabase Auth + tabla `usuarios` con roles
- **Storage**: Supabase Storage (imágenes de productos)
- **Emails**: Resend (via `fetch` a su API REST, sin SDK npm)
- **Legacy archivado**: La carpeta raíz (`index.html`, `js/`, `css/`) es el sistema original basado en localStorage. No modificar esos archivos; son referencia histórica.

---

## Estructura de directorios (`next-app/`)

```
next-app/
├── pages/
│   ├── _app.js / _document.js
│   ├── index.js              ← redirige a /home
│   ├── home.js               ← landing pública
│   ├── admin/                ← todas las páginas admin (ver tabla abajo)
│   ├── catalog/              ← catálogo público + checkout
│   └── api/                  ← API Routes (ver tabla abajo)
├── components/               ← UI compartida
├── hooks/                    ← hooks React reutilizables
├── utils/                    ← módulos Supabase + helpers
├── styles/                   ← CSS Modules + globals
├── scripts/                  ← scripts operativos Node.js
└── migrations/               ← migraciones SQL
```

---

## Rutas de páginas

### Admin (`/admin/*`) — todas protegidas con `withAdminAuth`

| Ruta | Archivo | Descripción |
|---|---|---|
| `/admin` | `admin/index.js` | Redirige a `/admin/dashboard` |
| `/admin/login` | `admin/login.js` | Login con Supabase Auth |
| `/admin/dashboard` | `admin/dashboard.js` | Stats y resumen general |
| `/admin/products` | `admin/products.js` | CRUD de productos |
| `/admin/pedidos` | `admin/pedidos.js` | Pedidos internos de producción |
| `/admin/orders` | `admin/orders.js` | Pedidos del catálogo público |
| `/admin/orders/detalle-pedido/[id]` | `admin/orders/detalle-pedido/[id].js` | Detalle de pedido catálogo |
| `/admin/finanzas` | `admin/finanzas.js` | Módulo financiero |
| `/admin/materiales` | `admin/materiales.js` | Inventario de materiales |
| `/admin/marketing` | `admin/marketing.js` | Promociones y cupones |
| `/admin/metricas` | `admin/metricas.js` | Métricas generales |
| `/admin/metricas-pedidos` | `admin/metricas-pedidos.js` | Métricas de pedidos |
| `/admin/metricas-productos` | `admin/metricas-productos.js` | Métricas de productos |
| `/admin/calendar` | `admin/calendar.js` | Calendario de producción |
| `/admin/catalog-styles` | `admin/catalog-styles.js` | Editar estilos del catálogo público |
| `/admin/payment-config` | `admin/payment-config.js` | Configuración de métodos de pago |
| `/admin/cotizaciones` | `admin/cotizaciones.js` | Cotizaciones de corte |
| `/admin/mi-cuenta` | `admin/mi-cuenta.js` | Perfil del administrador |

### Catálogo público (`/catalog/*`)

| Ruta | Archivo | Descripción |
|---|---|---|
| `/home` | `pages/home.js` | Landing page pública |
| `/catalog` | `pages/catalog.js` | Listado general del catálogo |
| `/catalog/[category]` | `catalog/[category]/index.js` | Catálogo filtrado por categoría |
| `/catalog/[category]/[product]` | `catalog/[category]/[product].js` | Detalle de producto |
| `/catalog/mi-carrito` | `catalog/mi-carrito/` | Carrito de compras |
| `/catalog/mis-pedidos` | `catalog/mis-pedidos.js` | Historial de pedidos del cliente |
| `/catalog/user/perfil` | `catalog/user/perfil.js` | Perfil del cliente |
| `/catalog/register` | `catalog/register.js` | Registro de cliente |
| `/catalog/auth/confirm` | `catalog/auth/confirm.js` | Confirmación de email (Supabase Auth) |

---

## Rutas API (`pages/api/`)

| Método | Ruta | Archivo | Descripción |
|---|---|---|---|
| GET | `/api/productos` | `productos/index.js` | Lista productos desde Supabase |
| POST | `/api/productos/create` | `productos/create.js` | Crea un producto |
| GET | `/api/pedidos/catalogo` | `pedidos/catalogo.js` | Lista pedidos catálogo |
| GET/PUT | `/api/pedidos/catalogo/[id]` | `pedidos/catalogo/[id].js` | Obtiene/actualiza pedido catálogo |
| GET/PUT/DELETE | `/api/pedidos-catalogo/[id]` | `pedidos-catalogo/[id].js` | CRUD pedido (ruta alternativa) |
| GET | `/api/pedidos-catalogo/by-email` | `pedidos-catalogo/by-email.js` | Pedidos por email de cliente |
| POST | `/api/send-order-email` | `send-order-email.js` | Envía email transaccional via Resend |
| GET/POST | `/api/admin/finanzas` | `admin/finanzas.js` | Operaciones financieras (server-side) |
| GET/PUT | `/api/admin/payment-config` | `admin/payment-config.js` | Config de métodos de pago |
| POST | `/api/admin/catalog-styles` | `admin/catalog-styles.js` | Actualiza estilos del catálogo |
| GET | `/api/notifications` | `notifications/index.js` | Lista notificaciones |
| POST | `/api/notifications/create-order` | `notifications/create-order.js` | Crea notificación de pedido |
| GET | `/api/usuarios/find` | `usuarios/find.js` | Busca usuario por username |
| GET/PUT | `/api/usuarios/[id]` | `usuarios/[id].js` | Obtiene/actualiza usuario |
| POST | `/api/auth/login` | `auth/login.js` | Endpoint de login |
| GET | `/api/supabase/signed-url` | `supabase/signed-url.js` | URL firmada para Supabase Storage |
| GET | `/api/health` | `health.js` | Health check general |
| GET | `/api/diagnostico` | `diagnostico.js` | Diagnóstico del sistema |
| GET | `/api/check-env` | `check-env.js` | Verifica variables de entorno |

---

## Persistencia (Supabase)

Supabase es la fuente de verdad. El `localStorage` ya no se usa como almacenamiento principal.

**Tablas activas:**

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo de productos |
| `pedidos_catalogo` | Pedidos realizados desde el catálogo público |
| `pedidos_catalogo_items` | Ítems de cada pedido (tabla relacionada) |
| `pedidos_internos` | Pedidos internos de producción |
| `usuarios` | Usuarios del sistema con roles |
| `materiales` | Inventario de materiales |
| `promociones` | Promociones vigentes |
| `cupones` | Cupones de descuento |
| `movimientos_financieros` | Registro de movimientos financieros |
| `categorias_financieras` | Categorías para clasificar movimientos |
| `notifications` | Notificaciones del sistema |
| `catalog_styles` | Configuración visual del catálogo público |
| `payment_config` | Configuración de métodos de pago |
| `cotizaciones_corte` | Cotizaciones de trabajos de corte |

**Clientes Supabase** (`next-app/utils/supabaseClient.js`):
- `supabase` — cliente anon/public para operaciones del lado del cliente
- `supabaseAdmin()` — cliente con service role para API routes server-side (operaciones privilegiadas, bypass de RLS)

---

## Modelos de datos

### Producto (schema Supabase, snake_case)
```js
{
  id: Number,
  nombre: String,
  categoria: String,
  tipo: String,
  medidas: String,
  tiempo_unitario: String,       // 'HH:MM:SS'
  publicado: Boolean,            // visible en catálogo
  hidden_in_productos: Boolean,  // oculto en vista interna
  unidades_por_placa: Number,
  uso_placas: Number,
  costo_placa: Number,
  costo_material: Number,
  material_id: Number,           // FK a materiales
  margen_material: Number,
  precio_unitario: Number,
  precio_promos: Number,
  unidades: Number,
  stock: Number,
  active: Boolean,
  imagenes_urls: String[],       // array de URLs en Supabase Storage
}
```

> El mapeo camelCase ↔ snake_case está en `next-app/utils/supabaseProducts.js`.

### Pedido catálogo (Supabase)
```js
// Tabla pedidos_catalogo — columnas planas (no objeto cliente anidado)
{
  id: Number,
  cliente_nombre: String,
  cliente_apellido: String,
  cliente_email: String,
  cliente_telefono: String,
  cliente_direccion: String,
  metodo_pago: 'transferencia' | 'whatsapp' | 'retiro',
  estado_pago: 'sin_seña' | 'seña_pagada' | 'pagado',
  estado: 'pendiente' | 'confirmado' | 'listo' | 'entregado',
  comprobante_url: String | null,  // URL en Supabase Storage
  fecha_creacion: ISOString,
  fecha_solicitud_entrega: 'YYYY-MM-DD' | null,
  total: Number,
}
// Items en tabla relacionada: pedidos_catalogo_items
// { id, pedido_id, producto_id, nombre, precio, cantidad, medidas }
```

### Pedido interno (`pedidos_internos`)
```js
{
  id: Number,
  nro_pedido: String,
  asignado_al_calendario: Boolean,
  fecha_asignada_calendario: 'YYYY-MM-DD' | null,
  precio_unitario: Number,
  precio_total: Number,
  tiempo_estimado: String,  // 'HH:MM:SS'
  // ... campos estándar de cliente y producto
}
```

---

## Autenticación

**Sistema activo**: `next-app/utils/supabaseAuthV2.js`

Flujo:
1. Usuario ingresa `username`
2. Se busca en tabla `usuarios` → se obtiene el UUID del usuario
3. Se construye email virtual: `<uuid>@kond.local`
4. Se llama a `supabase.auth.signInWithPassword()` con ese email
5. La sesión es manejada por Supabase

**Roles** (definidos en `next-app/utils/permissions.js`): `admin`, `super_admin`, `cliente`

**Protección de páginas admin**: HOC `next-app/components/withAdminAuth.js`
- Verifica sesión activa con `supabaseAuthV2.getCurrentSession()`
- Verifica `session.user.rol === 'admin'` (o `super_admin`)
- Redirige a `/admin/login` si no pasa la validación
- Uso: `export default withAdminAuth(MiPaginaAdmin)`

---

## Emails transaccionales (Resend)

**Endpoint**: `next-app/pages/api/send-order-email.js`

- Sin SDK npm — usa `fetch` a `https://api.resend.com/emails`
- Se dispara cuando un pedido catálogo cambia a estado `confirmado` o `listo`
- Obtiene datos del pedido desde Supabase (tabla `pedidos_catalogo` + `pedidos_catalogo_items`)
- Genera HTML del email internamente

**Variables de entorno requeridas:**
```
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Documentación adicional: `next-app/RESEND-SETUP.md`

---

## Componentes clave (`next-app/components/`)

| Componente | Descripción |
|---|---|
| `withAdminAuth.js` | HOC que protege páginas admin verificando sesión y rol |
| `Layout.js` | Layout principal con sidebar y header para páginas admin |
| `PublicLayout.js` | Layout para páginas públicas (catálogo, landing) |
| `AvailabilityCalendar.js` | Calendario de disponibilidad para checkout |
| `NotificationsProvider.js` | Context provider del sistema de notificaciones |
| `NotificationsSystem.js` | UI del sistema de notificaciones |
| `PedidoCard.js` | Tarjeta de pedido para vista admin |
| `PedidosModal.js` | Modal de detalle/edición de pedido |
| `ProductDetail.js` | Componente de detalle de producto |
| `UserOrderCard.js` | Tarjeta de pedido para vista cliente |
| `ConfirmDialog.js` / `ConfirmModal.js` | Diálogos de confirmación reutilizables |
| `marketing/PromoCard.js` | Tarjeta de promoción |
| `marketing/CouponCard.js` | Tarjeta de cupón |

---

## Utils / Módulos Supabase (`next-app/utils/`)

### Módulos por entidad (operaciones CRUD sobre Supabase)
| Módulo | Entidad |
|---|---|
| `supabaseClient.js` | Inicialización de clientes Supabase |
| `supabaseAuthV2.js` | Auth activa (sistema en uso) |
| `supabaseProducts.js` / `supabaseProductos.js` | Productos (hay dos versiones en transición) |
| `supabasePedidos.js` | Pedidos catálogo |
| `supabasePedidosInternos.js` | Pedidos internos |
| `supabaseFinanzas.js` | Movimientos financieros |
| `supabaseMateriales.js` | Materiales |
| `supabaseMarketing.js` | Promociones y cupones |
| `supabaseNotifications.js` | Notificaciones |
| `supabaseCatalogStyles.js` | Estilos del catálogo |
| `supabasePaymentConfig.js` | Config de métodos de pago |
| `supabaseCotizaciones.js` | Cotizaciones de corte |

### Helpers generales
| Módulo | Descripción |
|---|---|
| `permissions.js` | Constantes y helpers de roles |
| `adminAuth.js` | Helpers de auth para contexto admin |
| `promoEngine.js` | Motor de cálculo de promociones |
| `calculations.js` | Cálculos de producción y costos |
| `catalogUtils.js` | Utilidades del catálogo público |
| `slugify.js` | Generación de slugs para URLs |
| `metrics.js` | Cálculo de métricas |
| `filters.js` | Filtros de datos |
| `export.js` | Exportación de datos |
| `tombstoneCleanup.js` | Limpieza de registros eliminados |

---

## Hooks (`next-app/hooks/`)

| Hook | Descripción |
|---|---|
| `useAdmin.js` | Datos del dashboard admin desde Supabase, con fallback localStorage |
| `useCatalog.js` | Carga productos + promociones + materiales desde Supabase |
| `useToast.js` | Sistema de toast notifications |

---

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (emails transaccionales)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_BASE_URL=
```

---

## Convenciones de código

- **snake_case** en base de datos (Supabase); **camelCase** en JavaScript. Mapeo explícito en `utils/supabaseProducts.js`.
- Las API Routes que necesitan permisos elevados usan `supabaseAdmin()` (server-side con service role).
- Toda página bajo `/admin/*` debe usar el HOC `withAdminAuth`.
- Validar y sanitizar entradas antes de insertar en Supabase (especialmente texto libre del usuario).
- Si agregás campos nuevos a una tabla, creá el archivo SQL correspondiente en `next-app/migrations/` y actualizá el módulo Supabase relacionado en `utils/`.

---

## Reglas UX / negocio

- Calendario en checkout: domingo no seleccionable, sábado permitido, el día actual no es seleccionable. Para envíos, fecha mínima = hoy + 2 días.
- Pago por transferencia: se solicita una seña del 50%. El comprobante se sube a Supabase Storage.
- Promociones: el cálculo se realiza en `utils/promoEngine.js` tanto en el cliente como en la API.

---

## Dev workflow

```bash
cd next-app
npm run dev       # inicia servidor de desarrollo en localhost:3000
```

**Scripts operativos** (`next-app/scripts/`): scripts Node.js para tareas de mantenimiento como `create-admin.js`, `reset-admin-password.js`, `fix-admin-role.js`, `check-rls-policies.js`, `backfill-precio-promos.js`, entre otros. Ejecutar con `node scripts/<archivo>.js` desde `next-app/`.

**Inspección de DB**: Supabase Dashboard → Table Editor o SQL Editor.

---

## Skills disponibles

Estas skills contienen patrones probados y deben leerse **antes** de implementar la tarea correspondiente (usar `read_file` en el SKILL.md antes de generar código).

| Skill | Cuándo usarla | Ruta |
|---|---|---|
| `api-route-supabase` | Crear un nuevo endpoint en `pages/api/` que lea o escriba en Supabase | `.github/skills/api-route-supabase/SKILL.md` |
| `next-admin-page` | Crear una nueva página en `pages/admin/` con `withAdminAuth` y datos de Supabase | `.github/skills/next-admin-page/SKILL.md` |
| `catalog-feature-toggle` | Agregar funcionalidad ON/OFF controlada desde el admin al catálogo público | `.github/skills/catalog-feature-toggle/SKILL.md` |
| `email-transaccional` | Agregar un nuevo tipo de email transaccional usando Resend | `.github/skills/email-transaccional/SKILL.md` |
| `image-upload-compress` | Implementar subida de imagen con compresión a Supabase Storage | `.github/skills/image-upload-compress/SKILL.md` |
| `code-cleanup` | Eliminar código muerto, redundante o sin uso | `.github/skills/code-cleanup/SKILL.md` |
| `skill-manager` | Elegir o crear la skill correcta para una tarea nueva | `.github/skills/skill-manager/SKILL.md` |

---

## Checklist de QA antes de commits

- Probar flujo de checkout completo en `/catalog` (transferencia, WhatsApp, retiro).
- Verificar que las páginas admin redirigen a `/admin/login` sin sesión activa.
- Confirmar que los emails se despachan correctamente desde `/api/send-order-email`.
- Revisar el Supabase Dashboard para confirmar que los datos se persistieron correctamente.
- Si se agregaron campos nuevos a tablas, verificar que las políticas RLS permiten las operaciones necesarias.
- Para cambios en modelos de datos, actualizar el módulo Supabase correspondiente en `utils/` y agregar la migración SQL en `migrations/`.

---
Versión: actualizada 12-04-2026 — migración a Next.js 16 + Supabase + Resend como stack principal.
