# Verification Report: shipping-carriers PR 1

**Change**: `shipping-carriers`  
**Mode**: Standard verify, chained PR slice review  
**Slice boundary**: PR 1 only — schema + product package data fields, product create/edit UI and validation, task/application progress accuracy.

## Verdict

**WARNING** — PR 1 implementation matches the functional slice, and build/setup verification passed. The unrelated working-tree changes were cleaned before PR preparation. Remaining warning: runtime browser validation was not run; evidence is source-level plus setup/build checks.

## Build and checks

| Command | Result | Notes |
|---|---:|---|
| `node verify-setup.js` from repo root | PASS | Supabase structure check passed. |
| `npm run build` from `next-app/` | PASS | Next.js 16.1.6 production build completed successfully. |
| `npx eslint pages/admin/productos/new.js pages/admin/products.js utils/supabaseProducts.js utils/supabaseProductos.js` from `next-app/` | NOT RUNNABLE | ESLint 9 requires `eslint.config.*`; repo has no flat config. |

## Completeness

| Task | Status | Evidence |
|---|---:|---|
| 1.1 Add migration for `productos.package_*` and provider-neutral `pedidos_catalogo.shipping_*` columns | Complete | `next-app/supabase-migrations/2026-07-27-shipping-package-fields.sql` lines 6-31. |
| 1.2 Sync `supabase/schema.sql`; keep schema additive/nullable | Complete | `supabase/schema.sql` lines 53-56 and 164-191. |
| 1.3 Update product mappings and create/edit UI with required package data separate from `medidas` | Complete | `next-app/utils/supabaseProducts.js` lines 159-162 and 231-238; `next-app/pages/admin/productos/new.js` lines 1075-1103; `next-app/pages/admin/products.js` lines 4797-4825. |
| 1.4 Verify create/edit rejects missing package data and persists kg/cm separately | Partial | Source validation exists, build passes, but no covering runtime test/manual evidence artifact was found. |

## Static compliance matrix

| Requirement / scenario | Result | Evidence |
|---|---:|---|
| Product package data separate from customer-facing `medidas` | PASS | New columns are `package_weight_kg`, `package_length_cm`, `package_width_cm`, `package_height_cm`; `medidas` remains unchanged in schema and UI copy states package data does not replace visible measures. |
| Admin weight is kilograms and dimensions are centimeters | PASS | Labels and summaries use `Peso (kg)` and length/width/height `cm` in create/edit forms. |
| Correo grams conversion not prematurely implemented | PASS | No `lib/shipping` or `pages/api/shipping` files exist; no provider adapter or kg-to-grams boundary was implemented in PR 1. |
| Additive database migration and aligned schema | PASS | Migration uses `ADD COLUMN IF NOT EXISTS`; schema contains matching nullable columns and indexes. |
| Product create/edit persistence is consistent | PASS | Create and update paths map camelCase package fields to snake_case DB fields in both product utilities. |
| Validations match required package data | PASS (static) | Create and edit flows require all four package fields to be numeric values greater than zero before save. |
| Tasks/apply-progress reflect only PR 1 | PASS | Tasks 1.1-1.4 checked; phases 2-5 unchecked; apply-progress boundary excludes provider service, checkout, MP, webhook/import, and admin order detail. |
| Unrelated files untouched | PASS | After cleanup, the working tree no longer includes `.atl/*`, `AGENTS.md`, or `openspec/andreani-shipping/*` changes. |

## Findings

### CRITICAL

None.

### WARNING

1. **No runtime scenario coverage found for package-data validation/persistence** — source inspection confirms validation and mappings, and build passes, but no browser/manual verification artifact proves create/edit rejection and persistence behavior at runtime.

### SUGGESTION

1. Consider replacing newly added native `alert()` validation feedback with the project's modal/notification pattern when this UI is next touched. Existing files already use `alert()`, so this is not a PR 1 blocker.

## Fixes applied

None.

## Next recommended

- Add a focused runtime/manual verification artifact for package-field rejection and persistence, or implement a small targeted test if the project test harness is available.
