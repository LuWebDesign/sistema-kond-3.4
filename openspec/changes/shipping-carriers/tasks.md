# Tasks: Shipping Carriers

## Phase 1: Schema and product package data

- [x] 1.1 Add `next-app/supabase-migrations/*shipping*.sql` for `productos.package_*` kg/cm fields and provider-neutral `pedidos_catalogo.shipping_*` columns from `design.md`.
- [x] 1.2 Sync `supabase/schema.sql`; keep schema additive/nullable and protect tenant-scoped order access.
- [x] 1.3 Update `next-app/utils/supabaseProductos.js`, `next-app/pages/admin/productos/new.js`, and `next-app/pages/admin/products.js` with required `Datos de envío`: weight kg, length, width/depth, height cm; keep `medidas` separate.
- [x] 1.4 Verify product create/edit rejects missing package data and persists kg/cm independently from customer-facing measurements.

## Phase 2: Provider-neutral carrier service

- [x] 2.1 Create `next-app/lib/shipping/index.js` with provider-neutral facade, provider selection, normalized unavailable errors, and no Andreani-specific names.
- [x] 2.2 Create `next-app/lib/shipping/providers/correoArgentino.js` with server-only token cache, origin CP `1842`, kg-to-grams conversion, 1g-25000g/150cm validation, `/rates`, `/agencies`, and `/shipping/import` mapping.
- [x] 2.3 Update `.env.example` with safe server-only Correo credentials/base/customer config plus any public feature flag/config; never expose tokens or credentials.
- [x] 2.4 Verify conversion, validation, token retry, normalized quote failure, and secret-free responses with mocks or focused checks.

## Phase 3: APIs, persistence, and import state

- [x] 3.1 Create `next-app/pages/api/shipping/rates.js` and `next-app/pages/api/shipping/agencies.js`; inject server config and return normalized rates/agencies only.
- [ ] 3.2 Add webhook-side import helper, or `next-app/pages/api/shipping/import-order.js` only if needed; import MiCorreo shipment only after approved payment.
- [ ] 3.3 Update `next-app/hooks/useCatalog.js` and `next-app/utils/supabasePedidos.js` to persist selected quote, destination, agency, import result/failure, manual follow-up, and tenant-scoped shipping metadata.
- [ ] 3.4 Verify APIs mock successfully, quote failures return `available:false`, and fallback/free/paid snapshots persist.

## Phase 4: Checkout and MercadoPago totals

- [ ] 4.1 Update `next-app/pages/mi-carrito/finalizar-compra.js` for `domicilio`/`sucursal`, structured destination/province data, agency selection, quote display, `A cotizar`, and `Envío gratis` with struck-through quote.
- [ ] 4.2 Build one selected shipping snapshot; derive checkout display, saved order total, and payment payload from it so paid shipping is charged exactly once.
- [ ] 4.3 Update `next-app/pages/api/mp/create-preference.js` to add one positive shipping line only for paid selected shipping; keep `MP_ACCESS_TOKEN` server-only.
- [ ] 4.4 Update `next-app/pages/api/mp/webhook.js` to import once after `approved`, persist success/failure, and flag manual follow-up when import fails.
- [ ] 4.5 Verify paid shipping appears once in checkout/order/MP; fallback or free shipping adds no positive MP shipping amount.

## Phase 5: Admin display and release verification

- [ ] 5.1 Update `next-app/utils/pedidosCatalogoDetail.js` and `next-app/components/OrderCatalogDetailView.js` to show selected shipping, agency, import state, manual label workflow instructions, tracking/status fields.
- [ ] 5.2 Fix suspicious `metodoPago === 'envio'` logic to use delivery-method metadata for shipping address/details display.
- [ ] 5.3 Run `node verify-setup.js`, `npm run build` in `next-app/`, and manual QA for product fields, home/agency checkout, unavailable/free/paid shipping, approved import, and admin follow-up.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 schema/product data → PR 2 facade/APIs → PR 3 checkout/MP/import → PR 4 admin/QA |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — user approved chained PRs with `stacked-to-main`.
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema and product package data | PR 1 | Migration, schema sync, product forms. |
| 2 | Carrier facade and APIs | PR 2 | Depends on package fields; includes adapter/API checks. |
| 3 | Checkout, persistence, MP, import | PR 3 | Depends on PR 2; protects single-charge rule. |
| 4 | Admin visibility and QA | PR 4 | Depends on persisted shipping/import metadata. |
