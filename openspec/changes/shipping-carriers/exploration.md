# Exploration: shipping-carriers

## Exploration: Provider-neutral shipping carriers

### Current State
The Next.js checkout has a two-step cart flow: `pages/mi-carrito/index.js` stores `checkoutDeliveryMethod` as `retiro` or `envio`, and `pages/mi-carrito/finalizar-compra.js` creates catalog orders through `useOrders().saveOrder()`. Shipping is currently not quoted: cart summary shows `A cotizar` unless a free-shipping promotion applies, checkout requires a single `customerData.address` string for `envio`, and order totals do not include shipping cost.

Order persistence flows through `hooks/useCatalog.js` into `utils/supabasePedidos.js:createPedidoCatalogo()`, which inserts into `pedidos_catalogo` and `pedidos_catalogo_items` with `tenant_id`. MercadoPago preference creation is isolated in `pages/api/mp/create-preference.js`; it currently forwards `items` unchanged and does not add a shipping line item. MP webhook later resolves tenant by `mp_preference_id` and updates the same order.

Admin order detail uses `pages/admin/orders/detalle-pedido/[id].js`, `utils/pedidosCatalogoDetail.js`, and `components/OrderCatalogDetailView.js`. The detail view currently has a bug-shaped condition for shipping address display: it checks `pedido.metodoPago === 'envio'` even though delivery method is stored as `metodoEntrega`.

The previous `openspec/andreani-shipping/*` artifacts are useful only as planning reference. They correctly identified the checkout, MP, persistence, admin, product dimensions, and schema surfaces, but the new architecture should not preserve Andreani-specific route names, service names, feature flags, or DB columns.

### Affected Areas
- `next-app/pages/mi-carrito/index.js` — cart summary currently persists the high-level delivery method and shows shipping as free, local pickup, or `A cotizar`; it may need to consume a later quote summary only if the first slice wants cart-page quoting.
- `next-app/pages/mi-carrito/finalizar-compra.js` — primary checkout integration point for structured address, carrier delivery mode, agency pickup, quote fetching, selected quote persistence, MP payload, and order data.
- `next-app/hooks/useCatalog.js` — `useOrders().saveOrder()` must forward provider-neutral shipping metadata to persistence and localStorage fallback.
- `next-app/utils/supabasePedidos.js` — order select projections, create/update mappings, and tenant-scoped reads must include provider-neutral shipping columns.
- `next-app/utils/pedidosCatalogoDetail.js` — maps Supabase order rows to frontend order shape; must map shipping address, provider, selected service/rate, agency, cost, tracking, and status fields.
- `next-app/components/OrderCatalogDetailView.js` — admin display/editing for shipping cost, selected carrier, delivery type, agency data, tracking number, and corrected delivery-method address display.
- `next-app/pages/admin/orders/detalle-pedido/[id].js` — saves admin edits through `updatePedidoCatalogo()`; likely no route move, but save payload must include shipping tracking/status fields.
- `next-app/pages/api/mp/create-preference.js` — add a provider-neutral shipping line item when the persisted/selected quote has a positive cost; keep `MP_ACCESS_TOKEN` server-only.
- `next-app/pages/api/shipping/*` — new provider-neutral API routes should wrap carrier-specific services, e.g. quote rates and agency lookup, without exposing credentials.
- `next-app/lib/shipping/*` — new server-only service layer for provider registry, carrier interface, token caching, Correo Argentino MiCorreo client, validation, and normalized error mapping.
- `next-app/utils/supabaseProductos.js` and product admin surfaces — product dimensions/weight need schema and mapping support; current product mapper does not expose weight/height/width/length.
- `next-app/supabase-migrations/*.sql` and `supabase/schema.sql` — additive schema work is cross-cutting even if runtime target is Next.js; root schema must remain aligned.
- `.env.example` and deployment env — new server-only Correo credentials and base URL/environment selection; optional public feature flag must not include secrets.

### Approaches
1. **Carrier-neutral facade with provider adapters** — Add `/api/shipping/rates` and `/api/shipping/agencies` routes backed by a `lib/shipping` registry and a `correo-argentino` adapter implementing normalized contracts.
   - Pros: keeps checkout provider-neutral, prevents Andreani names from leaking into schema/UI/API, allows Andreani later as another adapter, isolates Correo token/auth quirks server-side.
   - Cons: slightly more upfront structure than a single Correo route; requires a small normalized domain model before implementation.
   - Effort: Medium.

