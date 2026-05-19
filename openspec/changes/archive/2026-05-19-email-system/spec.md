# Delta Specs — email-system

> Artifact store: hybrid (Engram + filesystem)
> Date: 2026-05-19

---

## Spec 1: shared-email-templates (NEW)

### Purpose

Single source of truth for HTML email layout and template builders used by all transactional emails.

### Requirements

### Requirement: Email Wrapper

The module MUST export `wrapEmail(content: string): string` that returns a full HTML document with KOND branding (color `#3b82f6`→`#2563eb`), header, and footer. It MUST NOT use any browser APIs — it MUST be pure Node.js compatible.

#### Scenario: Wraps content

- GIVEN a string of inner HTML
- WHEN `wrapEmail(content)` is called
- THEN returns a valid HTML string containing the inner content, a KOND-branded header and footer

---

### Requirement: Helpers

The module MUST export `formatCurrency(amount: number): string` (ARS, `es-AR` locale) and `escapeHtml(str: string): string`.

#### Scenario: Currency format

- GIVEN a numeric amount (e.g. 1500)
- WHEN `formatCurrency(1500)` is called
- THEN returns a string in ARS format (e.g. `$ 1.500,00`)

---

### Requirement: Items Table

The module MUST export `buildItemsTable(items: array): string`. Items are `pedidos_catalogo_items[]` rows.

#### Scenario: Table with items

- GIVEN a non-empty items array with `nombre`, `cantidad`, `precio_unitario`
- WHEN `buildItemsTable(items)` is called
- THEN returns an HTML table with one row per item showing product name, qty, and subtotal

#### Scenario: Empty items

- GIVEN an empty array
- WHEN `buildItemsTable([])` is called
- THEN returns a fallback message "Sin detalle"

---

### Requirement: Template Builders

The module MUST export `buildConfirmadoEmail`, `buildListoEmail`, and `buildRecibidoEmail`. Each MUST accept `{ pedido, items }` and return a complete HTML string via `wrapEmail`.

`buildRecibidoEmail` MUST include: order number, items summary table, total, and a CTA button labeled "Ver mi pedido".

#### Scenario: Recibido email content

- GIVEN a pedido with `id`, `total`, and a non-empty items array
- WHEN `buildRecibidoEmail({ pedido, items })` is called
- THEN returns HTML containing the order number, items table, total, and a "Ver mi pedido" button

---

## Spec 2: order-received-email (DELTA — send-order-email.js)

### ADDED Requirements

### Requirement: recibido and recibido_mp States

The API MUST accept `estado` values `'recibido'` and `'recibido_mp'` in addition to existing states. Both MUST use `buildRecibidoEmail`.

| estado | Subject |
|---|---|
| `recibido` | `🛒 Pedido recibido - KOND` |
| `recibido_mp` | `✅ Pago confirmado - KOND` |

#### Scenario: recibido email

- GIVEN `pedidoId` + `estado='recibido'`
- WHEN POST `/api/send-order-email`
- THEN email is sent to customer with subject "🛒 Pedido recibido - KOND"

#### Scenario: recibido_mp email

- GIVEN `pedidoId` + `estado='recibido_mp'`
- WHEN POST `/api/send-order-email`
- THEN email is sent with subject "✅ Pago confirmado - KOND"

---

### Requirement: Graceful Skip — No API Key

If `RESEND_API_KEY` is not set, the API MUST return `{ success: false, skipped: true }` and MUST NOT throw.

#### Scenario: Missing API key

- GIVEN `RESEND_API_KEY` is undefined
- WHEN API is called with any valid estado
- THEN response is `{ success: false, skipped: true }`, HTTP 200

---

### Requirement: Graceful Skip — No Email

If the pedido has no `cliente_email`, the API MUST return `{ success: false, skipped: true, reason: 'sin email' }`.

#### Scenario: Pedido without email

- GIVEN a pedido with no `cliente_email`
- WHEN API is called
- THEN response is `{ success: false, skipped: true, reason: 'sin email' }`

---

## Spec 3: checkout-email-trigger (DELTA)

### ADDED Requirements

### Requirement: Fire-and-Forget After saveOrder

In `finalizar-compra.js`, after `saveOrder()` returns a pedido with an `id`, the page MUST call `/api/send-order-email` with `estado='recibido'` as fire-and-forget (`.catch(console.warn)`). The checkout flow MUST NOT block on this call.

#### Scenario: Successful checkout

- GIVEN checkout completes and `saveOrder()` returns `{ id: '...' }`
- WHEN the email call is dispatched
- THEN checkout proceeds immediately without awaiting the email response

#### Scenario: Email call fails

- GIVEN the email fetch rejects
- WHEN `.catch(console.warn)` handles the rejection
- THEN checkout success state is unaffected

#### Scenario: No order ID

- GIVEN `saveOrder()` returns no `id`
- WHEN checkout logic runs
- THEN `/api/send-order-email` is NOT called

---

### Requirement: Fire-and-Forget After MP Confirmation

In `mp-success.js`, after the pedido is loaded, the page MUST call `/api/send-order-email` with `estado='recibido_mp'` exactly once (deduplicated via a ref or flag). Call MUST be fire-and-forget.

#### Scenario: MP success page loads

- GIVEN pedido loads successfully on `mp-success.js`
- WHEN the effect runs
- THEN `/api/send-order-email` is called once with `estado='recibido_mp'`

#### Scenario: Component re-renders

- GIVEN the component re-renders after the email was already sent
- WHEN the effect checks the dedup flag
- THEN `/api/send-order-email` is NOT called a second time
