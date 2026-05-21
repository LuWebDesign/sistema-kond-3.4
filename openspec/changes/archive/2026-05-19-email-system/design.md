# Design: Email System — Order Received Notifications

> Artifact store: hybrid (Engram + filesystem)
> Date: 2026-05-19

---

## Technical Approach

Extract all HTML template functions from `send-order-email.js` into `utils/emailTemplates.js`, add a `buildRecibidoEmail` builder for the two new states, and wire fire-and-forget triggers in both checkout flows. No new infrastructure — raw `fetch` to Resend is already the pattern.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Template extraction | Move all 4 helpers + 2 builders to `utils/emailTemplates.js`; export them | Keep inline | Single source; `send-order-email.js` already has all helpers — lift-and-shift is zero-risk |
| `buildRecibidoEmail` signature | `({ pedido, items })` — matches `buildConfirmadoEmail` / `buildListoEmail` pattern | Flat opts | Consistency with existing builder API; `pedido` already contains `cliente_nombre`, `total`, `id` |
| `recibido` trigger in `finalizar-compra.js` | Fire-and-forget after line 366 (`saveOrder` in `handleSubmitOrder`) | After redirect | `saveOrder` returns `{ success, orderId, data }` — `orderId` or `data.id` is available immediately. Must be BEFORE `setTimeout(() => handleOrderComplete(), 1500)` at line 383 |
| `recibido_mp` trigger in `mp-success.js` | `useEffect` with `useRef(false)` dedup guard; load order from Supabase by `preference_id`, then fire | Webhook trigger | `mp-success.js` is currently a static display — it needs order loading added. `preference_id` is available from `router.query`. Webhook deferred per proposal |
| Dedup guard | `useRef(false)` — set to `true` before fetch | `useState` | Ref mutation is synchronous and does not cause re-render; prevents StrictMode double-fire |
| State validation | Allowed states: `confirmado`, `listo`, `recibido`, `recibido_mp` | Keep as-is | Spec requires both new states; change to `includes()` check |

---

## Data Flow

```
handleSubmitOrder (finalizar-compra.js)
  └─ saveOrder() → { success, orderId }
       └─ [fire-and-forget] POST /api/send-order-email { pedidoId, nuevoEstado: 'recibido' }
            └─ supabaseAdmin → pedidos_catalogo + pedidos_catalogo_items
            └─ buildRecibidoEmail({ pedido, items }) ← utils/emailTemplates.js
            └─ fetch Resend API

mp-success.js (useEffect on preference_id)
  └─ supabaseAdmin → pedidos_catalogo WHERE mp_preference_id = preference_id
       └─ [emailSentRef check] → once only
       └─ [fire-and-forget] POST /api/send-order-email { pedidoId, nuevoEstado: 'recibido_mp' }
            └─ same path as above
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `next-app/utils/emailTemplates.js` | **Create** | Pure exports: `escapeHtml`, `formatCurrency`, `buildItemsTable`, `wrapEmail`, `buildConfirmadoEmail`, `buildListoEmail`, `buildRecibidoEmail` |
| `next-app/pages/api/send-order-email.js` | **Modify** | Import all builders from `../../utils/emailTemplates`; extend state guard to include `recibido`/`recibido_mp`; add subject+builder dispatch for both new states |
| `next-app/pages/mi-carrito/finalizar-compra.js` | **Modify** | Add fire-and-forget email call after line 366 in `handleSubmitOrder` |
| `next-app/pages/mi-carrito/mp-success.js` | **Modify** | Add `useState`, `useEffect`, `useRef` imports; load order by `preference_id`; fire email once via ref guard |

---

## Interfaces / Contracts

### `utils/emailTemplates.js` exports

```js
// Helpers (unchanged from current send-order-email.js)
export function escapeHtml(str): string
export function formatCurrency(amount): string           // es-AR, ARS
export function buildItemsTable(items): string           // items: pedidos_catalogo_items[]
export function wrapEmail(content): string               // full HTML document

// Template builders — all accept { pedido, items }
export function buildConfirmadoEmail({ pedido, items }): string
export function buildListoEmail({ pedido, items }): string
export function buildRecibidoEmail({ pedido, items }): string  // NEW

