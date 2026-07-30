```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:8d83894453240a5bd5ce213b5975befa0297eda800277d4392373fc7f8bbc6c9
verdict: pass
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 8/8
test_command: node next-app/scripts/check-zipnova-shipping.mjs
test_exit_code: 0
test_output_hash: sha256:a7fb4279ae89f3ce3b6e1c10aca3e148375dd98f9d7f93feab92d23e9fd91ff0
build_command: npm run build (cwd: next-app/)
build_exit_code: 0
build_output_hash: sha256:973b0c6d2b028f7c8571ab129db31c1ab51eaf97f0b1a0e6f65492edd9fcc4a7
```

## Verification Report

**Change**: zipnova-shipping-provider  
**Version**: N/A  
**Mode**: Standard  
**Native envelope**: Present as the first non-empty content using `gentle-ai.verify-result/v1`.  
**Approved native review lineage**: `review-bf315481943a2767`.

### Completeness

| Metric | Value |
|--------|-------|
| Requirements total | 4 |
| Requirements complete | 4 |
| Scenarios total | 8 |
| Scenarios compliant | 8 |
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |
| Strict TDD mode | Disabled |

### Build & Tests Execution

| Command | CWD | Exit code | Output hash | Result |
|---------|-----|-----------|-------------|--------|
| `node next-app/scripts/check-zipnova-shipping.mjs` | repo root | 0 | `sha256:a7fb4279ae89f3ce3b6e1c10aca3e148375dd98f9d7f93feab92d23e9fd91ff0` | ✅ Passed |
| `node verify-setup.js` | repo root | 0 | `sha256:b192b64c1cc5cc1ef4427c1d83aedc4dfa3ce0f91715f47a6b6ebb41deed653c` | ✅ Passed |
| `npm run build` | `next-app/` | 0 | `sha256:973b0c6d2b028f7c8571ab129db31c1ab51eaf97f0b1a0e6f65492edd9fcc4a7` | ✅ Passed |

**Focused check output**:
```text
Zipnova shipping checks passed
```

**Setup verification summary**:
```text
Supabase structure verification passed. Output ended with: Estructura Supabase completa y correcta.
```

**Build summary**:
```text
Next.js 16.1.6 production build completed successfully and generated 60 pages.
Warnings only: stale baseline-browser-mapping/caniuse-lite data and deprecated middleware convention.
```

**Coverage**: ➖ Not available. The project has no configured coverage runner for this change; verification used the focused Node contract check, setup verification, production build, and source inspection.

### Spec Compliance Matrix

| Requirement | Scenario | Test / Evidence | Result |
|-------------|----------|-----------------|--------|
| Curated Zipnova shipping choices | Home delivery option shown | `check-zipnova-shipping.mjs` exercises `getZipnovaRates()` with eligible home data and asserts one normalized `home` option is retained. Source inspection confirms `curateRates()` keeps at most one `home` and one `agency` rate. | ✅ COMPLIANT |
| Curated Zipnova shipping choices | Pickup option shown | Focused check exercises pickup quote mapping and quote-derived agencies. Source inspection confirms agency quotes require normalized pickup point metadata before becoming payable options. | ✅ COMPLIANT |
| Quote failure fallback | Zipnova unavailable | Source inspection confirms provider/facade failures produce unavailable/no-rate behavior and checkout maps unavailable/no payable quote to `status: 'to_quote'` with `manualFollowupRequired: true`; build passed. | ✅ COMPLIANT |
| Quote failure fallback | No usable quote | Focused check asserts pickup quotes without shopper-selectable pickup metadata normalize to `null`; checkout then persists coordinate/manual follow-up fallback instead of charging shipping. | ✅ COMPLIANT |
| Shipping charge and metadata persistence | Paid shipping charged once | `create-preference.js` derives MP items from persisted order totals and `shipping_*` fields, subtracts quoted shipping from product amount, and appends exactly one shipping item only when `shipping.status === 'quoted'`. | ✅ COMPLIANT |
| Shipping charge and metadata persistence | Safe metadata retained | Checkout persists safe quote, destination, and agency snapshots; Zipnova quote snapshots retain provider, logistic type, service type code, carrier id, quote id, point id, and pickup point when applicable. | ✅ COMPLIANT |
| Admin-confirmed shipment creation | Webhook updates payment only | Focused check asserts no `importShippingShipment` or `shipping_import_status` in the MP webhook. Source inspection confirms webhook resolves tenant by `mp_preference_id`, ignores internal claim sentinels, and only updates MP/payment fields. | ✅ COMPLIANT |
| Admin-confirmed shipment creation | Admin generates shipment | Focused check and source inspection confirm protected POST-only admin route, `verifyAdminCookie(req)`, explicit projected columns, `.eq('tenant_id', TENANT_ID)`, paid/persisted quoted-shipping eligibility checks, admin confirmation, and shipment persistence/manual follow-up paths. | ✅ COMPLIANT |

