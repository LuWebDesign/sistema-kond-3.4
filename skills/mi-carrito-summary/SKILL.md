---
name: mi-carrito-summary
description: >
  Skill with the session summary and UI guidance for the Mi Carrito / Finalizar compra order-summary improvements.
  Trigger: "mi-carrito", "finalizar-compra", "carrito", "order summary", "summary divider"
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use
- When you need to implement or review the order-summary UI for /mi-carrito and /mi-carrito/finalizar-compra.
- When you need to add thin visual dividers between items or totals.
- When preserving mobile layout: title next to image and price on its own line under title.

## Critical Patterns
- Keep the title next to the image on mobile (image left, title right). Use the cartItemHeader/cartItemHeaderLeft/cartItemTitle/cartItemPriceBlock classes.
- Render a thin divider between summary items only when cart.length > 1: use stylesResp.summaryDivider and do not render after the last item.
- Use .summaryTotals > div CSS to show subtle separators between subtotal/shipping/total; avoid inline hardcoded rules.
- Avoid changing data models or localStorage keys. Presentation-only changes only.
- Guard browser-only APIs with typeof window !== 'undefined' or useEffect.

## Code Examples

JSX: render divider between products
```jsx
{cart.map((item, idx) => {
  const keyId = item.productId || item.id || idx
  return (
    <div key={keyId}>
      <div className={stylesResp.summaryItem}>
        <div style={{ minWidth: 0 }}>
          <div className={stylesResp.summaryItemName} title={item.name}>{item.name}</div>
          <div className={stylesResp.summaryItemUnitPrice}>{formatCurrency(item.price)} × {item.quantity}</div>
        </div>
        <div className={stylesResp.summaryItemPrice}>
          <div className={stylesResp.summaryItemTotalPrice}>{formatCurrency(item.price * item.quantity)}</div>
        </div>
      </div>
      {cart.length > 1 && idx !== cart.length - 1 && <div className={stylesResp.summaryDivider} aria-hidden="true" />}
    </div>
  )
})}
```

CSS (already present in next-app/styles/catalog-responsive.module.css)
```css
.summaryDivider { height: 1px; width: 100%; background: rgba(var(--border-rgb), 0.22); margin: 8px 0; }
.summaryTotals > div { padding: 8px 0; border-bottom: 1px solid rgba(var(--border-rgb), 0.12); }
```

## Commands
- Run local build: cd next-app && npm ci && npm run build
- Lint (non-fatal in CI): npx eslint next-app || true

## Resources
- next-app/pages/mi-carrito/index.js — reference implementation of header + divider rendering
- next-app/pages/mi-carrito/finalizar-compra.js — checkout page where changes should be applied
- next-app/styles/catalog-responsive.module.css — CSS classes used by the components
