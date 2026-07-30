# Design: Zipnova Shipping Provider

## Technical Approach

Add Zipnova Envíos as a server-only provider behind the existing `next-app/lib/shipping` facade. Keep the checkout, order, and MercadoPago public contracts provider-neutral, store Zipnova creation metadata inside existing JSON snapshots, and move real shipment creation out of the MP webhook into an explicit admin action. Quote failures return no rates and let checkout persist `to_quote` / `envío a coordinar` instead of blocking purchase.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Provider integration | Create `next-app/lib/shipping/providers/zipnova.js` and switch `SHIPPING_PROVIDER` to `zipnova`. Keep Correo adapter. | Replace public APIs with Zipnova-specific routes; delete Correo now. | Smallest safe change; keeps rollback via `correo_argentino` and preserves existing checkout/order shape. |
| Shopper options | Adapter normalizes and curates rates into one/few `home` and `agency` options. | Render all Zipnova carrier/service options. | Product constraint: avoid raw provider noise while still supporting home and pickup. |
| Persistence | Reuse existing shipping columns; put Zipnova metadata in `shipping_quote_snapshot` and pickup data in `shipping_agency_snapshot`. | Add top-level columns for every Zipnova field. | Existing schema already supports provider-neutral snapshots; avoids DB churn. |
| Shipment creation | Add protected admin API to create Zipnova shipment; remove/disable webhook auto-import. | Create shipments automatically on MP approval. | Admin must validate order/package/address first; first version explicitly forbids webhook shipment creation. |
| Secrets | Read `ZIPNOVA_API_TOKEN`, `ZIPNOVA_API_SECRET`, `ZIPNOVA_ACCOUNT_ID`, `ZIPNOVA_ORIGIN_ID` only server-side. | `NEXT_PUBLIC_` vars or client calls. | Prevents credential exposure. |

## Data Flow

```text
Checkout form -> POST /api/shipping/rates -> shipping facade -> zipnova adapter
      <- curated rates with quoteSnapshot/providerMeta
Order save -> pedidos_catalogo shipping_* columns
MP preference -> adds selected quoted shipping item once
MP webhook -> payment fields only; shipping stays pending
Admin detail -> POST /api/admin/shipping/shipments -> Zipnova POST /shipments -> update shipping_import_*
```

## File Changes

| File | Action | Description |
|---|---|---|
| `next-app/lib/shipping/providers/zipnova.js` | Create | Basic Auth Zipnova client, config validation, quote normalization, pickup-point extraction, shipment creation, safe error handling. |
| `next-app/lib/shipping/index.js` | Modify | Register `zipnova`, set it as default, expose `create/importShipment` through existing `importShippingShipment()` facade for admin use only. |
| `next-app/pages/api/shipping/rates.js` | Modify | Preserve POST contract; pass postal/province/package/delivery type; return curated rates plus `available:false` fallback on provider failure. |
| `next-app/pages/api/shipping/agencies.js` | Modify | Keep GET contract for checkout, but for Zipnova return quote-derived/provider-normalized pickup points when feasible; otherwise empty safe response. |
| `next-app/pages/mi-carrito/finalizar-compra.js` | Modify | Default provider fallback to `zipnova`, allow sucursal checkout from selected rate pickup metadata, persist `to_quote` fallback without requiring agency selection when no pickup quote exists. |
| `next-app/pages/api/mp/webhook.js` | Modify | Remove shipment creation call; keep tenant-safe payment update and projected columns only. |
| `next-app/pages/api/admin/shipping/shipments.js` | Create | Protected POST endpoint using `verifyAdminCookie(req)` to claim pending shipment, call Zipnova, update `shipping_import_status/result/tracking` scoped by tenant. No public GET needed. |
| `next-app/components/OrderCatalogDetailView.js` | Modify | Show pending/generate shipment action and replace MiCorreo-specific manual text with provider-neutral/Zipnova wording. |
| `.env.example` | Caution only | Already has unrelated pre-existing changes; implementation must only append Zipnova placeholders if not already present and must not overwrite. |

## Interfaces / Contracts

Normalized rate:

```js
{
  provider: 'zipnova', deliveryType: 'home' | 'agency',
  serviceCode, serviceName, cost, currency: 'ARS',
  estimatedDaysMin, estimatedDaysMax,
  quoteSnapshot: { provider: 'zipnova', logisticType, serviceTypeCode, carrierId, quoteId, pointId }
}
```

Admin create response:

```js
{ imported: true, provider: 'zipnova', shipmentId, trackingNumber, status, labelUrl, importedAt }
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Zipnova auth/config errors, quote curation, pickup mapping, shipment result normalization. | Mock `fetch` in adapter-level tests or focused Node checks. |
| Integration | `/api/shipping/rates`, `/api/shipping/agencies`, protected admin shipment POST, MP webhook payment-only behavior. | Mock provider/API responses; verify no secrets in JSON/logs and tenant-scoped updates. |
| Build/manual | Checkout paid shipping charged once; quote failure continues as `envío a coordinar`; admin generates shipment. | `npm run build`, staging checkout with MP sandbox and Zipnova sandbox/real test account. |

## Migration / Rollout

No DB migration is required for v1; existing shipping JSON columns are sufficient. Configure server-only envs in deployment: `ZIPNOVA_API_TOKEN`, `ZIPNOVA_API_SECRET`, `ZIPNOVA_ACCOUNT_ID=21576`, `ZIPNOVA_ORIGIN_ID=379814`. Preserve unrelated working tree changes (`.atl/.skill-registry.cache.json`, `.atl/skill-registry.md`, `.env.example`). Roll back by setting default provider back to `correo_argentino` and hiding admin Zipnova generation.

## Open Questions

- [ ] Exact Zipnova quote/create payload field names should be verified against the live account/docs before implementation.
- [ ] Confirm whether pickup points are quote-bound or can be fetched independently for `/api/shipping/agencies`.
