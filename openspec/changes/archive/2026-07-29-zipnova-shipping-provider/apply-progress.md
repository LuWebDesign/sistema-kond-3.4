# Apply Progress: Zipnova Shipping Provider

## Mode

Standard Mode. Strict TDD is disabled and no project test runner is configured.

## Workload / PR Boundary

- Delivery mode: stacked chained PR slice.
- Current slice: Phase 4 / final verification slice — checks, docs/env cleanup, and progress merge.
- Boundary: Starts after PR 1 provider foundation, PR 2 checkout/public shipping wiring, and PR 3 admin shipment-generation action + MercadoPago webhook cleanup; ends with focused Zipnova checks, server-only env placeholders, verification commands, and all tasks complete.

## Completed Tasks

- [x] 1.1 Created `next-app/lib/shipping/providers/zipnova.js` with server-only Basic Auth config from `ZIPNOVA_*`; token/secret stay inside request headers and are not returned in normalized data.
- [x] 1.2 Implemented Zipnova quote normalization/curation for `home` and `agency`, retaining safe `quoteSnapshot` fields: logistic type, service type code, carrier id, quote id, point id, and pickup-point data when available.
- [x] 1.3 Implemented Zipnova shipment creation normalization in the adapter, returning `{ imported, provider, shipmentId, trackingNumber, status, labelUrl, importedAt }`; creation requires an explicit admin confirmation flag so PR 1 does not enable accidental webhook-created shipments.
- [x] 1.4 Modified `next-app/lib/shipping/index.js` to register `zipnova` as the default provider while preserving `correo_argentino` as rollback.
- [x] 2.1 Verified `next-app/pages/api/shipping/rates.js` already passes destination/package/delivery type to the shipping facade and receives facade-level `available:false` fallback on Zipnova quote/config failures.
- [x] 2.2 Modified `next-app/pages/api/shipping/agencies.js` and the Zipnova adapter so the existing GET contract can return quote-derived pickup points from a selected rate/quote snapshot and safely return an empty agency list for Zipnova failures.
- [x] 2.3 Modified `next-app/pages/mi-carrito/finalizar-compra.js` so checkout uses curated Zipnova rates, derives pickup/sucursal selection from selected quote metadata, persists safe Zipnova quote metadata in existing snapshots, and allows `to_quote` fallback without blocking purchase when no automatic quote/agency is available.
- [x] 2.4 Verified `next-app/pages/api/mp/create-preference.js` still adds a single shipping item only when `shipping.status === 'quoted'` and `shipping.cost > 0`; no duplicate shipping charge path was added.
- [x] 3.1 Created `next-app/pages/api/admin/shipping/shipments.js` as a protected POST-only admin route using `verifyAdminCookie(req)`; no public GET was added.
- [x] 3.2 Implemented the admin shipment API with explicit projected `pedidos_catalogo` columns and tenant-scoped read/update filters via `.eq('tenant_id', TENANT_ID)` before calling the shipping facade.
- [x] 3.3 Modified `next-app/pages/api/mp/webhook.js` so approved MercadoPago payments update payment fields only and leave shipment generation pending for explicit admin action.
- [x] 3.4 Modified `next-app/components/OrderCatalogDetailView.js` to show shipment status, a paid/eligible `Generar envío en Zipnova` action, and provider-neutral follow-up wording instead of MiCorreo-specific instructions.
- [x] 4.1 Added `next-app/scripts/check-zipnova-shipping.mjs` with focused Node checks for Zipnova missing config, server-side Basic Auth, quote curation, pickup mapping, shipment normalization, admin-confirmation guard, and normalized-output secret leakage.
- [x] 4.2 Added API contract checks in `next-app/scripts/check-zipnova-shipping.mjs` for `/api/shipping/rates`, `/api/shipping/agencies`, protected POST-only admin shipment generation, MercadoPago payment-only webhook behavior, tenant-scoped/projected Supabase reads, and single shipping item insertion in `create-preference`.
- [x] 4.3 Ran `node verify-setup.js` from the repo root and `npm run build` in `next-app/`; both passed.
- [x] 4.4 Updated `.env.example` to use Zipnova server-only placeholder values and no `NEXT_PUBLIC_ZIPNOVA_*` variables, preserving existing unrelated `.atl` changes.

## Verification

- Remediation check after fresh review blocker: `node next-app/scripts/check-zipnova-shipping.mjs` from repo root passed. The check now covers agency/pickup quotes without embedded pickup-point details and asserts they cannot become payable quoted checkout rates.
- Remediation check after fresh review blocker: `node verify-setup.js` from repo root passed.
- Remediation check after fresh review blocker: `npm run build` in `next-app/` passed. Build emitted only existing dependency/browser-data and middleware deprecation warnings.
- `node verify-setup.js` from repo root: passed.
- `npm run build` in `next-app/`: passed. Build emitted only existing dependency/browser-data and middleware deprecation warnings.
- `npx eslint lib/shipping/index.js lib/shipping/providers/zipnova.js`: not runnable because ESLint 9 could not find `eslint.config.(js|mjs|cjs)`.
- `node verify-setup.js` from repo root: passed for PR 2.
- `npx eslint pages/api/shipping/agencies.js pages/mi-carrito/finalizar-compra.js lib/shipping/providers/zipnova.js pages/api/mp/create-preference.js` in `next-app/`: not runnable because ESLint 9 could not find `eslint.config.(js|mjs|cjs)`.
- `npm run build` in `next-app/`: passed for PR 2. Build emitted only existing dependency/browser-data and middleware deprecation warnings.
- `node verify-setup.js` from repo root: passed for PR 3.
- `npm run build` from repo root: failed because the root package has no `build` script; rerun in `next-app/`.
- `npm run build` in `next-app/`: passed for PR 3. Build emitted only existing dependency/browser-data and middleware deprecation warnings.
- `npx eslint pages/api/admin/shipping/shipments.js pages/api/mp/webhook.js components/OrderCatalogDetailView.js` in `next-app/`: not runnable because ESLint 9 could not find `eslint.config.(js|mjs|cjs)`.
- `node next-app/scripts/check-zipnova-shipping.mjs` from repo root: passed for Phase 4.
- `node verify-setup.js` from repo root: passed for Phase 4.
- `npm run build` in `next-app/`: passed for Phase 4. Build emitted existing dependency/browser-data and middleware deprecation warnings.

## Deviations

- None for PR 1 scope. Zipnova exact payload field names remain defensive/generic because the design already recorded that live API field names need confirmation. The adapter also requires explicit admin confirmation before creating a Zipnova shipment to honor the no-webhook-shipment constraint until the admin API slice is implemented.
- None for PR 2 scope. No admin shipment-generation UI/API or webhook cleanup was implemented.
- None for PR 3 scope. Shipment generation is admin-confirmed only; the MercadoPago webhook remains payment-only.
- None for Phase 4 scope. Checks are focused Node/static contract checks because the project has no configured test runner.

## Remaining Tasks

- None. All 16 tasks are complete; ready for SDD verify.
