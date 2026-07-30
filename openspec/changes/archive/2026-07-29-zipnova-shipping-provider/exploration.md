## Exploration: zipnova-shipping-provider

### Current State
The shipping foundation from `shipping-carriers` is already provider-neutral at the public API, checkout snapshot, Supabase columns, and admin display layers. The active provider is still hard-wired to direct Correo Argentino in `next-app/lib/shipping/index.js` via `SHIPPING_PROVIDER = 'correo_argentino'`, with the only registered adapter in `next-app/lib/shipping/providers/correoArgentino.js`.

Checkout in `next-app/pages/mi-carrito/finalizar-compra.js` builds package data from cart product package fields, calls `POST /api/shipping/rates`, optionally loads pickup branches from `GET /api/shipping/agencies`, persists a normalized `shipping` snapshot with the order, and includes paid shipping in the displayed/order total. MercadoPago preference creation receives that same snapshot and adds one positive shipping line item only when `shipping.status === 'quoted'`, preserving single-charge behavior. After approved MP payment, `next-app/pages/api/mp/webhook.js` resolves the tenant by `mp_preference_id`, claims pending shipment import, calls `importShippingShipment()`, and persists import result/tracking/follow-up fields with tenant-scoped updates.

Order persistence already maps provider-neutral shipping fields in `next-app/utils/supabasePedidos.js` and `next-app/utils/pedidosCatalogoDetail.js`; admin order detail displays provider, service, delivery type, cost, quote/import status, tracking, destination, agency, and manual follow-up text in `next-app/components/OrderCatalogDetailView.js`. Product package dimensions/weight are already in `next-app/supabase-migrations/2026-07-27-shipping-package-fields.sql` and `supabase/schema.sql`.

Zipnova Envíos should replace only the provider adapter and default provider wiring initially. Its Argentina API is `https://api.zipnova.com.ar/v2`, uses Basic Auth with API Token as username and API Secret as password, and requires server-only env values for account/origin/auth. Quote creation must map checkout package/destination into `POST /shipments/quote`; shipment creation must use stored quote metadata against `POST /shipments` after payment approval.

### Affected Areas
- `next-app/lib/shipping/index.js` — default provider and provider registry must add/switch to `zipnova` while retaining normalized facade methods and HTTP error handling.
- `next-app/lib/shipping/providers/correoArgentino.js` — current direct Correo adapter can remain as rollback/reference, but Zipnova should not reuse its bearer-token flow.
- `next-app/lib/shipping/providers/zipnova.js` — new server-only adapter should encapsulate Basic Auth, config validation, request parsing, quote normalization, pickup-point normalization, shipment creation, tracking, and safe errors.
- `next-app/pages/api/shipping/rates.js` — public checkout quote route can stay stable; Zipnova may need additional destination fields over time, but initial contract can continue using postal code, province, delivery type, and package.
- `next-app/pages/api/shipping/agencies.js` — current branch route is province-based; Zipnova pickup/dropoff points may be quote/service dependent, so proposal must decide whether to keep this endpoint, derive pickup points from quote results, or add a provider-neutral points endpoint.
- `next-app/pages/mi-carrito/finalizar-compra.js` — selected rate snapshot must retain Zipnova creation fields (`logistic_type`, `service_type`, `carrier_id`, and optional `point_id`) without leaking credentials; provider fallback currently defaults to `correo_argentino` and must change.
- `next-app/pages/api/mp/create-preference.js` — single-charge behavior is already correct; implementation should preserve adding shipping exactly once from the persisted selected quote.
- `next-app/pages/api/mp/webhook.js` — shipment import after approved payment should become Zipnova shipment creation using the stored quote values and must remain idempotent/tenant-safe.
- `next-app/utils/supabasePedidos.js` — existing projections and mappers include shipping columns; if Zipnova needs extra persisted IDs/statuses, prefer quote/import JSON snapshots before adding top-level columns.
- `next-app/utils/pedidosCatalogoDetail.js` and `next-app/components/OrderCatalogDetailView.js` — admin display can remain provider-neutral; labels/manual follow-up text should avoid MiCorreo-specific wording once Zipnova owns creation/labels/tracking.
- `next-app/supabase-migrations/2026-07-27-shipping-package-fields.sql` and `supabase/schema.sql` — likely no required schema change for first Zipnova adapter if JSON snapshots store provider-specific metadata.
- `.env.example` and deployment envs — Zipnova values must be documented as server-only placeholders; actual token/secret must not be exposed, committed, logged, or returned to clients.

