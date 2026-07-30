# Proposal: Zipnova Shipping Provider

## Intent

Add Zipnova Envíos as the default shipping provider behind the existing provider-neutral checkout/order facade so shoppers can choose curated home delivery or pickup-point options without exposing raw provider complexity. Checkout must remain resilient: if Zipnova quoting is unavailable, shoppers can still buy with `envío a coordinar`.

## Scope

### In Scope
- Server-only Zipnova provider adapter for quotes and admin-triggered shipment creation.
- Curated checkout shipping options for home delivery and pickup point/sucursal.
- Persist normalized shipping metadata plus safe Zipnova quote fields needed later (`logistic_type`, `service_type.code`, `carrier.id`, pickup point data).
- Preserve MercadoPago single-charge behavior for selected paid shipping.
- Admin order flow can confirm/generate the real Zipnova shipment after order review.

### Out of Scope
- Auto-creating Zipnova shipments from the MercadoPago webhook.
- Showing every raw Zipnova option to shoppers.
- DB-driven multi-provider routing, new public secrets, or top-level schema changes unless later proven necessary.

## Capabilities

### New Capabilities
- `zipnova-shipping-provider`: Covers Zipnova quote normalization, curated delivery/pickup options, fallback-to-coordinate behavior, and admin-confirmed shipment creation.

### Modified Capabilities
- None. Existing specs only cover admin auth/rate limiting and are unrelated.

## Approach

Implement `zipnova` behind `next-app/lib/shipping/index.js`, keeping Correo Argentino as rollback/reference. The adapter will use `https://api.zipnova.com.ar/v2` with server-only Basic Auth and env config. `/api/shipping/rates` remains the checkout contract, but returns curated normalized rates and stores provider metadata in quote snapshots. Pickup-point choices should come from quote-derived Zipnova data when available. The MP webhook must keep tenant-safe payment updates but leave shipment creation pending; admins generate the shipment from the order flow after validating stock, package data, and address quality.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/lib/shipping/` | Modified/New | Add Zipnova adapter and switch default provider. |
| `next-app/pages/api/shipping/` | Modified | Preserve public rate contract; support curated pickup/home options. |
| `next-app/pages/mi-carrito/finalizar-compra.js` | Modified | Show curated options and `envío a coordinar` fallback. |
| `next-app/pages/api/mp/` | Modified | Preserve shipping charge; do not auto-create Zipnova shipment. |
| `next-app/components/OrderCatalogDetailView.js` | Modified | Surface pending/admin-generated shipment status without MiCorreo wording. |
| `.env.example` | Modified | Document server-only Zipnova env placeholders. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Incomplete package/address data causes bad shipments | Med | Admin-confirm creation; fallback to coordinate. |
| Quote metadata insufficient for shipment creation | Med | Persist required safe Zipnova fields in quote snapshot. |
| Checkout noise from too many services | Med | Curate options before rendering. |
| Secret leakage | Low | Server-only envs; never expose auth values. |

## Rollback Plan

Switch the default provider back to `correo_argentino`, keep existing order shipping snapshots readable, and disable/admin-hide Zipnova shipment generation while preserving `envío a coordinar` orders.

## Dependencies

- Zipnova account/origin IDs and server-only API token/secret configured in deployment envs.
- Valid product package weight/dimensions and customer destination data.

## Success Criteria

- [ ] Checkout offers curated Zipnova home delivery and pickup-point/sucursal options.
- [ ] Quote failures do not block checkout and persist `envío a coordinar`.
- [ ] MercadoPago charges paid shipping exactly once.
- [ ] MP webhook does not create Zipnova shipments automatically.
- [ ] Admin can identify pending shipping and generate shipment after review.
