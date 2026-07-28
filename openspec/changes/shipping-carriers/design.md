# Design: Shipping Carriers

## Technical Approach

Add a provider-neutral shipping layer in the Next.js app only. Checkout calls neutral `/api/shipping/*` routes, which delegate to a server-only carrier service. The first adapter is Correo Argentino MiCorreo/PAQ.AR; future carriers must plug into the same contracts without public or internal Andreani-specific names. Quotes happen before payment. MiCorreo shipment import happens only after MercadoPago approval in the webhook. Label payment, generation, printing, attachment, and dispatch remain manual admin follow-up operations.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Carrier abstraction | `lib/shipping` facade + provider adapters | Correo-specific routes first | Prevents provider names leaking into checkout/schema and keeps Andreani future work additive. |
| Charge source | Persist one selected shipping snapshot and derive order/MP totals from it | Recalculate independently in MP route | Avoids double-charging or mismatched checkout/order/payment totals. |
| Product package data | Store package weight kg and dimensions cm separately from `medidas` | Parse `medidas` or use defaults | `medidas` is customer-facing free text; no defaults are allowed for missing package data. |
| Import timing | Trigger import from MP webhook after `approved` | Import during checkout | MiCorreo shipment data must only be generated after approved payment. |

## Data Flow

```text
Admin product form -> productos.package_* columns
Checkout -> /api/shipping/rates -> shipping service -> Correo /rates
Checkout -> saveOrder -> pedidos_catalogo shipping snapshot
Checkout -> /api/mp/create-preference -> MP preference with one shipping line if paid
MP approved webhook -> resolve pedido by mp_preference_id -> shipping import -> Correo /shipping/import -> persist import/follow-up state
Admin order detail -> display shipping snapshot, import state, manual label workflow state
```

## File Changes

| File | Action | Description |
|---|---|---|
| `next-app/lib/shipping/index.js` | Create | Provider-neutral facade, provider selection, normalized errors. |
| `next-app/lib/shipping/providers/correoArgentino.js` | Create | MiCorreo auth, token cache, rates, agencies, import. |
| `next-app/pages/api/shipping/rates.js` | Create | Quote endpoint. |
| `next-app/pages/api/shipping/agencies.js` | Create | Branch lookup endpoint. |
| `next-app/pages/api/shipping/import-order.js` | Create | Server-side helper endpoint only if webhook import is not kept inline. |
| `next-app/pages/mi-carrito/finalizar-compra.js` | Modify | Structured shipping destination, delivery type, agency selection, quote/fallback/free display, selected snapshot in order payload. |
| `next-app/hooks/useCatalog.js`, `next-app/utils/supabasePedidos.js` | Modify | Forward and persist shipping metadata; keep tenant-scoped queries. |
| `next-app/pages/api/mp/create-preference.js` | Modify | Add one positive shipping line from selected snapshot and persist returned preference id. |
| `next-app/pages/api/mp/webhook.js` | Modify | On approved payment, import shipment once and persist result using resolved tenant. |
| `next-app/pages/admin/productos/new.js`, `next-app/pages/admin/products.js`, `next-app/utils/supabaseProductos.js` | Modify | Add required `Datos de envío` package fields and mappings. |
| `next-app/components/OrderCatalogDetailView.js`, `next-app/utils/pedidosCatalogoDetail.js` | Modify | Display shipping metadata/follow-up state and fix `metodoPago === 'envio'` to delivery-method logic. |
| `next-app/supabase-migrations/*.sql`, `supabase/schema.sql`, `.env.example` | Modify | Add schema/env definitions. |

## Interfaces / Contracts

### Data model

`productos`: `package_weight_kg numeric`, `package_length_cm numeric`, `package_width_cm numeric`, `package_height_cm numeric` as required in create/edit UI. Do not default missing values.

`pedidos_catalogo`: `shipping_provider text`, `shipping_delivery_type text`, `shipping_service_code text`, `shipping_service_name text`, `shipping_cost numeric`, `shipping_currency text`, `shipping_quote_snapshot jsonb`, `shipping_destination_snapshot jsonb`, `shipping_agency_snapshot jsonb`, `shipping_status text`, `shipping_import_status text`, `shipping_import_result jsonb`, `shipping_imported_at timestamptz`, `shipping_manual_followup_required boolean`, `shipping_tracking_number text` for admin-only future/manual use.

### API routes

`POST /api/shipping/rates`: `{ postalCodeDestination, provinceCode?, deliveryType?: 'home'|'agency', package: { weightKg, lengthCm, widthCm, heightCm } }` returns `{ available, rates[] }`. Correo boundary converts kg to grams and validates 1g-25000g and sides <=150cm.

`GET /api/shipping/agencies?provinceCode=&services=` returns normalized agencies. Server injects configured customer id; clients never send secrets.

Carrier adapter shape: `getRates(input)`, `getAgencies(input)`, `importShipment(order)`. Token cache is module-level `{ token, expiresAt }`; refresh before expiry and retry once after 401. Cache is best-effort for serverless cold starts.

## Error Handling and Rollback

Quote failures return `available:false`; checkout displays `A cotizar` and continues. Free shipping displays `Envío gratis`; if a quote exists, show struck-through quoted price. Import failures must not roll back the paid order; persist checkout data, `shipping_import_status='failed'`, and `shipping_manual_followup_required=true`. Disable shipping env/routes to fall back to current `A cotizar`; schema is additive.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | package validation, kg-to-grams, rate normalization, token retry | Mock Correo client. |
| Integration | `/api/shipping/*`, MP preference amount, webhook import idempotency | Mock carrier/MP/Supabase responses. |
| Build/QA | product required fields, checkout fallback/free/paid totals, admin detail display | `node verify-setup.js`, `npm run build`, manual checkout QA. |

## Open Questions

None blocking from provided facts. Implementation must confirm the full Correo province-code mapping from the PDF text before coding.
