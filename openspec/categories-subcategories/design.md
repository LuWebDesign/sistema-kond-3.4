# Design: categories-subcategories

## Technical Approach

Agregar tabla `categorias` con auto-referencia (`parent_id`), limitar profundidad a 1 nivel por constraint de aplicación (no DB), y añadir FK `categoria_id` en `productos` manteniendo `categoria TEXT` como fallback. API routes CRUD en `/api/admin/categorias`. Rutas públicas SEO via `[categoria]/[slug]`. Script de mapeo one-shot para migración.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Profundidad máxima | Validación en API (no CHECK constraint) | Trigger SQL, ltree | Más simple; max 2 niveles no justifica ltree overhead |
| Slug | Generado en JS (kebab + normalización) | Extensión pg, columna computada | Sin deps extra; control en aplicación |
| Migración | `categoria_id` NULLABLE + fallback `categoria TEXT` | Rename column, shadow table | Rollback seguro; ambas columnas conviven hasta validar |
| API shape | REST simple, un archivo por recurso | Single handler con `action` param | Consistente con patrón finanzas.js del proyecto |
| Routing SEO | `pages/productos/[categoria]/[slug].js` con `getStaticPaths` + ISR | SSR puro, SPA routing | SEO correcto; ISR evita rebuild completo |
| RLS categorias | Service role en API routes, `SELECT` público | Anon key en cliente | Consistent con patrón `supabaseAdmin()` del proyecto |

## Data Flow

```
Admin CRUD categorias
  Browser → POST /api/admin/categorias → supabaseAdmin() → tabla categorias
  Browser ← { id, nombre, slug, parent_id }

Admin asigna categoria a producto
  ProductForm → categoria_id (select) → PUT /api/admin/productos/:id
  invalidateQueries(['productos']) — NUNCA refetch()

Catálogo público SEO
  getStaticPaths → GET /api/categorias (public) → categorias activas
  getStaticProps → supabase server-side → productos by categoria slug + producto slug
  → page render → meta og:url = /productos/[categoria]/[slug]

Script migración (one-shot, Node)
  lee productos WHERE categoria_id IS NULL
  match exact: categorias.nombre === producto.categoria
  --dry-run: log matches + no-mapeados (no writes)
  --apply:   UPDATE productos SET categoria_id = ? WHERE id = ?
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `sql-migrations/2026-05-02-add-categorias.sql` | Create | Tabla `categorias`, FK en `productos`, índices, RLS policies |
| `next-app/scripts/map-categoria-to-id.js` | Create | Script dry-run/apply de migración |
| `next-app/lib/queryKeys.js` | Modify | Agregar `categorias` key + staleTime |
| `next-app/pages/api/admin/categorias/index.js` | Create | GET list, POST create |
| `next-app/pages/api/admin/categorias/[id].js` | Create | GET by id, PUT update, DELETE |
| `next-app/pages/api/categorias/index.js` | Create | GET público (sin auth) |
| `next-app/pages/admin/categorias/index.js` | Create | List de categorías admin |
| `next-app/pages/admin/categorias/new.js` | Create | Form crear categoría |
| `next-app/pages/admin/categorias/[id]/edit.js` | Create | Form editar categoría |
| `next-app/pages/admin/productos/new.js` | Create | Form agregar producto (con select categoría) |
| `next-app/pages/productos/[categoria]/[slug].js` | Create | Página pública SEO por producto |
| `next-app/pages/productos/[categoria]/index.js` | Create | Listado público por categoría |

## Interfaces / Contracts

### SQL — tabla `categorias`

```sql
CREATE TABLE IF NOT EXISTS public.categorias (
  id        BIGSERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES public.categorias(id) ON DELETE RESTRICT,
  activa    BOOLEAN DEFAULT true,
  orden     INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categorias_parent ON public.categorias(parent_id);
CREATE INDEX IF NOT EXISTS idx_categorias_slug   ON public.categorias(slug);
```

### SQL — columna nueva en `productos`

```sql
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON public.productos(categoria_id);
```

### queryKeys.js — nuevas keys

```js
categorias: {
  all:  ['categorias'],
  list: () => ['categorias', 'list'],
  byId: (id) => ['categorias', id],
}
// staleTime: categorias: 15 * 60 * 1000  (referencia estable)
```

### API — `/api/admin/categorias/index.js`

```
GET  → { data: [{ id, nombre, slug, parent_id, activa, orden }] }
POST { nombre, parent_id?, orden? }
     → validate: parent_id !== null → parent must have parent_id = null (max depth 1)
     → auto-generate slug = slugify(nombre)
     → { data: { id, nombre, slug, parent_id } }
```

### API — `/api/admin/categorias/[id].js`

```
GET  → { data: { id, nombre, slug, parent_id, activa, orden } }
PUT  { nombre?, activa?, orden?, parent_id? }
     → re-generate slug if nombre changed
     → { data: updated }
DELETE → 404 si tiene productos con categoria_id = id
       → { success: true }
```

### Slug generation (JS helper)

```js
// next-app/utils/slugify.js
export function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
}
```

### Script map-categoria-to-id.js

```
node next-app/scripts/map-categoria-to-id.js [--dry-run] [--apply]

Output (stdout):
  MATCH   producto_id=42  "Silla madera" → categoria_id=3 "Madera"
  NO_MATCH producto_id=99 "Sin clasificar" → categoria TEXT="Unknown"
  SUMMARY  mapped=40  no_match=3  total=43

Flags:
  --dry-run (default)  no DB writes
  --apply              executes UPDATEs with SUPABASE_SERVICE_ROLE_KEY
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | slugify(), depth-1 validation | Jest (sin runner: skip o vitest config si se agrega) |
| Integration | API routes CRUD + depth constraint | fetch + supabase local |
| Manual | Script --dry-run en staging | Revisar log antes de --apply |
| SEO | getStaticPaths genera todas las rutas | `next build` sin errores 404 |

## Migration / Rollout

1. Ejecutar `sql-migrations/2026-05-02-add-categorias.sql` en staging
2. Poblar `categorias` manualmente o vía admin UI
3. Correr `map-categoria-to-id.js --dry-run` → revisar log
4. Correr `--apply` tras validar
5. Deploy Next.js con nuevas páginas
6. Validar rutas SEO en staging (`/productos/[categoria]/[slug]`)
7. **NO eliminar `categoria TEXT`** hasta confirmar que todas las filas tienen `categoria_id`

## Open Questions

- [ ] ¿Producto puede pertenecer a subcategoría o también directamente a categoría padre? (propuesta dice subcategoría, confirmar con UX)
- [ ] ¿ISR revalidation time para páginas `/productos/[categoria]`? (propuesto: 60s)
- [ ] ¿La columna `orden` en `categorias` se edita drag-and-drop o input numérico? (afecta complejidad UI)
