# Tasks: Email System — Order Received Notifications

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220–270 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 4 tasks | PR 1 | Foundation first (emailTemplates.js), then dependents; all additive |

---

## Phase 1: Foundation — `utils/emailTemplates.js`

- [x] 1.1 Create `next-app/utils/emailTemplates.js` — move `escapeHtml`, `formatCurrency`, `buildItemsTable`, `wrapEmail` from `send-order-email.js` verbatim
- [x] 1.2 Add `buildConfirmadoEmail({ pedido, items })` and `buildListoEmail({ pedido, items })` — wrap existing flat-opts logic; destructure `pedido` internally to derive `clienteNombre`, `pedidoId`, `total`, `miCuentaUrl`
- [x] 1.3 Add `buildRecibidoEmail({ pedido, items })` — include order number, items table, total, "Ver mi pedido" CTA button
- [x] 1.4 Export all 7 symbols via named ESM exports (project uses ESM `import` — verified in send-order-email.js and catalogUtils.js)

## Phase 2: Refactor `pages/api/send-order-email.js`

- [x] 2.1 Import all 7 exports from `../../utils/emailTemplates` at top of file
- [x] 2.2 Remove the 4 inline helper functions and 2 inline builder functions (now in utils)
- [x] 2.3 Change state guard to `const VALID_STATES = ['confirmado', 'listo', 'recibido', 'recibido_mp']` with `.includes()` check
- [x] 2.4 Add dispatch cases for `recibido` (subject `🛒 Pedido recibido - KOND`) and `recibido_mp` (subject `✅ Pago confirmado - KOND`), both calling `buildRecibidoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })`

## Phase 3: Trigger — `pages/mi-carrito/finalizar-compra.js`

- [x] 3.1 Read file, locate `handleSubmitOrder` and the block after `if (!result.success) throw` (line ~367)
- [x] 3.2 Insert fire-and-forget block: resolve `_orderId = result.orderId || result.data?.id`; if truthy, POST to `/api/send-order-email` with `nuevoEstado: 'recibido'`; chain `.catch(err => console.warn(...))`
- [x] 3.3 Verify insertion is BEFORE `setTimeout(() => handleOrderComplete(), 1500)` at line ~383 and does NOT block with `await`

## Phase 4: Trigger — `pages/mi-carrito/mp-success.js`

- [x] 4.1 Add imports: `useState`, `useEffect`, `useRef` from `react`; `supabase` from `../../supabase/client`; `TENANT_ID` from `../../lib/tenant`
- [x] 4.2 Inside component after `router` destructure: declare `emailSentRef = useRef(false)` and `[pedido, setPedido] = useState(null)`
- [x] 4.3 Add `useEffect` #1: on `preference_id` — query `pedidos_catalogo` where `mp_preference_id = preference_id` and `tenant_id = TENANT_ID`, call `.single()`, set pedido state on success
- [x] 4.4 Add `useEffect` #2: on `[pedido]` — guard `!pedido?.id || emailSentRef.current`; set ref `true`; fire-and-forget POST `/api/send-order-email` with `nuevoEstado: 'recibido_mp'`; `.catch(console.warn)`

## Phase 5: Verification

- [ ] 5.1 Unit: call `buildItemsTable([])` → assert output contains "Sin detalle"
- [ ] 5.2 Unit: call `buildRecibidoEmail({ pedido: { id:'T1', cliente_nombre:'Ana', total:1500 }, items:[...] })` → assert HTML contains order number, "Ver mi pedido", and formatted total
- [ ] 5.3 Integration: POST `/api/send-order-email` with `estado='recibido'` and mock Resend → assert 200 + subject contains "Pedido recibido"
- [ ] 5.4 Integration: POST with no `RESEND_API_KEY` → assert `{ success: false, skipped: true }`
- [ ] 5.5 Manual: complete checkout in dev → confirm email lands in inbox
- [ ] 5.6 Manual: hit MP success page → confirm email fires once; refresh → confirm NOT fired again