**Compliance summary**: 8/8 scenarios compliant.

### Correctness (Static Evidence)

| Requirement / Focus | Status | Notes |
|---------------------|--------|-------|
| Zipnova default provider and rollback | ✅ Implemented | `next-app/lib/shipping/index.js` sets `SHIPPING_PROVIDER = 'zipnova'` and keeps `correo_argentino` registered. |
| Quote curation | ✅ Implemented | `curateRates()` returns one `home` and one `agency` option when valid; raw provider lists are not exposed directly. |
| Pickup without metadata not payable | ✅ Implemented | `normalizeZipnovaRate()` returns `null` for `agency` quotes without a normalized pickup point. |
| Fallback to coordinate/manual follow-up | ✅ Implemented | Checkout builds `to_quote` shipping with zero cost and manual follow-up when no usable quote exists. |
| Checkout does not send client-built MP items/shipping to preference creation | ✅ Implemented | Checkout POSTs only `payer`, `back_urls`, and `external_reference` to `/api/mp/create-preference`; MP amount derives from persisted order/shipping. |
| MP cent-level normalization | ✅ Implemented | `currencyToCents()` and `centsToCurrency()` normalize comparison and item amounts at cent precision. |
| MP duplicate/concurrent preference guard | ✅ Implemented | `claimPreferenceCreation()` writes a `kond-mp-claim:*` sentinel under tenant/id/retryable-status predicates; `persistPreferenceId()` requires the same sentinel. |
| MP failure cleanup and retry semantics | ✅ Implemented | Caught failures clear the sentinel; rejected/cancelled are retryable; approved/pagado states are terminal. |
| MP webhook payment-only and sentinel-safe | ✅ Implemented | Webhook refuses missing `preference_id`, ignores internal claim sentinels, resolves tenant by stored `mp_preference_id`, and updates only payment fields. |
| Admin shipment generation | ✅ Implemented | Explicit admin-only POST route is tenant-scoped, projected, paid-gated, quoted-shipping-gated, and never public GET. |
| Ambiguous external create handling | ✅ Implemented | Zipnova timeout/network/malformed successful shipment JSON paths become `ambiguousExternalCreate`; admin route marks `manual_followup` and avoids automatic retry. |
| Server-only Zipnova provider concerns | ✅ Implemented | Adapter reads only server `ZIPNOVA_*` env vars, uses Basic Auth, timeout, and `Idempotency-Key: kond-zipnova-shipment-{orderId}` for shipment creation. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Add `zipnova` adapter behind shipping facade and preserve Correo rollback | ✅ Yes | Adapter exists under `next-app/lib/shipping/providers/zipnova.js`; facade keeps both providers. |
| Normalize/curate shopper options instead of exposing raw provider choices | ✅ Yes | Only curated normalized rates reach checkout. |
| Reuse existing shipping JSON snapshots | ✅ Yes | No DB migration was introduced; existing `shipping_*_snapshot` fields carry provider metadata. |
| Shipment creation only through explicit admin action | ✅ Yes | Admin route and adapter require explicit confirmation; MP webhook remains payment-only. |
| Server-only secrets | ✅ Yes | `ZIPNOVA_API_TOKEN` and `ZIPNOVA_API_SECRET` are only used server-side and are excluded from normalized responses/check output. |

### Issues Found

**CRITICAL**: None.

**WARNING**:
- Verification uses a focused Node/static contract check instead of a full API/browser integration suite because this project has no configured test runner or coverage command for this change.
- Build emitted existing maintenance warnings for stale browser data and deprecated Next.js middleware convention; these are not Zipnova regressions.

**SUGGESTION**:
- Add Playwright or API integration coverage for checkout quote selection, order persistence, MercadoPago preference creation, webhook payment-only behavior, and admin shipment generation when the project test infrastructure is established.

### Verdict

PASS WITH WARNINGS

All Zipnova provider requirements, design decisions, and 16/16 tasks are verified by passing focused checks, setup verification, production build, and source inspection. Warnings are limited to test-infrastructure and baseline maintenance gaps, not implementation blockers.
