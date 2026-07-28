# Apply Progress: Shipping Carriers

## Mode

Standard apply mode. `openspec/config.yaml` is absent, so strict TDD is not enabled.

## Workload / PR Boundary

- Mode: chained PR slice
- Chain strategy: stacked-to-main, per orchestrator-provided decision
- Current work unit: PR 1 — schema + product package data
- Boundary: additive database fields, schema sync, product create/edit package data capture and validation only
- Out of scope: provider-neutral service, carrier adapters, shipping APIs, checkout UI, MercadoPago changes, webhook import, admin order detail

## Completed Tasks

- [x] 1.1 Added `next-app/supabase-migrations/2026-07-27-shipping-package-fields.sql` with `productos.package_*` kg/cm fields and provider-neutral `pedidos_catalogo.shipping_*` columns.
- [x] 1.2 Synced `supabase/schema.sql` with additive nullable product package fields, order shipping fields, and shipping lookup indexes.
- [x] 1.3 Updated product create/edit flows and Supabase product mappings for required package weight kg and length/width/height cm fields separate from `medidas`.
- [x] 1.4 Verified package data validation and persistence paths with targeted checks.

## Verification

- `node verify-setup.js` from repo root: passed.
- `npm run build` from `next-app/`: passed.
- `npx eslint pages/admin/productos/new.js pages/admin/products.js utils/supabaseProducts.js utils/supabaseProductos.js` from `next-app/`: not runnable because ESLint 9 requires `eslint.config.*` and the repo has no ESLint flat config.
- Focused source validation evidence collected after fresh review:
  - Create flow validates all package fields as `> 0`, blocks create, keeps `medidas` separate, renders a separate `Datos de envío` section, and disables create until package data is valid.
  - Edit flow maps package fields into form state, validates all package fields as `> 0`, blocks full and section saves when invalid, keeps `medidas` separate, and renders a separate `Datos de envío` section.
  - Supabase product utilities persist `package_*` fields on create/update and map DB snake_case fields back to frontend camelCase.
  - Migration and `supabase/schema.sql` include additive product package columns.

## Warnings / Follow-up

- Manual browser validation was not run; evidence is source-level plus setup/build checks.
- Unrelated pre-existing changes (`.atl/*`, `AGENTS.md`, `openspec/andreani-shipping/*`) were excluded/resolved before PR 1 preparation.
- The PR 1 migration/schema also include provider-neutral `pedidos_catalogo.shipping_*` foundation fields. This matches the task plan's schema-foundation slice, but should be called out clearly in PR 1 review notes.

## Remaining Tasks

- Phase 2: provider-neutral carrier service.
- Phase 3: shipping APIs, persistence, and import state.
- Phase 4: checkout and MercadoPago totals.
- Phase 5: admin display and release verification.
