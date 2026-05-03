# Archive Report: categories-subcategories

**Archived**: 2026-05-03  
**Status**: COMPLETED (4/4 PRs merged)  
**Change scope**: DB migration + Admin API + Admin UI + Public SEO routes + Tests

---

## Executive Summary

Se agregó soporte completo de categorías y subcategorías de dos niveles al catálogo de productos. El change se entregó en 4 PRs encadenados (~800 líneas totales), manteniendo backward compatibility absoluta: la columna `categoria TEXT` existente NO fue eliminada. Los productos nuevos y actualizados llevan tanto `categoria_id` (FK) como `categoria` (texto) para convivencia con código legacy del frontend estático.

**Alcance entregado:**
- Migración SQL idempotente con tabla `categorias` y FK en `productos`
- Script de mapeo one-shot para asociar productos existentes a categorías
- API REST admin CRUD completa con guards de profundidad (max 1 nivel) y referencia
- UI admin para gestión de categorías y nuevo formulario de producto
- Rutas SEO públicas con SSG + ISR 60s para `/productos/[categoria]/[slug]`
- 8 tests automatizados (slugify × 4, mapping logic × 2, API DELETE 409 × 2)

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Profundidad máxima | Validación en API (no CHECK constraint SQL) | max 2 niveles no justifica overhead de trigger o ltree |
| Slug generation | JS helper `slugify.js` (NFD + kebab) | Sin dependencias extra; control en aplicación |
| Backward compat | `categoria_id` NULLABLE + `categoria TEXT` conviven | Rollback seguro; columna texto NO eliminada |
| Auth guard API | Opcional via `ADMIN_API_SECRET` env var | Compatibilidad con rutas admin existentes sin auth server-side |
| Depth guard | parent must have `parent_id = null` (400 si depth > 1) | Cumplimiento en POST y PUT |
| DELETE guard | 409 si hay productos O subcategorías referenciando | Integridad referencial a nivel aplicación |
| Mapping script | Exact case-sensitive match; unmatched → log, no write | Consistencia; no asumir mapeos ambiguos |
| SSG routing | `getStaticPaths` + ISR revalidate 60s | SEO correcto sin rebuild completo |
| File naming | `nueva.js` / `editar.js` (no `new.js` / `edit.js`) | Consistente con convención de nombres en español del proyecto |
| producto → categoría | `categoria_id` puede apuntar a parent O subcategoría | Decisión UX confirmada durante apply |
| Tests | Node-runnable sin runner configurado (ES modules top-level await) | No hay test runner configurado en next-app; Node 20 compatible |

---

## Files Created / Modified

### New files — SQL
| File | Description |
|------|-------------|
| `sql-migrations/2026-05-02-add-categorias.sql` | Tabla `categorias`, FK `productos.categoria_id`, índices, RLS, bloque de rollback comentado |

### New files — Next.js app
| File | Description |
|------|-------------|
| `next-app/utils/slugify.js` | `slugify(text)` helper con NFD normalize + kebab; `slugifyPreserveCase` legacy export mantenido |
| `next-app/scripts/map-categoria-to-id.js` | Script dry-run/apply para migrar `categoria TEXT` → `categoria_id` |
| `next-app/pages/api/admin/categorias/index.js` | Admin API: GET list (tree), POST create (depth guard + auto-slug) |
| `next-app/pages/api/admin/categorias/[id].js` | Admin API: GET, PUT (re-slug), DELETE (409 si referencias) |
| `next-app/pages/api/categorias/index.js` | API pública: GET list sin auth, solo `activa=true` |
| `next-app/pages/admin/categorias/index.js` | Admin UI: lista árbol, delete con modal y 409 display |
| `next-app/pages/admin/categorias/nueva.js` | Admin UI: form crear categoría con slug preview en tiempo real |
| `next-app/pages/admin/categorias/[id]/editar.js` | Admin UI: form editar categoría, re-slug automático |
| `next-app/pages/admin/productos/new.js` | Admin UI: nuevo producto con selector de categoría en dos niveles |
| `next-app/pages/productos/[categoria]/index.js` | Pública SEO: listado de productos por categoría (ISR 60s) |
| `next-app/pages/productos/[categoria]/[slug].js` | Pública SEO: detalle de producto (ISR 60s, 404 en mismatch) |
| `next-app/test-product-categories.test.js` | 8 tests: slugify × 4, mapping logic × 2, DELETE 409 × 2 |

