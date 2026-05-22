---
name: product-detail-kond
description: "Trigger: ProductDetail.js, product detail page, página de producto, mobile layout, grid areas. Patterns and guards for next-app/components/ProductDetail.js."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load this skill when:
- Editing `next-app/components/ProductDetail.js`
- Adding new sections or data blocks to the product detail page
- Fixing layout or responsiveness issues in the product detail view

## Hard Rules

### CSS Grid — NEVER omit an area from the mobile template

The layout uses named CSS grid areas via `<style jsx>`. **Both** desktop and mobile
`grid-template-areas` must include every defined area.

Missing an area in the mobile template silently moves that section to the implicit grid
(bottom of the page). This is the #1 bug pattern on this component.

Current area order:

| Position | Desktop (left col) | Desktop (right col) | Mobile |
|----------|--------------------|---------------------|--------|
| 1 | `breadcrumb` (full width) | — | `breadcrumb` |
| 2 | `images` | `info-name` | `info-name` (categoría + título) |
| 3 | `images` | `info-price` | `images` |
| 4 | `images` | `actions` | `info-price` |
| 5 | `specs` (full width) | — | `actions` |
| 6 | `description` (full width) | — | `specs` |
| 7 | `categories` (full width) | — | `description` |
| 8 | — | — | `categories` |

**When adding a new grid area:**
1. Add the CSS class: `.pd-{name} { grid-area: {name}; min-width: 0; }`
2. Add `"{name}"` to BOTH desktop and mobile `grid-template-areas`
3. Mobile order: `info-price` must always precede `actions`

### Styles live inside `<style jsx>` — do NOT create a CSS module

All scoped styles are in the `<style jsx>` block near the bottom of the component.
Mobile overrides live in `@media (max-width: 640px)` inside that same block.

### Price display — keep the 3-row hierarchy

Price renders in 3 rows in order:
1. Original price (strikethrough, shown only when promo is active)
2. Promo / final price (large, highlighted)
3. Static promo badge with dates (shown only when applicable)

Do NOT flatten this into a single element. The hierarchy communicates value.

### isMobile detection is JS-driven — do not fight it

The category section uses `useWindowSize()` + `isMobile` state (set in `useEffect`).
On SSR the category section renders as desktop — this is intentional.
Do not replace inline `isMobile` checks with CSS-only media queries for that section.

## Decision Gates

| Need | Rule |
|------|------|
| Add new data section | Add grid area to BOTH templates; respect mobile order |
| Adjust price display | Edit rows inside `pd-info-price` — never collapse them |
| Mobile padding / font tweaks | Add to `@media (max-width: 640px)` inside `<style jsx>` |
| Category section layout | Edit inline styles that check `isMobile`, not the CSS grid |
| New badge or label | Add inside the relevant area block; use existing `pd-badge` styles |

## Files

| File | Role |
|------|------|
| `next-app/components/ProductDetail.js` | Main component — grid layout + all `<style jsx>` |
| `next-app/pages/catalog/categoria/[slug]/[product].js` | Primary route that mounts ProductDetail |
| `next-app/pages/catalog/[category]/[...segments].js` | Alternate route that mounts ProductDetail |
