# Verification Report — PR 3: Admin UI

**Change**: categories-subcategories  
**Phase verified**: Phase 3 (Tasks 3.1–3.4) + supabaseProducts.js + products.js link  
**Date**: 2026-05-03  
**Mode**: Standard (no strict TDD — Phase 4 tests not yet written)

---

## Completeness

| Metric | Value |
|--------|-------|
| Phase 3 tasks total | 4 |
| Tasks complete [x] | 4 |
| Tasks incomplete [ ] | 0 |

Phase 4 tasks (4.1–4.3) are correctly marked `[ ]` — out of scope for this PR.

---

## Build & Tests Execution

**Build**: ➖ Not executed (per AGENTS.md rule: never build after changes)  
**Tests**: ➖ Not available — Phase 4 test file (4.3) not yet written  
**ESLint**: ⚠️ ESLint v9 config migration needed (pre-existing project issue, not introduced by this PR)  
**Coverage**: ➖ Not available

---

## Spec Compliance Matrix

| Requirement | Scenario | Evidence | Result |
|-------------|----------|----------|--------|
| REQ-5: Admin UI CRUD | Create subcategory | `nueva.js` posts to `/api/admin/categorias`, `padres` filter = roots only, invalidates cache, redirects | ✅ COMPLIANT |
| REQ-5: Admin UI CRUD | Edit renames category | `editar.js` GETs to pre-populate, PUTs on submit, invalidates cache, redirects | ✅ COMPLIANT |
| REQ-5: Admin UI CRUD | Delete with confirmation | `index.js` uses modal (not `window.confirm`), useMutation, invalidateQueries | ✅ COMPLIANT |
| REQ-4: Add-Product Page | Subcategory dropdown populated | `new.js` useQuery + two-level selects (padres / hijos filtered by parent) | ✅ COMPLIANT |
| REQ-4: Add-Product Page | Successful product creation | `categoria_id` + `categoria` (text) both sent via `createProducto` | ✅ COMPLIANT |
| REQ-4: Add-Product Page | Submit without category | ⚠️ Only `nombre` and `precio > 0` validated — category is optional by design (`resolvedCategoriaId` can be null) | ⚠️ PARTIAL |
| Constraint: invalidateQueries | All mutations | All 3 pages use `invalidateQueries`, zero `refetch()` calls found | ✅ COMPLIANT |
| Constraint: no select(*) | supabaseProducts.js create/update | `categoria_id` added via spread/conditional — no new `select('*')` introduced | ⚠️ WARNING (pre-existing `select('*')` in `getAllProductos`, `getProductosPublicados`, `getProductoById`) |
| Constraint: SSR guard | new.js, index.js, nueva.js, editar.js | No direct `window`/`localStorage` access in these files | ✅ COMPLIANT |
| Constraint: backward compat | supabaseProducts create | `categoria` (text) preserved, `categoria_id` added as optional spread | ✅ COMPLIANT |

---

## Correctness (Static — Structural Evidence)

### index.js (Listado de categorías)

| Check | Status | Notes |
|-------|--------|-------|
| useQuery with QUERY_KEYS.categorias.list() | ✅ | Line 30 |
| Árbol padre → hijos | ✅ | Lines 48–54, rendered in table rows |
| Botón eliminar con confirm dialog | ✅ | Modal dialog (not browser confirm) — better UX |
| Maneja 409 mostrando mensaje claro | ✅ | `onError` sets `deleteError`, displayed in modal. API error message propagated as-is |
| useMutation + invalidateQueries (NO refetch) | ✅ | Lines 35–45 |
| Link a /admin/categorias/nueva | ✅ | Line 153 |

### nueva.js (Crear categoría)

| Check | Status | Notes |
|-------|--------|-------|
| Preview de slug en tiempo real | ✅ | useEffect on `nombre`, `slugify()` util |
| Select parent_id solo raíces | ✅ | `padres = categorias.filter(c => c.parent_id === null)` |
| Submit → POST /api/admin/categorias | ✅ | Line 18 |
| Maneja 409 inline | ⚠️ | Error message from API propagated generically — if API returns `json.error` on 409, it will show. But no explicit `res.status === 409` check to customize message. Functional but not spec-explicit. |
| Redirect a /admin/categorias on success | ✅ | Line 56 |

### [id]/editar.js (Editar categoría)