### Approaches
1. **Add Zipnova adapter and switch the facade default** — Implement `zipnova` behind the existing provider-neutral facade, keep API routes/checkout/order schema stable, and leave the direct Correo adapter as rollback.
   - Pros: smallest safe migration, preserves checkout and MP flows, avoids schema churn, enables Correo/Andreani through Zipnova, and keeps secrets server-side.
   - Cons: pickup-point behavior may need a small contract refinement if Zipnova points are quote-dependent; old Correo-specific admin copy must be cleaned up.
   - Effort: Medium.

2. **Replace the whole shipping surface with Zipnova-specific routes and fields** — Create Zipnova-specific APIs/DB names and adapt checkout directly to Zipnova responses.
   - Pros: fastest path to expose raw Zipnova capabilities.
   - Cons: breaks the provider-neutral architecture already built, couples checkout/admin to one aggregator, increases future migration cost, and risks leaking provider internals.
   - Effort: Medium now, High later.

3. **Database-driven multi-provider/router now** — Store provider selection, carrier availability, and service policies in Supabase and route dynamically between direct Correo, Zipnova, and future providers.
   - Pros: most flexible long-term operations model.
   - Cons: overbuilt for the urgent credential-delay problem, expands admin/config/security scope, and still cannot store secrets in public/client-readable tables.
   - Effort: High.

### Recommendation
Use Approach 1. Add a server-only `zipnova` provider adapter, switch `SHIPPING_PROVIDER` to `zipnova`, and preserve the existing normalized contracts for rates, order snapshots, MP preference creation, webhook-triggered shipment import, and admin visibility.

The proposal should require normalized Zipnova rate objects to include the existing public fields (`provider`, `deliveryType`, `serviceCode`, `serviceName`, `cost`, `currency`, estimated days) plus safe provider metadata in `quoteSnapshot` needed for creation (`logistic_type`, `service_type.code`, `carrier.id`, selected point when applicable, and Zipnova quote/reference IDs if present). Shipment creation should run only after MP approval or equivalent confirmed payment, use `ZIPNOVA_ACCOUNT_ID` and `ZIPNOVA_ORIGIN_ID` server-side, and persist Zipnova shipment/tracking/label metadata in `shipping_import_result` and `shipping_tracking_number`.

Keep direct Correo code until Zipnova is verified in staging. Do not introduce `NEXT_PUBLIC_` Zipnova secrets. Avoid top-level schema changes unless Zipnova requires a stable field that admin/search/reporting must query directly.

### Risks
- Zipnova pickup/dropoff points may be tied to quote options rather than a simple province-only branch list; the existing `/api/shipping/agencies` contract may need refinement.
- Shipment creation requires quote-derived values; losing or under-normalizing `logistic_type`, `service_type`, `carrier_id`, or `point_id` in the persisted snapshot can make post-payment import fail.
- Single-charge behavior is critical: checkout total, persisted order total, and MercadoPago line items must continue adding paid shipping exactly once.
- MercadoPago webhook has no tenant env context and correctly resolves tenant via `mp_preference_id`; Zipnova creation must not bypass that tenant-safe claim/update flow.
- Env secrecy needs attention: Zipnova token/secret must remain server-only and placeholders in examples; never log Basic Auth headers or response payloads that may contain sensitive operational data.
- Current admin follow-up copy references MiCorreo manual steps; after Zipnova creation/labels/tracking, this may be misleading.
- No dedicated test runner exists; verification will likely rely on adapter-level mocked fetch checks, `npm run build`, and manual/staging checkout tests unless test tooling is added.

### Ready for Proposal
Yes. The proposal should frame this as a provider swap behind the existing provider-neutral shipping architecture: Zipnova Envíos becomes the default provider, direct Correo remains as rollback, checkout/API/order/admin contracts stay stable, and secrets/payment/tenant invariants are explicitly protected.
