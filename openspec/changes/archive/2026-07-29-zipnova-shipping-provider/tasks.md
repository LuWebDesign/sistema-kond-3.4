# Tasks: Zipnova Shipping Provider

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 provider foundation -> PR 2 checkout/order persistence -> PR 3 admin shipment action + webhook cleanup |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add server-only Zipnova adapter and facade registration | PR 1 | Keep Correo rollback; include adapter tests/checks. |
| 2 | Wire checkout rates/agencies/order snapshots without breaking MP single shipping charge | PR 2 | Depends on PR 1; verify fallback `to_quote`. |
| 3 | Add protected admin shipment creation and remove webhook auto-shipment behavior | PR 3 | Depends on PR 2; verify tenant-safe updates. |

## Phase 1: Provider Foundation

- [x] 1.1 Create `next-app/lib/shipping/providers/zipnova.js` with server-only Basic Auth config from `ZIPNOVA_*`; never expose token/secret.
- [x] 1.2 Implement Zipnova quote normalization/curation for `home` and `agency`, retaining safe `quoteSnapshot` fields: logistic type, service type code, carrier id, quote id, point id.
- [x] 1.3 Implement Zipnova shipment creation normalization in the adapter, returning `{ imported, provider, shipmentId, trackingNumber, status, labelUrl, importedAt }`.
- [x] 1.4 Modify `next-app/lib/shipping/index.js` to register `zipnova` as default while preserving `correo_argentino` as rollback.

## Phase 2: Checkout and Public Shipping APIs

- [x] 2.1 Modify `next-app/pages/api/shipping/rates.js` to pass destination/package/delivery type to Zipnova and return safe `available:false` fallback on quote failure.
- [x] 2.2 Modify `next-app/pages/api/shipping/agencies.js` to preserve GET contract and return Zipnova quote-derived pickup points when available; keep safe empty response otherwise.
- [x] 2.3 Modify `next-app/pages/mi-carrito/finalizar-compra.js` to select curated Zipnova rates, allow pickup from selected rate metadata, and persist `to_quote` fallback without requiring agency selection.
- [x] 2.4 Verify `next-app/pages/api/mp/create-preference.js` still adds selected paid shipping exactly once and does not duplicate charges.

## Phase 3: Admin Shipment Flow and Webhook Safety

- [x] 3.1 Create `next-app/pages/api/admin/shipping/shipments.js` as protected POST only using `verifyAdminCookie(req)`; no public GET is needed.
- [x] 3.2 In the admin shipment API, read/update `pedidos_catalogo` with explicit projected columns and `.eq('tenant_id', TENANT_ID)` before calling Zipnova.
- [x] 3.3 Modify `next-app/pages/api/mp/webhook.js` to remove automatic `importShippingShipment()` calls; keep payment-only tenant-safe updates and projected columns.
- [x] 3.4 Modify `next-app/components/OrderCatalogDetailView.js` to show pending/generate shipment action and provider-neutral/Zipnova wording.

## Phase 4: Tests, Verification, and Docs

- [x] 4.1 Add focused tests or Node checks for Zipnova config/auth errors, quote curation, pickup mapping, shipment normalization, and no secret leakage.
- [x] 4.2 Add API/integration checks for `/api/shipping/rates`, `/api/shipping/agencies`, protected admin shipment POST, and MP webhook payment-only behavior.
- [x] 4.3 Run `node verify-setup.js` from repo root and `npm run build` in `next-app/`.
- [x] 4.4 Append Zipnova server-only placeholders to `.env.example` only if missing; preserve unrelated existing changes in `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md`, and `.env.example`.
