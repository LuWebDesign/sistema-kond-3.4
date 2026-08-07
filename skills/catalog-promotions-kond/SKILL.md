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

### Transfer-promotion presentation is stored in config JSONB

`transfer_discount` keeps its calculation fields separate from its public presentation:

- `config.transferDiscountType`: `percentage` or `fixed` — controls the discount calculation.
- `config.transferDisplayMode`: `badge` or `compact_text` — controls the public presentation; missing values MUST default to `badge` for backward compatibility.
- `config.transferExplanation`: optional long explanatory text rendered after the transfer-price flow.
- `badge_texto`: the short text used by both the colored badge and the compact-text mode.

Do not add database columns for these presentation settings. `PromoModal` MUST preserve the existing config object when serializing a transfer promotion, otherwise the display mode and explanation are silently lost on refresh.

In `compact_text` mode, the transfer price, short text, and explanation form one inline text flow. The explanation may wrap to the next line from the card/container left edge; it MUST NOT be rendered as a separate flex block below the entire price group. In `badge` mode, preserve the colored badge presentation.

### Avoid partial promo hydration in catalog cards

If product cards depend on products + promos + materials, do not mount the real card UI until all
required inputs for promo enrichment are ready.

Use a loading gate and skeletons so the card does not render price first and badges/details later.

### Home promotion payload must include active normalized promotions

`pages/api/home-data.js` enriches Home products and MUST also return the normalized, date-active `activePromotions` list. `pages/home.js` propagates that list through `HeroGrid`, `PromoCarousel`, and `CategoryCarousel` to `components/home/ProductCard.js`.

Home cards need the active promotion definitions because `applyPromotionsToProduct()` supplies transfer badges but does not calculate the transfer price. Home must reuse `getActivePromotions()` and `applyTransferDiscount()` against the effective displayed price, matching Catalog and Product Detail.

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
6. When changing transfer presentation, verify the Marketing save payload preserves `config.transferDiscountType`, `config.transferDisplayMode`, and `config.transferExplanation`.
7. Verify Home receives `activePromotions` and that Home, Catalog, and Product Detail render the same effective transfer price.

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
- `next-app/components/home/ProductCard.js`
- `next-app/components/marketing/PromoModal.js`
