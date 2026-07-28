# Verification Report: shipping-carriers PR 3

**Change**: `shipping-carriers`  
**Mode**: Standard verify, chained PR slice review  
**Slice boundary**: PR 3 only — checkout shipping selection, order persistence metadata, MercadoPago single-charge integration, and approved-payment import.  
**Fresh-context rerun**: after webhook tenant-safety fix.

## Verdict

**PASS WITH WARNINGS** — The webhook tenant-safety fix is present: service-role fallback by `external_reference` was removed, missing `preference_id` exits safely, normal processing resolves by `mp_preference_id`, and all update/import mutations remain scoped by resolved `tenant_id`. PR3 remains focused and build/syntax checks pass. Warning: no browser/manual scenario run or dedicated automated scenario tests were executed in this verification pass.

## Build and checks

| Command | Result | Notes |
|---|---:|---|
| `node verify-setup.js` from repo root | PASS | Supabase structure check passed. |
| `node --check next-app/pages/api/mp/webhook.js` | PASS | Syntax check passed. |
| `node --check next-app/pages/api/mp/create-preference.js` | PASS | Syntax check passed. |
| `node --check next-app/hooks/useCatalog.js` | PASS | Syntax check passed. |
| `node --check next-app/utils/supabasePedidos.js` | PASS | Syntax check passed. |
| `npm run build` from `next-app/` | PASS | Next.js 16.1.6 production build completed successfully. |

## Completeness

| Metric | Value |
|---|---:|
| Tasks total | 17 |
| Tasks complete | 14 |
| Tasks incomplete | 3 |
| PR3-scoped tasks complete | 8/8 |

Incomplete tasks are Phase 5 admin display/release verification items and remain out of PR3 scope.

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

## Correctness findings

### CRITICAL

None.

### WARNING

1. No browser/manual scenario run or dedicated automated scenario tests were executed; evidence is source inspection plus setup/syntax/build checks.
2. PR3 diff is ~535 changed lines, above the nominal 400-line review budget, but it remains within the orchestrator-approved stacked-to-main PR3 boundary.

### SUGGESTION

1. If time permits before opening PR, add a minimal webhook unit-style harness for missing `preference_id`, approved import claim, and duplicate webhook skip.

## Safe to commit

Yes — no blocking findings remain for PR3 after the webhook tenant-safety fix. Commit should include only the seven focused PR3 files currently modified.
