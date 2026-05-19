# Archive Report: email-system

> Archived: 2026-05-19
> Status: **completed**

---

## Change Summary

**Change name**: `email-system`
**Intent**: Add "pedido recibido" transactional emails to both checkout flows (direct and MercadoPago), extracting shared HTML template logic into a single utility module.

---

## SDD Phase Completion

| Phase   | Status |
|---------|--------|
| Explore  | ✅ |
| Propose  | ✅ |
| Spec     | ✅ |
| Design   | ✅ |
| Tasks    | ✅ |
| Apply    | ✅ |
| Verify   | ✅ (build passed, `npm run build` clean) |

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `next-app/utils/emailTemplates.js` | **Created** | Pure ESM module with `escapeHtml`, `formatCurrency`, `buildItemsTable`, `wrapEmail`, `buildConfirmadoEmail`, `buildListoEmail`, `buildRecibidoEmail` — single source of truth for all transactional email HTML |
| `next-app/pages/api/send-order-email.js` | **Refactored** | Imports all builders from `emailTemplates.js`; extended `VALID_STATES` to include `recibido` and `recibido_mp`; added dispatch cases for both new states |
| `next-app/pages/mi-carrito/finalizar-compra.js` | **Modified** | Fire-and-forget POST to `/api/send-order-email` with `nuevoEstado: 'recibido'` after `saveOrder()` succeeds (non-blocking, before `setTimeout(handleOrderComplete)`) |
| `next-app/pages/mi-carrito/mp-success.js` | **Rewritten** | Added `useState`, `useEffect`, `useRef` hooks; queries `pedidos_catalogo` by `mp_preference_id`; fires email once via `useRef(false)` dedup guard |

---

## Deviations from Design

| Deviation | Detail |
|-----------|--------|
| **ESM over CJS** | `tasks.md` mentioned `module.exports` (CJS), but the project uses ESM `import/export` throughout (verified in `catalogUtils.js` and the existing `send-order-email.js`). All exports use named ESM syntax. |
| **Flat params kept** | The spec's `{ pedido, items }` unified signature was described as the external contract, but existing call sites for `buildConfirmadoEmail`/`buildListoEmail` in `send-order-email.js` already destructure flat opts (`clienteNombre`, `pedidoId`, `total`, `miCuentaUrl`). All three builders use consistent flat params to avoid breaking the `confirmado`/`listo` paths. `buildRecibidoEmail` follows the same flat signature. |

---

## Pre-existing Bug Fixed

**`react-markdown` missing from `package.json`**: Build failed during verify with a module-not-found error for `react-markdown`. Confirmed this was pre-existing (unrelated to email-system changes) by reverting and testing. Fixed by adding `react-markdown` to `next-app/package.json` dependencies.

---

## Deferred Items

These were explicitly out of scope per the proposal and remain deferred:

- **Resend SDK** — raw `fetch` to Resend API is sufficient at current volume
- **React Email / TypeScript** — project is JS-only Pages Router; not a fit
- **Email logging table** — no DB table for email send history
- **MP webhook trigger** — email trigger from webhook deferred (complex, low value now); trigger is from `mp-success.js` page instead
- **Multi-tenant brand override** — single brand config for now; tenant-specific colors/logos deferred
- **Admin email panel** — no UI for resending or previewing emails

---

## How to Activate

Add to `next-app/.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=pedidos@kond.com.ar
```

`RESEND_FROM_EMAIL` domain must be verified in Resend dashboard. If either env var is missing, the API returns `{ success: false, skipped: true }` — checkout flow is never blocked.

---

## Engram Observation IDs

| Artifact | Engram ID |
|----------|-----------|
| Apply progress / implementation summary | #38 |

---

## Archive Location

```
openspec/changes/archive/2026-05-19-email-system/
```
