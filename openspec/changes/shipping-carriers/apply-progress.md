# Apply Progress: Shipping Carriers

## Mode

Standard apply mode. `openspec/config.yaml` is absent, so strict TDD is not enabled.

## Workload / PR Boundary

- Mode: chained PR slice
- Chain strategy: stacked-to-main, per orchestrator-provided decision
- Current work unit: PR 2 — provider-neutral carrier facade, Correo adapter, and shipping APIs
- Boundary: `next-app/lib/shipping/*`, `/api/shipping/rates`, `/api/shipping/agencies`, and safe server-only Correo env docs only
- Out of scope: checkout UI calls, MercadoPago totals, live webhook import, order persistence changes, and admin order detail UI

## Prior Dependency Already Complete

- [x] 1.1 Added `next-app/supabase-migrations/2026-07-27-shipping-package-fields.sql` with `productos.package_*` kg/cm fields and provider-neutral `pedidos_catalogo.shipping_*` columns.
- [x] 1.2 Synced `supabase/schema.sql` with additive nullable product package fields, order shipping fields, and shipping lookup indexes.
- [x] 1.3 Updated product create/edit flows and Supabase product mappings for required package weight kg and length/width/height cm fields separate from `medidas`.
- [x] 1.4 Verified package data validation and persistence paths with targeted checks.

## Completed Tasks — Current PR 2 Slice

- [x] 2.1 Added `next-app/lib/shipping/index.js` as the provider-neutral facade with provider selection, normalized unavailable quote responses, and no Andreani-specific names.
- [x] 2.2 Added `next-app/lib/shipping/providers/correoArgentino.js` with server-only MiCorreo config, module token cache, `/token` Basic Auth, one 401 retry, origin CP `1842`, kg-to-grams conversion, 1g-25000g and 150cm validation, normalized `/rates` and `/agencies`, and a server-only `/shipping/import` adapter boundary for later webhook use.
- [x] 2.3 Documented Correo server-only env vars in `.env.example` without `NEXT_PUBLIC_` secrets.
- [x] 2.4 Verified conversion, validation, token retry, normalized quote fallback, and secret-free API responses with focused syntax/source checks and mocked adapter checks.
- [x] 3.1 Added `next-app/pages/api/shipping/rates.js` and `next-app/pages/api/shipping/agencies.js`; routes call the provider-neutral facade and return normalized rates/agencies without carrier credentials, tokens, or raw payloads.

## Verification

- `node verify-setup.js` from repo root: passed.
- `npm run build` from `next-app/`: passed.
- `npx eslint pages/admin/productos/new.js pages/admin/products.js utils/supabaseProducts.js utils/supabaseProductos.js` from `next-app/`: not runnable because ESLint 9 requires `eslint.config.*` and the repo has no ESLint flat config.
- `npx eslint lib/shipping/index.js lib/shipping/providers/correoArgentino.js pages/api/shipping/rates.js pages/api/shipping/agencies.js` from `next-app/`: not runnable for the same missing ESLint flat config.
- `node --check` for the new shipping facade, Correo adapter, and API route files from `next-app/`: passed.
- Focused mocked adapter checks from `next-app/`: passed kg-to-grams conversion, overweight and oversize validation, `domicilio`/`sucursal` normalization, token cache reset, Basic Auth `/token`, 401 retry, refreshed bearer token use, and normalized successful rates.
- Focused source validation evidence collected after fresh review:
  - Create flow validates all package fields as `> 0`, blocks create, keeps `medidas` separate, renders a separate `Datos de envío` section, and disables create until package data is valid.
  - Edit flow maps package fields into form state, validates all package fields as `> 0`, blocks full and section saves when invalid, keeps `medidas` separate, and renders a separate `Datos de envío` section.
  - Supabase product utilities persist `package_*` fields on create/update and map DB snake_case fields back to frontend camelCase.
  - Migration and `supabase/schema.sql` include additive product package columns.
  - Shipping routes return only normalized public fields (`available`, `rates`, `agencies`, safe errors) and never include configured credentials, Basic Auth values, bearer tokens, or carrier raw payloads.

## Warnings / Follow-up

- Manual browser validation was not run; evidence is source-level plus setup/build checks.
- Unrelated pre-existing changes (`.atl/*`, `AGENTS.md`, `openspec/andreani-shipping/*`) were excluded/resolved before PR 1 preparation.
- The PR 1 migration/schema also include provider-neutral `pedidos_catalogo.shipping_*` foundation fields. This matches the task plan's schema-foundation slice, but should be called out clearly in PR 1 review notes.
- Correo production/QA base URL values are not hardcoded; deployments must provide `CORREO_ARGENTINO_BASE_URL` from active MiCorreo documentation. `/shipping/import` is adapter-only for later webhook integration.

## Remaining Tasks

- Phase 3.2-3.4: webhook-side import integration, persistence metadata forwarding, and persistence verification.
- Phase 4: checkout and MercadoPago totals.
- Phase 5: admin display and release verification.