2. **Correo-specific first, rename later** — Create `/api/correo-argentino/*` and `lib/correoArgentino.js`, then refactor to provider-neutral when Andreani returns.
   - Pros: fastest path to the first working quote.
   - Cons: repeats the Andreani planning mistake, likely leaks provider names into DB/UI, and makes later Andreani integration a breaking refactor.
   - Effort: Low initially, High later.

3. **Database-driven carrier registry from the start** — Store carrier config, service availability, and feature flags in Supabase tables, with API routes loading active carrier definitions dynamically.
   - Pros: most flexible for operations and future multi-carrier comparison.
   - Cons: overbuilt for a first provider; increases migration, admin UI, and security scope; secrets still cannot safely live in public/client-readable tables.
   - Effort: High.

### Recommendation
Use Approach 1 for the first slice. Define a provider-neutral shipping contract now, implement only Correo Argentino MiCorreo/PAQ.AR behind it, and defer shipment import/tracking automation. The normalized model should use concepts like `shipping_provider`, `shipping_service_code`, `shipping_delivery_type`, `shipping_cost`, `shipping_currency`, `shipping_quote_id` or immutable quote snapshot JSON, `shipping_agency_code`, `shipping_agency_snapshot`, `shipping_tracking_number`, and `shipping_status`; provider-specific payloads should stay in server-only adapter code or explicit JSON snapshots, not in top-level Andreani/Correo-named columns.

Recommended API shape for first slice:
- `POST /api/shipping/rates` with `{ provider?: 'correo_argentino', postalCodeOrigin?, postalCodeDestination, deliveryType?: 'home'|'agency', dimensions, cartItems }`, returning normalized `rates[]` with provider, service code/name, delivery type, cost, min/max days, and a provider raw/reference field for debugging if safe.
- `GET /api/shipping/agencies?provider=correo_argentino&customerId=...&provinceCode=...&services=...` returning normalized agency objects from MiCorreo `/agencies`.
- Server-only `lib/shipping/providers/correoArgentino.js` handles Basic Auth token acquisition (`POST /token`), bearer requests, MiCorreo validation, rate mapping, province code validation, and dimensions limits (quote max 25 kg, 150 cm per side).

Recommended first-slice scope:
- Add provider-neutral schema and server-side Correo quote/agency APIs.
- Add checkout quote selection for `envio` with home vs agency delivery and persist the selected normalized shipping snapshot.
- Add shipping cost to MercadoPago preference and order total consistently.
- Display persisted shipping metadata in admin order detail; allow manual tracking number/status entry with provider-neutral names.
- Defer `POST /shipping/import` and `GET /shipping/tracking` to a later phase.

### Risks
- `openspec/config.yaml` is missing in the repo even though `openspec/specs/` exists; downstream SDD phases should either create/restore it or proceed with shared defaults explicitly.
- Schema changes are cross-cutting: although runtime scope is Next.js, `supabase/schema.sql` is a root artifact and must be kept aligned with `next-app/supabase-migrations/`.
- Checkout total consistency is high risk: order persistence currently stores `total` before any shipping cost, and MercadoPago receives only product items. Shipping must be added exactly once to displayed total, stored total, and MP items.
- Product dimensional data is absent from current schema and mapper; Correo quotes need validated aggregate/package dimensions with safe defaults or admin-maintained product fields.
- Correo `/rates` needs `customerId`, origin/destination postal codes, and dimensions; the exploration input includes `POST /users/validate`, but credential ownership and whether `customerId` should be configured or validated at runtime remains open.
- Agency lookup requires `provinceCode`; checkout currently only has a free-form address string and no structured province field.
- Token caching in serverless runtime should tolerate cold starts and expiry; one retry after 401 is advisable.
- Server-side Supabase mutations/queries must remain tenant-scoped with `.eq('tenant_id', TENANT_ID)` where applicable; some existing helper reads like `getPedidoCatalogoById()` are not tenant-scoped and should be corrected if touched.
- Existing admin detail address display uses payment method instead of delivery method for shipping address visibility; shipping work should fix this nearby defect deliberately.
- No Jest/Vitest test script is configured; verification will likely rely on focused scripts, route-level mocks, `npm run build`, and manual QA unless test tooling is added.

### Ready for Proposal
Yes. The proposal should state that this is a provider-neutral shipping foundation with Correo Argentino MiCorreo/PAQ.AR as the first adapter, no Andreani-specific names in architecture or schema, and shipment creation/tracking deferred. It should explicitly call out cross-cutting schema/env impacts despite the Next.js-only runtime target.