| Check | Status | Notes |
|-------|--------|-------|
| GET para pre-populate | ✅ | useQuery with `byId(id)`, useEffect initializes form |
| Submit → PUT /api/admin/categorias/[id] | ✅ | Line 25 |
| Redirect on success | ✅ | Line 85 |
| Excluye self del select de padres | ✅ | `String(c.id) !== String(id)` filter |

### productos/new.js (Nueva página de producto)

| Check | Status | Notes |
|-------|--------|-------|
| Dos selects dependientes | ✅ | `categoriaIdPadre` / `categoriaIdHijo` |
| Select 1: solo categorías padre | ✅ | `padres = categorias.filter(c => c.parent_id === null)` |
| Select 2: subcategorías del padre (o vacío) | ✅ | Shows message if `hijos.length === 0` |
| categoria_id = subcategoría si existe, else padre | ✅ | `resolvedCategoriaId` logic (lines 84–88) |
| Resetea Select 2 al cambiar Select 1 | ✅ | `handlePadreChange` sets `setCategoriaIdHijo('')` |
| useQuery + staleTime 15min | ✅ | STALE_TIMES.categorias = 15min |
| Validación nombre requerido | ✅ | Line 75 |
| Validación precio > 0 | ✅ | Line 76 |
| `escapeHtml()` en inputs | ✅ | nombre, medidas, description all escaped |
| Validación: categoría requerida | ❌ | Spec scenario says empty category = validation error. Code allows `categoria_id = null` silently. |

### supabaseProducts.js

| Check | Status | Notes |
|-------|--------|-------|
| categoria_id en create | ✅ | Lines 171–173 (conditional spread) |
| categoria_id en update | ✅ | Line 253 |
| Contrato existente intacto | ✅ | All other fields unchanged |
| NO usa select('*') en cambios nuevos | ✅ | No new select('*') introduced |
| Pre-existing select('*') violations | ⚠️ | Lines 19, 40, 65 — pre-existing, not introduced by PR3 |

### products.js

| Check | Status | Notes |
|-------|--------|-------|
| Link/botón a /admin/productos/new | ✅ | Line 1460 |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| TanStack Query for all data fetching | ✅ | All pages use useQuery/useMutation |
| invalidateQueries on success | ✅ | Consistent across all 3 pages |
| Depth guard: only roots as parents | ✅ | Client-side filter on all selects |
| slugify util for slug preview | ✅ | imported from utils/slugify |
| withAdminAuth HOC | ✅ | All pages wrapped |
| escapeHtml on user input | ✅ | new.js applies it on submit |

---

## Issues Found

### CRITICAL (must fix before archive)

1. **`new.js` — Missing validation for empty category (Spec §4, Scenario 3)**  
   The spec requires: "GIVEN the admin leaves the category field empty → THEN a validation error is shown and no product is created."  
   Current code: `resolvedCategoriaId` can be `null` and the product is created anyway with no category validation.  
   **Fix**: Add to `validate()`: `if (!resolvedCategoriaId) errs.categoria = 'La categoría es requerida'`

### WARNING (should fix)

2. **`nueva.js` — 409 handling not explicit**  
   The error from the API propagates generically (via `json.error`). If the API returns a clear message, it will be shown. However, there's no explicit check of `res.status === 409` to provide a distinct UX (e.g., "ya existe una categoría con ese slug"). Functionally works if the API message is descriptive. Recommend adding explicit 409 detection.

3. **`supabaseProducts.js` — Pre-existing `select('*')` violations**  
   `getAllProductos` (line 19), `getProductosPublicados` (line 40), `getProductoById` (line 65) all use `select('*')`. These are pre-existing and not introduced by PR3, but they violate the project constraint. Should be addressed in a follow-up.

### SUGGESTION

4. **`index.js` — `key` prop on React fragment**  
   Lines 193–262: `<>` fragment inside `.map()` without a `key` prop. The `key` is on the inner `<tr>` but not the fragment wrapper. This causes React warnings. Fix: use `<React.Fragment key={padre.id}>`.

---

## Verdict

**PASS WITH WARNINGS**

Phase 3 implementation is structurally sound. 5 of 6 spec scenarios are correctly implemented. One CRITICAL issue must be fixed: missing category validation in `new.js`. All other issues are warnings or pre-existing violations.

**approved_for_next_phase**: false — fix CRITICAL #1 first, then approve.