### Modified files
| File | Change |
|------|--------|
| `supabase/schema.sql` | Bloque `categorias` + columna `categoria_id` en `productos` |
| `next-app/lib/queryKeys.js` | Key `categorias: { all, list, byId, bySlug }` + staleTime 15min |
| `next-app/utils/supabaseProducts.js` | `createProducto` / `updateProducto` extendidos con `categoria_id` |
| `next-app/pages/admin/products.js` | Link agregado hacia nueva página de producto |

---

## Known Technical Debt

### 1. Auth open-in-env (media prioridad)
**Qué**: Los endpoints `/api/admin/categorias/*` tienen auth condicional vía `ADMIN_API_SECRET` env var. Si `ADMIN_API_SECRET` no está definida en el entorno, el endpoint NO valida sesión admin — comportamiento idéntico al resto de rutas admin del proyecto.  
**Por qué existe**: El proyecto no tiene auth server-side consistente en rutas admin. Agregarlo solo en estos endpoints sin refactor global sería inconsistente.  
**Riesgo**: Rutas admin expuestas sin auth si `ADMIN_API_SECRET` no está en `.env.local` / Vercel env.  
**Acción recomendada**: Definir `ADMIN_API_SECRET` en todos los entornos como medida de contención hasta que se implemente auth server-side global.

### 2. `supabaseProducts.js` con `select('*')` pre-existente
**Qué**: El archivo `next-app/utils/supabaseProducts.js` ya tenía `select('*')` antes de este change. Las modificaciones de PR 3 extendieron las funciones sin atacar este problema.  
**Por qué existe**: Estaba fuera del scope del change. Atacarlo habría aumentado la superficie de riesgo del PR.  
**Riesgo**: Egress innecesario; columnas sensibles potencialmente expuestas al cliente.  
**Acción recomendada**: Refactor separado — proyección explícita en `supabaseProducts.js` siguiendo el skill `supabase-egress-best-practices`.

### 3. `categoria TEXT` columna legacy
**Qué**: `productos.categoria` (texto libre) sigue existiendo. Nuevos productos escritos vía admin UI populan ambas columnas, pero productos existentes sin mapeo exitoso tienen `categoria_id = NULL`.  
**Acción recomendada**: Después de validar en staging con `map-categoria-to-id.js --apply`, auditar los `NO_MATCH` y resolver manualmente. Solo entonces planificar deprecar la columna texto.

### 4. Test runner no configurado
**Qué**: Los tests son runnable con `node` directo (ES modules top-level await), no con Jest/Vitest. Node produce warning sobre falta de `"type": "module"` en `package.json`.  
**Impacto**: No están integrados en el pipeline CI.  
**Acción recomendada**: Configurar Vitest en `next-app/` e integrar en CI.

---

## Rollback Instructions

### Rollback nivel SQL (si algo falla en staging post-migración)

```sql
-- ATENCIÓN: solo ejecutar si se confirma que NINGÚN producto tiene categoria_id no-null
-- o si se acepta perder esa data.

-- 1. Remover FK de productos
ALTER TABLE public.productos DROP COLUMN IF EXISTS categoria_id;

-- 2. Eliminar tabla categorias
DROP TABLE IF EXISTS public.categorias;
```

> El script de migración `sql-migrations/2026-05-02-add-categorias.sql` incluye un bloque de rollback comentado al final del archivo.

### Rollback nivel Next.js (si el deploy falla)

1. Revertir el deploy en Vercel al último build estable (botón "Redeploy" en deployments anteriores).
2. Las nuevas rutas (`/admin/categorias/*`, `/productos/[categoria]/*`) simplemente no existirán — sin impacto en rutas existentes.
3. `queryKeys.js` y `slugify.js` son aditivos; no rompen nada si se revierte el deploy.

### Rollback del mapeo (si `--apply` corrió pero se necesita deshacer)

```sql
-- Resetear categoria_id en todos los productos
UPDATE public.productos SET categoria_id = NULL;
```

---

