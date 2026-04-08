# Sistema KOND — Guía para agente IA

## Arquitectura del proyecto

El proyecto tiene **dos capas que coexisten**:

| Capa | Directorio | Descripción |
|------|------------|-------------|
| SPA estática (legado) | `/` (raíz) | HTML/CSS/JS vanilla, sin bundler. Persiste en `localStorage`. |
| App Next.js (activa) | `next-app/` | Next.js 15 + React 19 + Supabase. Destino final de la migración. |

**El trabajo nuevo se hace en `next-app/`.** Los archivos de la raíz (`index.html`, `catalog.html`, etc.) son referencia/legado.

## Build y comandos de desarrollo

Todos los comandos se ejecutan **desde `next-app/`**. Requiere Node 22.x.

```bash
cd next-app
npm run dev        # Servidor local en :3000 (con polling para Windows)
npm run build      # Build de producción
npm run start      # Servidor producción en :3000
npm run test:prod  # Build + start en :3001
```

En Windows usar `EJECUTAR-SISTEMA.bat` o `start-dev.bat` en `next-app/`.

## Stack tecnológico (next-app)

- Next.js 15 · React 19 · `@supabase/supabase-js` 2.80
- `bcryptjs` para hash de contraseñas (solo en API routes)
- Sin ORM — queries Supabase directo
- CSS: `postcss-preset-env` (sin Tailwind en versión actual)
- Deployment: Vercel (ver `next-app/vercel.json`)

## Variables de entorno requeridas

Crear `next-app/.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_USE_SUPABASE=true
SUPABASE_SERVICE_ROLE_KEY=...          # Solo en API routes, NUNCA en cliente
RESEND_API_KEY=re_...                  # Email transaccional
RESEND_FROM_EMAIL="KOND <pedidos@tudominio.com>"
```

Ver `next-app/.env.example` y `next-app/RESEND-SETUP.md`.

## Estructura de `next-app/`

```
pages/
  admin/          ← Páginas protegidas (panel, productos, pedidos, finanzas…)
  api/            ← API routes: auth/, pedidos/, pedidos-catalogo/, productos/…
  catalog/        ← Catálogo público
components/
  withAdminAuth.js      ← HOC que protege todas las páginas en pages/admin/
  Layout.js             ← Layout principal con sidebar
  AvailabilityCalendar.js
  PedidoCard.js / PedidosModal.js
utils/
  supabaseClient.js     ← Cliente Supabase (público + admin service-role)
  supabaseAuthV2.js     ← loginWithUsername(), getCurrentSession(), logout()
  supabaseProductos.js / supabasePedidos.js / supabaseMarketing.js  ← helpers por entidad
  utils.js              ← formatCurrency(), escapeHtml(), minutesToTime(), safeLocalStorageSetItem()
hooks/
  useAdmin.js / useCatalog.js / useToast.js
```

Documentación adicional: `next-app/README.md`, `next-app/migrations/README.md`, `supabase/README-SUPABASE-BOOTSTRAP.md`.

## Autenticación (next-app)

1. **Login:** `POST /api/auth/login { username, password }` → verifica en tabla `usuarios` con `bcryptjs`, guarda `kond-user` en `localStorage`.
2. **Protección de páginas admin:** envolver con `withAdminAuth`:
   ```js
   import withAdminAuth from '../../components/withAdminAuth'
   export default withAdminAuth(MiPaginaAdmin)
   ```
3. **Verificación de sesión:** `getCurrentSession()` desde `utils/supabaseAuthV2.js`. Acepta `kond-user` o `adminSession` (fallback legado).
4. **Supabase Auth:** usa email temporal `<uuid>@kond.local`; el usuario real vive en tabla `usuarios`.

## Convenciones de código (next-app)

- **PascalCase** para componentes React. **camelCase** para funciones y variables.
- Cada página Next.js evita hydration mismatch con `useState(false)` / `setMounted(true)` en `useEffect`:
  ```js
  if (!mounted) return <LoadingSpinner />
  ```
- Import del cliente Supabase: `import supabase from '../utils/supabaseClient'`
- Import de funciones utilitarias: `import { formatCurrency, escapeHtml } from '../utils/utils'`
- Siempre exportar páginas envueltas en `withAdminAuth` para rutas admin.

## Persistencia y fallbacks

- **Fuente de verdad:** Supabase (PostgreSQL).
- **Fallback:** `localStorage` si Supabase no está disponible. Patrón:
  ```js
  try {
    const { data, error } = await getAllProductos()
    if (error) throw error
    return data
  } catch {
    return JSON.parse(localStorage.getItem('productosBase') ?? '[]')
  }
  ```
- **`QuotaExceededError`:** al guardar comprobantes (dataURL base64), usar `safeLocalStorageSetItem()` de `utils/utils.js`. Si falla, marcar pedido con `_comprobanteOmitted: true`.
- **claves `localStorage` canónicas:** `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`, `kond-user`, `theme`, `notifications`.

## Migraciones de base de datos

Los archivos SQL están en `supabase/` (raíz) y `next-app/supabase-migrations/`. Para aplicar un schema nuevo:
1. Ejecutar `supabase/schema.sql` en el proyecto Supabase.
2. Aplicar `ALTER TABLE` adicionales de `supabase/add-*.sql` según corresponda.
3. Ver `next-app/migrations/README.md` para el proceso paso a paso.

Si se agrega un campo nuevo a `pedidos_catalogo` o `productos`, actualizar también los helpers de `utils/supabase*.js` que leen/escriben esa entidad.

## Reglas de negocio críticas

- **Calendario de entrega:** domingo no disponible; día actual no seleccionable; método 'envío' requiere mínimo hoy +2 días. Ver `components/AvailabilityCalendar.js`.
- **Seña:** checkout por transferencia requiere 50% de seña. Comprobante se adjunta como dataURL.
- **`SUPABASE_SERVICE_ROLE_KEY`** nunca debe exportarse al cliente; solo usarla en `pages/api/`.
- Usar `escapeHtml()` siempre que se inserte contenido de usuario en el DOM (SPA legado) o innerHTML.

## Gotchas frecuentes

| Problema | Solución |
|----------|----------|
| Hydration mismatch `#418` | Agregar patrón `mounted` en el componente |
| RLS silencia queries en dev | Verificar políticas en Supabase Dashboard o `supabase/fix-usuarios-rls.sql` |
| Usuarios UUID vs INT | Ver `supabase/migrate-usuarios-uuid.sql`; el código actual espera UUID |
| `NEXT_PUBLIC_*` undefined | Reiniciar `next dev` después de editar `.env.local` |
| Windows: polling de archivos | El script `npm run dev` ya incluye `WATCHPACK_POLLING=true` |

---
Actualizado: 2026-04-07
