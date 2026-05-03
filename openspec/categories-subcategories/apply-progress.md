# Apply Progress: categories-subcategories

## PR 1 — Foundation
- ✅ Task 1.1: `sql-migrations/2026-05-02-add-categorias.sql`
- ✅ Task 1.2: `supabase/schema.sql`
- ✅ Task 1.3: `next-app/lib/queryKeys.js`
- ✅ Task 1.4: `next-app/utils/slugify.js`
- Branch: `feat/categories-pr1-foundation`
- Commit: `53a5b31`
- Status: DONE

### Notes
- `slugify.js` already existed with `slugifyPreserveCase`. Updated it to export `slugify` as primary default and kept the legacy export as alias (same logic, no breaking change).
- `queryKeys.js`: added `categorias` key with `all`, `list`, `byId`, `bySlug` — plus `staleTime.categorias: 15min`.
- SQL migration includes rollback block (commented).
- Design decision documented: `categoria_id` can point to parent OR child category.

## PR 2 — Admin API + Mapping Script
- ✅ Task 2.1: `next-app/pages/api/admin/categorias/index.js` (GET list + POST create)
- ✅ Task 2.2: `next-app/pages/api/admin/categorias/[id].js` (GET + PUT + DELETE)
- ✅ Task 2.3: `next-app/pages/api/categorias/index.js` (public GET)
- ✅ Task 2.4: `next-app/scripts/map-categoria-to-id.js` (dry-run/apply migration script)
- Branch: `feat/categories-pr2-api`
- Commit: `76c16a4`
- Status: DONE

### Notes
- Auth guard: existing admin routes have no server-side auth. Added optional `x-admin-secret` header check using `ADMIN_API_SECRET` env var. If env var not defined, behaves identically to other admin routes (no auth check) — this is a deliberate deviation for compatibility.
- Depth guard: POST/PUT validate that parent must have `parent_id = null` (max 1 level), returns 400.
- DELETE: guards against products assigned (`categoria_id = id`) AND subcategories (`parent_id = id`), both return 409 with clear message.
- Mapping script: dry-run by default, `--apply` writes UPDATEs. Exact match case-sensitive. Accepts SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. Uses dotenv optionally.
- Public categorias route: uses supabaseAdmin (service role) + filters activa=true + Cache-Control header.

## PR 3 — Admin UI (pending)
## PR 4 — SEO + Tests (pending)