## Staging QA Checklist

### Pre-deploy
- [ ] Ejecutar `sql-migrations/2026-05-02-add-categorias.sql` en Supabase staging
- [ ] Verificar que tabla `categorias` existe con todas las columnas
- [ ] Verificar que `productos.categoria_id` existe como NULLABLE FK
- [ ] Definir `ADMIN_API_SECRET` en env vars de staging (Vercel o `.env.local`)

### Admin UI
- [ ] `/admin/categorias` lista vacía carga sin error
- [ ] Crear categoría raíz: nombre + slug auto-generado visible
- [ ] Crear subcategoría seleccionando padre: aparece anidada en lista
- [ ] Intentar crear sub-subcategoría (depth > 1): debe retornar error 400
- [ ] Editar categoría: slug se regenera al cambiar nombre
- [ ] Eliminar categoría sin productos: exitoso
- [ ] Eliminar categoría con productos asignados: modal muestra mensaje 409
- [ ] `/admin/productos/new` carga selector de categoría en dos niveles
- [ ] Crear producto sin seleccionar categoría: validación visible, no crea
- [ ] Crear producto con subcategoría seleccionada: `categoria_id` y `categoria` (texto) guardados

### API pública
- [ ] `GET /api/categorias` retorna categorías activas sin auth
- [ ] `GET /api/categorias` no retorna categorías con `activa = false`

### SEO público
- [ ] `/productos/[categoria]` (slug de categoría válida): listado carga
- [ ] `/productos/[categoria]/[slug]` (producto válido): detalle carga
- [ ] `/productos/categoria-inexistente` → 404
- [ ] `/productos/[categoria]/slug-incorrecto` → 404
- [ ] `/productos/categoria-incorrecta/slug-valido` → 404 (mismatch de categoría)

### Tests
- [ ] `node next-app/test-product-categories.test.js` — 8 tests pasan
- [ ] CI pasa sin errores en lint

---

## Mapping Script Instructions (Staging)

El script mapea la columna `productos.categoria` (texto libre) a `productos.categoria_id` (FK) usando match exacto case-sensitive.

### Prerequisitos
1. Tabla `categorias` populada con las categorías reales del negocio
2. Env vars disponibles: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (o en `.env.local`)

### Paso 1 — Dry run (sin escrituras)

```bash
cd next-app
node scripts/map-categoria-to-id.js --dry-run
```

Revisar el output:
- Líneas `MATCH` — serán actualizadas en `--apply`
- Líneas `NO_MATCH` — quedarán con `categoria_id = NULL`; resolver manualmente
- Línea `SUMMARY` — totales

### Paso 2 — Validar NO_MATCH

Para cada `NO_MATCH`, decidir:
- **Crear la categoría faltante** en admin UI → repetir dry-run hasta que los matches sean los esperados
- **Dejar como NULL** y mapear manualmente producto por producto desde la UI

### Paso 3 — Apply (escribe en DB)

```bash
node scripts/map-categoria-to-id.js --apply
```

Verificar en Supabase que las filas mapeadas tienen `categoria_id` correcto.

### Paso 4 — Auditoría post-apply

```sql
-- Productos que quedaron sin mapear
SELECT id, nombre, categoria FROM public.productos WHERE categoria_id IS NULL;
```

---

## PR Chain Summary

| PR | Branch | Commits | Scope |
|----|--------|---------|-------|
| PR 1 Foundation | `feat/categories-pr1-foundation` | `53a5b31`, `f0521fc` | SQL migration, schema.sql, queryKeys, slugify |
| PR 2 API | `feat/categories-pr2-api` | `76c16a4`, `0486c53` | Admin API CRUD + public API + mapping script |
| PR 3 Admin UI | `feat/categories-pr3-admin-ui` | `da1595d`, `0cfc56d` | Gestión de categorías + nueva página de producto |
| PR 4 SEO + Tests | `feat/categories-pr4-seo-tests` | `4cb4ccc` | Rutas públicas SEO + 8 tests pasando |

---

## SDD Cycle Complete

Change `categories-subcategories` completado, verificado y archivado.  
Todas las tareas marcadas ✅. Deuda técnica documentada. Checklist QA y runbook de rollback incluidos.
