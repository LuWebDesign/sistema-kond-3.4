# Proposal: Shipping Carriers

## Intent

Add provider-neutral shipping to Next.js checkout. First provider: Correo Argentino MiCorreo/PAQ.AR. Future provider: Andreani. Customers choose home delivery or branch pickup, receive a quote when available, and get the shipment imported/generated after purchase.

## Scope

### In Scope
- Provider-neutral API, adapter, schema, UI vocabulary.
- Correo quotes from origin CP `1842` for `domicilio` and `sucursal`.
- Branch lookup plus selected branch snapshot.
- Persist quote, destination, import result, and admin metadata.
- Add paid shipping once across checkout, order persistence, and MercadoPago.
- Keep fallback `A cotizar`; show `Envío gratis` with struck-through quote when promo applies.

### Out of Scope
- Customer-facing tracking.
- Andreani implementation now.
- Static app changes.
- Carrier registry.

## Capabilities

### New Capabilities
- `shipping-carriers`: Provider-neutral quote, agency lookup, import, persistence, admin visibility.
- `checkout-shipping-selection`: Destination data, delivery choice, fallback text, and free-shipping presentation.

### Modified Capabilities
- None. Existing specs only cover admin auth/rate-limit behavior.

## Approach

Create `next-app/lib/shipping/*` carrier interface plus Correo adapter, exposed by `next-app/pages/api/shipping/*` routes. Keep credentials server-only; cache `/token`; capture package weight in kilograms in admin UI, convert to grams for Correo API calls, validate 1g–25000g and max 150cm dimensions; persist normalized snapshots. Add nullable Supabase columns and align `supabase/schema.sql`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/pages/mi-carrito/finalizar-compra.js` | Modified | Selection, quote UI, order payload. |
| `next-app/hooks/useCatalog.js`, `next-app/utils/supabasePedidos.js` | Modified | Persist metadata. |
| `next-app/pages/api/shipping/*`, `next-app/lib/shipping/*` | New | Facade and adapter. |
| `next-app/pages/api/mp/create-preference.js` | Modified | Shipping line. |
| `next-app/pages/admin/productos/new.js`, `next-app/pages/admin/products.js` | Modified | Product package weight/dimension fields for shipping quotes. |
| `next-app/components/OrderCatalogDetailView.js`, `next-app/utils/pedidosCatalogoDetail.js` | Modified | Admin display; address risk. |
| `next-app/supabase-migrations/*`, `supabase/schema.sql`, `.env.example` | Modified | Schema/env docs. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate totals | High | Use one selected shipping snapshot. |
| Missing package data | High | Add separate product shipping fields; capture weight in kg for admins and convert to grams for carriers. |
| Quote/import unavailable | Med | Keep `A cotizar`; flag admin follow-up. |
| Province/customerId gaps | Med | Validate province/CP/config. |
| `openspec/config.yaml` missing | Low | Continue with shared defaults. |

## Rollback Plan

Disable shipping feature/env, stop `/api/shipping/*` calls, and fall back to `A cotizar`. Schema is additive/nullable; drop columns only if metadata can be discarded.

## Dependencies

- MiCorreo credentials, `customerId`, QA/prod URL.
- Package weight/dimensions or defaults.
- Province-code mapping, including `B` and `C`.

## Success Criteria

- [ ] Customer can choose `domicilio` or `sucursal` and select a quote.
- [ ] Quote failure keeps checkout available: `A cotizar`.
- [ ] Free shipping shows `Envío gratis` and strikes through the quote.
- [ ] Paid shipping is included once in order total and MercadoPago.
- [ ] MiCorreo shipment import runs after purchase and stores its result.
- [ ] Product create/edit forms capture package weight in kg plus package dimensions for shipping.
- [ ] No Andreani names enter provider-neutral architecture.
