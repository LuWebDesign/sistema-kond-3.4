---
name: supabase-egress-best-practices
description: >
  Rules to minimize Supabase egress in Sistema KOND: column projection,
  pagination, server-side filters, Cache-Control headers, and polling discipline.
  Trigger: Use when writing or reviewing any Supabase query (utils, API routes, hooks).
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use
- Writing a new Supabase utility in `next-app/utils/supabase*.js`.
- Adding or modifying a Next.js API route under `next-app/pages/api/`.
- Reviewing a hook that calls Supabase directly.
- Any PR that touches Supabase reads (must pass egress checklist before merge).

## Core Rules (non-negotiable)

### 1 — Never use `select('*')`
Always project only the columns the UI actually renders.

```js
// ❌ BAD — sends full row over the wire
const { data } = await supabase.from('productos').select('*')

// ✅ GOOD — only what the catalog card needs
const { data } = await supabase
  .from('productos')
  .select('id, nombre, precio, imagen_url, categoria, activo')
```

### 2 — Filter server-side, never client-side
Push `.eq()`, `.gte()`, `.lte()`, `.in()`, `.ilike()` to Supabase.
Never fetch all rows and filter with `.filter()` / `Array.filter()` in JS.

```js
// ❌ BAD
const all = await fetchPedidos()
const today = all.filter(p => p.fecha >= startOfDay)

// ✅ GOOD
const { data } = await supabase
  .from('pedidos')
  .select('id, total, estado, fecha')
  .gte('fecha', startOfDay.toISOString())
```

### 3 — Paginate large tables
Default page size: **50 rows** for admin lists, **20 rows** for catalog.
Always add `.range(from, to)` or `.limit(n)` unless you genuinely need all rows.

```js
const { data } = await supabase
  .from('pedidos')
  .select('id, total, estado')
  .order('created_at', { ascending: false })
  .range(0, 49)  // page 1 of 50
```

### 4 — Add Cache-Control to all API routes
Every Next.js API route that reads Supabase MUST include a `Cache-Control` header.

```js
// Frequently-changing data (products, pedidos)
res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')

// Stable reference data (materiales, proveedores)
res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
```

### 5 — Use React Query as the client-side cache (Next.js only)
Do NOT call Supabase utils directly inside React components.
Use the prebuilt hooks from `next-app/hooks/useSupabaseQuery.js`.
See `react-query-kond` skill for staleTime policy.

```js
// ❌ BAD — bypasses cache, hits Supabase on every render
const [productos, setProductos] = useState([])
useEffect(() => { fetchProductos().then(setProductos) }, [])

// ✅ GOOD — served from React Query cache, 0 Supabase calls on re-render
import { useProductosAdmin } from '@/hooks/useSupabaseQuery'
const { data: productos } = useProductosAdmin()
```

### 6 — Polling discipline
`refetchInterval` is ONLY allowed for these pages and these intervals:
| Page | Interval | Reason |
|------|----------|--------|
| admin/dashboard | 5 min | Aggregate metrics |
| admin/pedidos (live mode) | 30 s | Order tracking |

All other pages: `refetchInterval: false`. Background refetches via `invalidateQueries` only.

### 7 — Avoid duplicate utility files
The project has a known duplicate: `supabaseProducts.js` vs `supabaseProductos.js`.
Until consolidated, always import from `supabaseProducts.js` (has the `isSupabaseReady` guard).
Do NOT create new duplicate utility files.

## Egress Checklist (PR gate)
Before merging any PR that touches Supabase reads, verify:
- [ ] No `select('*')` in new or modified code
- [ ] Server-side filters applied for date ranges, status, category
- [ ] Pagination added if table can grow beyond 100 rows
- [ ] `Cache-Control` header present on every modified API route
- [ ] New data types added to `queryKeys.js` (not hardcoded in components)
- [ ] `staleTime` assigned per the locked policy in `STALE_TIMES`

## Key Files
- `next-app/lib/queryKeys.js` — QUERY_KEYS + STALE_TIMES (source of truth)
- `next-app/hooks/useSupabaseQuery.js` — prebuilt useQuery hooks
- `next-app/utils/supabaseProducts.js` — productos utility (canonical, has ready-guard)
- `next-app/utils/supabaseMarketing.js` — promociones + cupones utility
- `next-app/utils/supabasePedidos.js` — pedidos utility
- `next-app/utils/supabaseFinanzas.js` — finanzas utility (server-side date filter)
- `next-app/utils/supabaseMateriales.js` — materiales utility
- `next-app/pages/api/productos/index.js` — products API route (has Cache-Control)
- `next-app/pages/api/admin/finanzas.js` — finanzas API route (has Cache-Control)

## Notes
- The static HTML site (`js/` directory) does NOT use React Query. Egress rules 1–3 still apply to any direct Supabase calls there.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. Service-role usage is server-only (`pages/api/`).
- For checkout stock decrement: the N+1 pattern (sequential SELECT + UPDATE per item) is a known issue. Pending fix: DB-side RPC `decrement_stock(items jsonb)`.
