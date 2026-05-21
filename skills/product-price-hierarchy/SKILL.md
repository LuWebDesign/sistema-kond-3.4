---
name: product-price-hierarchy
description: "Trigger: product detail price, transfer discount, price hierarchy, precio transferencia, jerarquía de precios. 3-row price block in ProductDetail: original → effective + promo badges → transfer price + transfer badge."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Editing the price block in `next-app/components/ProductDetail.js`
- Adding or changing how promo/transfer badges render in product detail
- Debugging why a badge appears twice or the transfer price is wrong

## Price Block — 3 Rows

| Row | Content | Visible when |
|-----|---------|--------------|
| 1 | `precioUnitario` struck-through | any discount is active (`hasAnyDiscount`) |
| 2 | `displayPrice` (big) + promo badges (excl. transfer) | always |
| 3 | `transferPrice` (smaller, `1.1rem`) + transfer badge | `transfer_discount` promo is active |

## Critical Patterns

### 1. Data sources

```js
// [...segments].js — pass promociones from the hook
const { products, categories, isLoading, promociones } = useProducts()
return <ProductDetail ... promociones={promociones} />

// ProductDetail.js — imports
import { applyTransferDiscount, getActivePromotions } from '../utils/promoEngine'
```

### 2. Transfer price computation

```js
// applyTransferDiscount returns the DISCOUNT AMOUNT, not the final price
const activeTransferPromo = getActivePromotions(
  (promociones || []).filter(p => (p.tipo || p.type) === 'transfer_discount')
)[0] || null

const transferDiscountAmount = activeTransferPromo
  ? applyTransferDiscount(promociones || [], displayPrice)
  : 0

// transferPrice = null when no transfer promo is active
const transferPrice = transferDiscountAmount > 0 ? displayPrice - transferDiscountAmount : null
const hasAnyDiscount = hasPromo || transferPrice !== null
```

### 3. Badge filtering — split transfer badge from promo badges

The transfer badge lives inside `product.promotionBadges` alongside other promo badges.
It MUST be separated: shown in Row 3, not Row 2.

```js
const transferBadgeText = activeTransferPromo?.badgeTexto || null

// Row 2: all badges except the transfer one
const promoBadges = (product.promotionBadges || []).filter(
  b => !transferBadgeText || b.text !== transferBadgeText
)

// Row 3: the transfer badge (reuse from promotionBadges — opacity/color already resolved)
const transferBadge = transferBadgeText
  ? (product.promotionBadges || []).find(b => b.text === transferBadgeText) || null
  : null
```

## NEVER Rules

- NEVER hardcode the transfer badge text — always read it from `activeTransferPromo.badgeTexto`
- NEVER use `applyTransferDiscount` result as the final price — it returns the discount amount
- NEVER render the transfer badge in Row 2 and Row 3 simultaneously — filter it out of Row 2
- NEVER recreate badge styling inline for Row 3 — reuse the badge object from `promotionBadges` so opacity/color from `/admin/marketing` is respected

## Files

| File | Role |
|------|------|
| `next-app/components/ProductDetail.js` | Price block implementation |
| `next-app/pages/catalog/[category]/[...segments].js` | Passes `promociones` to ProductDetail |
| `next-app/hooks/useCatalog.js` | `useProducts()` — returns `promociones` (camelCase mapped) |
| `next-app/utils/promoEngine.js` | `applyTransferDiscount`, `getActivePromotions`, `applyPromotionsToProduct` |
| `next-app/pages/admin/marketing.js` | UI to manage `transfer_discount` promos (badge text, color, opacity) |
