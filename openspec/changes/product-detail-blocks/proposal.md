# Proposal: Restructure product detail into visual blocks with promo support

## Intent

The product detail page (`next-app/pages/catalog/categoria/[slug]/[product].js`) has three problems: (1) title, price, measures, and description are crammed into a single card with no visual separation, (2) it uses wrong field names (`found.precio` should be `found.precioUnitario`, `found.descripcion` should be `found.description`), and (3) it ignores the promo-enriched data that `useProducts()` already provides (`hasPromotion`, `precioPromocional`, `promotionBadges`). The catalog page already renders promos correctly — this page should match.

## Scope

### In Scope
- Fix field name bugs: `precio` → `precioUnitario`, `descripcion` → `description`
- Separate product detail into distinct visual blocks: image, title+category, price (with promo logic), promotion badges, description, measures
- Add promo rendering: strikethrough original price, promotional price, and badge pills — matching the pattern from `catalog.js` (lines 925-953)
- Import `formatCurrency` from `catalogUtils`

### Out of Scope
- Changes to `promoEngine`, `useCatalog` hook, or promo data pipeline
- Layout changes to other catalog pages
- Adding stock indicators or add-to-cart controls (future work)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `product-detail`: Visual restructuring into separate blocks, correct field names, and promotion display on the product detail page

## Approach

1. **Fix field names**: Replace `found.precio` with `found.precioUnitario` and `found.descripcion` with `found.description`
2. **Import utilities**: Add `formatCurrency` from `catalogUtils`
3. **Block layout**: Replace the current 2-column grid with a structured layout:
   - **Image block**: Full-width image card (left column, unchanged)
   - **Info column** (right): Split into separate cards/sections:
     - Title + category breadcrumb
     - Price block: conditional promo rendering (strikethrough + promo price) + badge pills
     - Description block
     - Measures block
4. **Promo logic**: Mirror the exact conditional pattern from `catalog.js` — check `found.hasPromotion && found.precioPromocional !== undefined && found.precioPromocional !== found.precioUnitario`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/pages/catalog/categoria/[slug]/[product].js` | Modified | Fix field names, add promo logic, separate into visual blocks |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `found.precioUnitario` is undefined for legacy products | Low | Fallback to `0` with `|| 0` (same pattern as catalog.js) |
| Promo data not populated for some products | Low | Conditional rendering — shows regular price when no promo |
| Visual regression in block spacing | Low | Use existing CSS variables (`--bg-card`, `--text-primary`, etc.) |

## Rollback Plan

1. Revert the git commit — single file change, no schema or cross-cutting impact
2. The original 2-column grid layout is simple enough to restore from git history in seconds

## Dependencies

- `useProducts()` hook already returns promo-enriched products — no changes needed
- `formatCurrency` available from `catalogUtils`
- `applyPromotionsToProduct` already runs inside `useProducts()`

## Success Criteria

- [ ] Product detail page displays `precioUnitario` (not `precio`)
- [ ] Product detail page displays `description` (not `descripcion`)
- [ ] Products with active promotions show strikethrough original price + promo price
- [ ] Promotion badges render as colored pills next to the price
- [ ] Products without promotions show only the regular price (no regression)
- [ ] Description, measures, title, and image are in visually separate blocks
- [ ] Page renders correctly for products without images or descriptions