// Internal shape used by builders:
// pedido: { id, cliente_nombre, cliente_apellido, total, ... }
// items: pedidos_catalogo_items[] with { producto_nombre, cantidad, producto_precio, medidas? }
```

> **Note**: Current `buildConfirmadoEmail` / `buildListoEmail` in `send-order-email.js` use a flat opts shape `{ clienteNombre, pedidoId, items, total, miCuentaUrl }`. The refactor must preserve this shape internally — the `{ pedido, items }` unified signature from the spec is the external contract; builders derive `clienteNombre`, `pedidoId`, `total`, `miCuentaUrl` from `pedido` internally.

### `send-order-email.js` — updated state guard

```js
const VALID_STATES = ['confirmado', 'listo', 'recibido', 'recibido_mp']
if (!VALID_STATES.includes(nuevoEstado)) {
  return res.status(400).json({ error: 'Estado no soportado para email' })
}
```

### `send-order-email.js` — new dispatch cases

```js
} else if (nuevoEstado === 'recibido') {
  subject = '🛒 Pedido recibido - KOND'
  bodyHtml = buildRecibidoEmail({ pedido, items })
} else if (nuevoEstado === 'recibido_mp') {
  subject = '✅ Pago confirmado - KOND'
  bodyHtml = buildRecibidoEmail({ pedido, items })
}
```

### Trigger in `finalizar-compra.js` — insertion point

Insert after **line 367** (`if (!result.success) throw ...`), before **line 369** (`createToast`):

```js
// Fire-and-forget — never block checkout
const _orderId = result.orderId || result.data?.id
if (_orderId) {
  fetch('/api/send-order-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedidoId: _orderId, nuevoEstado: 'recibido' })
  }).catch(err => console.warn('Email send failed (non-critical):', err))
}
```

### Trigger in `mp-success.js` — full additions

```js
// Add to imports
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { TENANT_ID } from '../../lib/tenant'

// Inside component, after router destructure:
const emailSentRef = useRef(false)
const [pedido, setPedido] = useState(null)

useEffect(() => {
  if (!preference_id) return
  supabase
    .from('pedidos_catalogo')
    .select('id')
    .eq('mp_preference_id', preference_id)
    .eq('tenant_id', TENANT_ID)
    .single()
    .then(({ data }) => {
      if (data?.id) setPedido(data)
    })
}, [preference_id])

useEffect(() => {
  if (!pedido?.id || emailSentRef.current) return
  emailSentRef.current = true
  fetch('/api/send-order-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedidoId: pedido.id, nuevoEstado: 'recibido_mp' })
  }).catch(err => console.warn('Email MP send failed (non-critical):', err))
}, [pedido])
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `escapeHtml`, `formatCurrency`, `buildItemsTable` edge cases | Jest — pure functions, no mocks needed |
| Unit | `buildRecibidoEmail` output contains order number, items, total, CTA | Jest — assert on HTML string |
| Integration | `POST /api/send-order-email` with `recibido`/`recibido_mp` | Mock Resend fetch + supabaseAdmin |
| Integration | Missing API key returns `{ skipped: true }` | Same mock setup |
| Integration | Pedido without email returns `{ skipped: true, reason }` | Same |
| Manual | Checkout end-to-end: email arrives in inbox | Local dev with real Resend key |
| Manual | MP success: email fires once, not on re-render | React StrictMode dev build |

---

## Migration / Rollout

No DB schema changes. No migration required.

Deploy order: `utils/emailTemplates.js` → `send-order-email.js` → `finalizar-compra.js` + `mp-success.js` in a single PR (all additive).

---

## Constraints Found in Source

- **`mp-success.js` is minimal** (40 lines, no hooks): needs `useState`, `useEffect`, `useRef` added from scratch. No existing order-loading logic — must query Supabase client-side using `preference_id` from `router.query`.
- **`saveOrder` return shape** (`finalizar-compra.js` line 366): returns `{ success, orderId, data, error }` — use `result.orderId || result.data?.id` for the pedido ID.
- **MP flow in `finalizar-compra.js`** (lines 203–291, `handleMercadoPago`): does NOT call `send-order-email` — correct. MP email is triggered from `mp-success.js` after redirect.
- **`send-order-email.js` already imports `supabaseAdmin` and `TENANT_ID`**: no new imports needed there.
- **Builder signature mismatch**: current inline builders use flat opts; `{ pedido, items }` external contract requires internal destructure inside builders.

---

## Open Questions

- None — all insertion points identified, return shapes confirmed from source.
