---
name: catalog-promotions-kond
description: "Trigger: promoEngine.js, promociones catálogo, marketing badge, free_shipping, percentage_discount, transfer_discount. Rules for promo evaluation, badges, and date parsing in next-app catalog flows."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load this skill when:
- Editing `next-app/utils/promoEngine.js`
- Changing how catalog, product detail, cart, or home apply marketing promotions
- Investigating promo badges, discounted prices, `free_shipping`, or transfer discounts

## Hard Rules

### Date-only promo ranges MUST use local time

If `fecha_inicio` or `fecha_fin` comes as `YYYY-MM-DD`, parse it as a local date, not with
`new Date('YYYY-MM-DD')`.

Reason: native parsing treats date-only strings as UTC and can expire same-day promos early in
the browser. For end dates, keep the range inclusive through local `23:59:59.999`.

### Keep promo behavior aligned across Home / Catalog / Product Detail / Cart

When changing promo logic, verify these flows stay consistent:
- `pages/api/home-data.js`
- `hooks/useCatalog.js`
- `components/ProductDetail.js`
- cart/checkout paths that reuse `applyPromotionsToProduct` or `applyPromotionsToCart`

Do not fix one surface and leave another with different promo evaluation rules.

### Badge-only vs discount promos are different behaviors

- `percentage_discount` and `fixed_price` affect displayed price
- `free_shipping` may show a badge without changing product price
- `transfer_discount` should remain separable from the main promo badge row when the UI expects it
- catalog cards may show transfer price on a dedicated third row, separate from main promo badges

Do not assume `hasPromotion` means the visible product price must change.

### Avoid partial promo hydration in catalog cards

If product cards depend on products + promos + materials, do not mount the real card UI until all
required inputs for promo enrichment are ready.

Use a loading gate and skeletons so the card does not render price first and badges/details later.

## Decision Gates

| Need | Rule |
|------|------|
| Promo ends on a calendar date | Parse `YYYY-MM-DD` in local time |
| Promo has explicit datetime | Preserve native datetime behavior |
| Bug appears only on home or only on catalog | Compare data source AND promo-engine evaluation |
| Badge missing but price unchanged | Check for `free_shipping` / `badge_only` before assuming enrichment failed |
| Catalog flashes content before badges | Gate card render until enrichment inputs finish loading |

## Execution Steps

1. Verify the promo payload shape (`aplica_a`, `badge_texto`, `descuento_monto`, `config`).
2. Check whether the issue is in fetch, normalization, or promo-engine evaluation.
3. Compare the affected flow against `pages/api/home-data.js` as the known-good reference.
4. If touching date logic, test both date-only and datetime promo values.
5. Re-check catalog card, product detail, and cart behavior after the change.

## Output Contract

Return:
- Files changed
- Which promo types were affected
- Whether the fix changes fetching, normalization, or evaluation
- Any remaining flow that still needs manual verification

## References

- `next-app/utils/promoEngine.js`
- `next-app/pages/api/home-data.js`
- `next-app/hooks/useCatalog.js`
- `next-app/components/ProductDetail.js`
