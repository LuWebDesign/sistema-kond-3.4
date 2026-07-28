# Verification Report: shipping-carriers PR 4

**Change**: `shipping-carriers`  
**Mode**: Standard verify, chained PR slice review  
**Slice boundary**: PR 4 only — admin shipping visibility, delivery-method display fix, and final QA/release evidence.  
**Fresh-context rerun**: after admin detail mapping/display implementation.

## Verdict

**PASS WITH WARNINGS** — PR4 admin detail mapping/display is present and build/syntax checks pass. The suspicious `metodoPago === 'envio'` admin display logic was replaced with `metodoEntrega` metadata, and detail read/update paths touched by this slice are tenant-scoped. Warning: browser/manual scenario QA was not run in this apply environment, so Phase 5.3 remains unchecked for final release sign-off.

## Build and checks

| Command | Result | Notes |
|---|---:|---|
| `node verify-setup.js` from repo root | PASS | Supabase structure check passed. |
| `node --check next-app/components/OrderCatalogDetailView.js` | PASS | Syntax check passed. |
| `node --check next-app/utils/pedidosCatalogoDetail.js` | PASS | Syntax check passed. |
| `node --check next-app/utils/supabasePedidos.js` | PASS | Syntax check passed. |
| `npx eslint components/OrderCatalogDetailView.js utils/pedidosCatalogoDetail.js utils/supabasePedidos.js` from `next-app/` | NOT RUNNABLE | ESLint 9 requires `eslint.config.*`; repo has no flat config. |
| `npm run build` from `next-app/` | PASS | Next.js 16.1.6 production build completed successfully. |

## Completeness

| Metric | Value |
|---|---:|
| Tasks total | 17 |
| Tasks complete | 16 |
| Tasks incomplete | 1 |
| PR4-scoped implementation tasks complete | 2/3 |

Incomplete task is Phase 5.3 browser/manual QA for final release sign-off.

## Spec compliance matrix

| Requirement / scenario | Result | Evidence |
|---|---:|---|
| Customer can choose `domicilio` and request home rates | PASS (static + build) | `finalizar-compra.js` uses `shippingDeliveryType`, maps `domicilio` to `home`, posts to `/api/shipping/rates`, and persists `deliveryType`. |
| Customer can choose `sucursal` and persist branch snapshot | PASS (static + build) | `finalizar-compra.js` loads `/api/shipping/agencies`, requires selected branch for branch shipping, and stores `agencySnapshot`. |
| Quote unavailable continues as `A cotizar` | PASS (static + build) | Unavailable/missing quote sets `status: 'to_quote'`, cost `0`, manual follow-up, and UI displays `A cotizar`. |
| Free shipping shows `Envío gratis` with struck-through quote | PASS (static + build) | Summary renders struck-through quoted price when present and `Envío gratis`; snapshot status becomes `free` with cost `0`. |
| Paid shipping is added exactly once | PASS (static + build) | Checkout total adds `paidShippingCost` once; persisted order uses that total; MP route appends one shipping item only when `shipping.status === 'quoted'` and cost is positive. |
| Fallback/free shipping adds no positive MP shipping amount | PASS (static + build) | `addShippingItemOnce()` returns original items unless status is `quoted` and cost > 0. |
| Import runs only after approved payment | PASS (static + build) | Webhook calls `importShipmentAfterApproval()` only under `status === 'approved'`. |
| Import idempotency | PASS (static + build) | Webhook skips terminal/in-progress statuses and atomically claims only `shipping_import_status IN ('pending')` before import. |
| Webhook tenant-safe resolution | PASS (static + build) | Missing `preference_id` logs and returns; normal lookup uses `mp_preference_id`; updates/import claim/results include `.eq('tenant_id', resolvedTenantId)`. |
| Admin detail maps provider-neutral shipping metadata | PASS (static + build) | `mapSupabasePedidoToFrontend()` now maps `pedidos_catalogo.shipping_*` fields into `pedido.shipping`. |
| Admin detail displays shipping provider/service/delivery/cost | PASS (static + build) | `OrderCatalogDetailView.js` renders the `Envío` card with provider, service, delivery type, cost/currency, and shipping status. |
| Admin detail displays selected agency and destination snapshots | PASS (static + build) | The `Envío` card renders agency and destination snapshot fields when present. |
| Admin detail exposes import/manual follow-up state | PASS (static + build) | The `Envío` card renders import status/result, tracking number, and MiCorreo manual label workflow instructions. |
| Shipping address display uses delivery metadata | PASS (static + build) | No remaining `metodoPago === 'envio'` branch exists in `OrderCatalogDetailView.js`; address display uses `pedido.metodoEntrega === 'envio'`. |
| Admin detail read/update tenant filters | PASS (static + build) | `getPedidoCatalogoById()`, `updatePedidoCatalogo()`, and `updateMontoRecibido()` now include `.eq('tenant_id', TENANT_ID)`. |

## Correctness findings

### CRITICAL

None.

### WARNING

1. Browser/manual scenario QA was not executed; evidence is source inspection plus setup/syntax/build checks.
2. Phase 5.3 remains unchecked until browser/manual QA covers product fields, home/agency checkout, unavailable/free/paid shipping, approved import, and admin follow-up.

### SUGGESTION

1. Before release sign-off, run the browser/manual QA checklist against an environment with Correo env vars configured and the PR1 Supabase migration applied.

## Safe to commit

Partially — PR4 implementation files are safe to review, but final release sign-off should wait for the remaining browser/manual QA in Phase 5.3.
