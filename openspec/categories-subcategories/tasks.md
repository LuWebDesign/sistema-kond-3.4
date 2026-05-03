# Tasks: categories-subcategories

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Admin API + Script) → PR 3 (Admin UI) → PR 4 (Public SEO + Tests) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + queryKeys + slugify util | PR 1 | Foundation; no UI deps |
| 2 | Admin API CRUD + mapping script | PR 2 | Depends on PR 1 |
| 3 | Admin UI pages (categorias + new product) | PR 3 | Depends on PR 2 |
| 4 | Public SEO routes + tests | PR 4 | Depends on PR 1, parallel with PR 3 |

---

## Phase 1: Foundation

- [x] 1.1 Create `sql-migrations/2026-05-02-add-categorias.sql` — tabla `categorias` (id, nombre, slug, parent_id, activa, orden, timestamps), FK `productos.categoria_id`, índices, RLS policies. ~60 lines.
- [x] 1.2 Update `supabase/schema.sql` — add tabla `categorias` block + `categoria_id` column on `productos`. ~30 lines.
- [x] 1.3 Update `next-app/lib/queryKeys.js` — add `categorias: { all, list, byId }` with staleTime 15min. ~15 lines.
- [x] 1.4 Create `next-app/utils/slugify.js` — `slugify(text)` helper (NFD normalize, kebab). ~15 lines.

**Done when**: migration applies cleanly with `IF NOT EXISTS`; queryKeys export typechecks; slugify handles accents.

---

## Phase 2: Admin API + Mapping Script

- [x] 2.1 Create `next-app/pages/api/admin/categorias/index.js` — `GET` list (explicit columns, nested subcats), `POST` create (depth guard: parent must have `parent_id = null`, auto-slug, admin auth). ~80 lines.
- [x] 2.2 Create `next-app/pages/api/admin/categorias/[id].js` — `GET`, `PUT` (re-slug on nombre change), `DELETE` (409 if products reference it, admin auth). ~80 lines.
- [x] 2.3 Create `next-app/pages/api/categorias/index.js` — public `GET` list (no auth, explicit columns, activa=true only). ~30 lines.
- [x] 2.4 Create `next-app/scripts/map-categoria-to-id.js` — reads productos WHERE `categoria_id IS NULL`, exact match vs `categorias.nombre`, `--dry-run`/`--apply` flags, logs MATCH/NO_MATCH/SUMMARY. ~80 lines.

**Done when**: `POST` with `parent_id` pointing to depth-1 returns 400; `DELETE` with products returns 409; unauthenticated returns 401; dry-run writes zero rows.

---

## Phase 3: Admin UI

- [x] 3.1 Create `next-app/pages/admin/categorias/index.js` — list view, tree display (parent + subcats), delete button with confirmation, link to nueva/editar. `invalidateQueries(['categorias', 'list'])`. ~100 lines.
- [x] 3.2 Create `next-app/pages/admin/categorias/nueva.js` — create form: `nombre`, `slug` (auto-filled), `parent_id` select (roots only), `orden`. On success: `invalidateQueries` + redirect. ~80 lines.
- [x] 3.3 Create `next-app/pages/admin/categorias/[id]/editar.js` — edit form, pre-fill values, re-slug on nombre change. On success: `invalidateQueries` + redirect. ~80 lines.
- [x] 3.4 Create `next-app/pages/admin/productos/new.js` — full product form with two-level category selector (parent → subcategory), `categoria_id` + `categoria` (text) populated on submit, validation if no category selected, `escapeHtml()` on all user input rendered. ~120 lines.

**Done when**: create subcategory appears nested; edit renames reflected; new product creates with both `categoria_id` and `categoria` set; empty-category submit shows validation error.

---

## Phase 4: Public SEO Routes + Tests

- [ ] 4.1 Create `next-app/pages/productos/[categoria]/index.js` — `getStaticPaths` (all active category slugs) + `getStaticProps` (products by categoria slug, server-side filter, 20 rows, no `select(*)`). ISR revalidate: 60s. ~80 lines.
- [ ] 4.2 Create `next-app/pages/productos/[categoria]/[slug].js` — `getStaticPaths` (all categoria+slug combos) + `getStaticProps` (validate categoria match, return `notFound: true` on mismatch/missing). ISR revalidate: 60s. `typeof window !== 'undefined'` guard if needed. ~80 lines.
- [ ] 4.3 Create `next-app/test-product-categories.test.js` — tests: mapping script exact match + no-match logic (mocked), API delete 409 conflict, category dropdown render in new product page. ~80 lines.

**Done when**: `/productos/remeras/remera-blanca` renders; wrong category returns 404; unknown slug returns 404; test file passes with mocked supabase.

---

## Parallel Execution Map

```
PR 1 (1.1–1.4) ─┬─→ PR 2 (2.1–2.4) ──→ PR 3 (3.1–3.4)
                 └─→ PR 4-partial (4.1–4.2) ──────────────→ PR 4 (4.3 tests)
```

Phase 2 and early Phase 4 can start in parallel after Phase 1 merges.
Phase 3 requires Phase 2 API to be available.
Tests (4.3) can be written last or in parallel with Phase 3.
