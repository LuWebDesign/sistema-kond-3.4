# Proposal: Email System — Order Received Notifications

## Intent

Customers receive no email when they place an order (neither via direct checkout nor MercadoPago). This creates uncertainty about whether the purchase was registered. Closing this gap requires adding the `recibido` trigger to both checkout flows and extracting shared template logic to avoid duplication.

## Scope

### In Scope
- New `recibido` email template (order confirmed at checkout)
- Extract shared HTML wrapper and helpers to `next-app/utils/emailTemplates.js`
- Refactor `send-order-email.js` to import from shared templates
- Add `recibido` trigger in `finalizar-compra.js` after `saveOrder()`
- Add `recibido` trigger in `mi-carrito/mp-success.js` after MP payment confirmed
- Support `'recibido'` and `'recibido_mp'` states in `pages/api/pedidos/catalogo/[id].js`

### Out of Scope
- Resend SDK (raw fetch is sufficient at current volume)
- React Email / TypeScript (project is JS-only, Pages Router)
- MP webhook email trigger (deferred — complex, low value now)
- Email logging/traceability table (deferred)
- Multi-tenant brand override (deferred)
- Admin email panel (deferred)

## Capabilities

### New Capabilities
- `order-received-email`: Sends a transactional "pedido recibido" email when an order is created (checkout or MP approval)
- `shared-email-templates`: Centralized HTML wrapper and template helpers for all transactional emails

### Modified Capabilities
- None — `send-order-email.js` is refactored internally; external behavior of `confirmado`/`listo` states is unchanged

## Approach

1. Create `utils/emailTemplates.js` with `buildEmailWrapper(content, options)` and `buildOrderReceivedTemplate(order)` helpers
2. Refactor `send-order-email.js` to import from `emailTemplates.js`; add `recibido` / `recibido_mp` case
3. Add fire-and-forget `fetch('/api/pedidos/send-order-email', ...)` call in `finalizar-compra.js` and `mp-success.js`
4. Update API handler to accept the two new state values

Raw fetch pattern already in use — no new infrastructure needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/utils/emailTemplates.js` | New | Shared HTML wrapper + template builders |
| `next-app/pages/api/pedidos/send-order-email.js` | Modified | Import from shared templates; add `recibido`/`recibido_mp` |
| `next-app/pages/mi-carrito/finalizar-compra.js` | Modified | Fire email after `saveOrder()` |
| `next-app/pages/mi-carrito/mp-success.js` | Modified | Fire email after MP confirmation |
| `next-app/pages/api/pedidos/catalogo/[id].js` | Modified | Accept `recibido` / `recibido_mp` state values |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate `recibido` email if MP flow retries | Low | Guard with idempotency check on `mp_preference_id` in `mp-success.js` |
| Email failure blocks checkout flow | Low | All sends are fire-and-forget (no `await` in critical path) |
| `finalizar-compra.js` missing required order fields for template | Low | Template uses only fields already present in `saveOrder()` response |

## Rollback Plan

All changes are additive or isolated refactors. To revert:
1. Remove the two `fetch(send-order-email)` calls from `finalizar-compra.js` and `mp-success.js`
2. Revert `send-order-email.js` to its pre-refactor version (keep in git)
3. Delete `utils/emailTemplates.js`

No DB schema changes — zero migration rollback needed.

## Dependencies

- Resend API key (`RESEND_API_KEY`) must be set in `.env.local` — already present per exploration
- Sender domain `kond.com.ar` must be verified in Resend — already verified

## Success Criteria

- [ ] Customer receives a "pedido recibido" email after completing checkout via `finalizar-compra.js`
- [ ] Customer receives a "pedido recibido" email after MP payment is approved on `mp-success.js`
- [ ] Existing `confirmado` and `listo` emails still send without regression
- [ ] `utils/emailTemplates.js` is the single source for HTML wrapper — no duplicate wrapper strings
- [ ] No checkout flow is blocked if Resend call fails
