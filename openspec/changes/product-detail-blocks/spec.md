# Spec: Product Detail Blocks

## Requirement: Fix field name bugs

The product detail page currently reads `found.precio` and `found.descripcion`, which are undefined because `useProducts()` returns `precioUnitario` and `description`.

### Scenario: Price field uses correct property name

**GIVEN** a product is loaded from `useProducts()` with `precioUnitario: 1500`
**WHEN** the product detail page renders the price
**THEN** it reads `found.precioUnitario` (not `found.precio`)
**AND** the displayed price is `$ 1.500` (formatted via `formatCurrency`)

### Scenario: Description field uses correct property name

**GIVEN** a product is loaded from `useProducts()` with `description: "Producto de ejemplo"`
**WHEN** the product detail page renders the description
**THEN** it reads `found.description` (not `found.descripcion`)
**AND** the displayed text is "Producto de ejemplo"

### Scenario: Fallback when precioUnitario is undefined

**GIVEN** a legacy product has no `precioUnitario` field
**WHEN** the page renders the price
**THEN** it falls back to `0` via `found.precioUnitario || 0`
**AND** no crash or undefined display occurs

---

## Requirement: Separate content into visual blocks

The current page renders title, price, measures, and description in a single card. Each must be in its own visually distinct block.

### Scenario: Image block renders independently

**GIVEN** a product with an `imagen` URL
**WHEN** the page renders
**THEN** the image appears in its own card block (left column)
**AND** the card has `background: var(--bg-card)`, `padding: 16`, `borderRadius: 12`

### Scenario: Image block shows placeholder when no image

**GIVEN** a product without an `imagen`
**WHEN** the page renders
**THEN** the image block shows "Sin imagen" placeholder text
**AND** the placeholder area has height 300px with centered alignment

### Scenario: Title and category render in their own block

**GIVEN** a product with `nombre: "Taza personalizada"` and `categoria: "Tazas"`
**WHEN** the page renders
**THEN** `found.nombre` appears as an `<h1>` in its own block
**AND** `found.categoria` appears as a badge/tag element (visually distinct from body text)
**AND** the block has its own card container with `background: var(--bg-card)`

### Scenario: Description renders in its own block

**GIVEN** a product with `description: "Taza de cerámica blanca"`
**WHEN** the page renders
**THEN** the description appears in its own block/section
**AND** the block is visually separated from the price and measures blocks

### Scenario: Description fallback when empty

**GIVEN** a product with no `description` (undefined or empty string)
**WHEN** the page renders the description block
**THEN** it shows "Sin descripción disponible."

### Scenario: Measures render in their own block

**GIVEN** a product with `medidas: "11cm diámetro"`
**WHEN** the page renders
**THEN** the measures appear in their own block/section
**AND** the block is visually separated from adjacent blocks

---

## Requirement: Promo rendering mirrors catalog.js pattern

The price block must conditionally render promotional pricing, matching the pattern from `catalog.js` lines 925-953.

### Scenario: Promotional price displays with strikethrough original

**GIVEN** a product with `hasPromotion: true`, `precioPromocional: 1200`, and `precioUnitario: 1500`
**WHEN** the price block renders
**THEN** the original price (`formatCurrency(1500)`) displays with `textDecoration: 'line-through'`, smaller font (`0.85rem`), and muted color (`var(--text-secondary)`)
**AND** the promotional price (`formatCurrency(1200)`) displays larger (`1.2rem`), bold (`fontWeight: 800`), in accent color (`var(--accent-blue)`)
**AND** both prices are stacked vertically with `flexDirection: 'column'` and `gap: 4`

### Scenario: Regular price displays when no promotion

**GIVEN** a product with `hasPromotion: false` or `precioPromocional === precioUnitario`
**WHEN** the price block renders
**THEN** only `formatCurrency(found.precioUnitario || 0)` displays
**AND** it renders at `fontSize: 1.1rem`, `fontWeight: 700`
**AND** no strikethrough or secondary price is shown

### Scenario: Promotion badges render as colored pills

**GIVEN** a product with `promotionBadges: [{ text: "-20%", color: "#ef4444", textColor: "#ffffff" }]`
**WHEN** the price block renders
**THEN** each badge renders as an inline `<span>` with:
  - `backgroundColor` from `badge.color` (default `#ef4444`)
  - `color` from `badge.textColor` (default `#ffffff`)
  - `padding: '3px 6px'`, `borderRadius: '0'`, `fontSize: '0.7rem'`, `fontWeight: 600`
**AND** badges appear in a flex row with `gap: 4px` next to the price

### Scenario: No badges render when array is empty

**GIVEN** a product with `promotionBadges: []` or `undefined`
**WHEN** the page renders
**THEN** no badge elements appear in the DOM

### Scenario: Promo condition matches catalog.js exactly

**GIVEN** the promo rendering logic
**WHEN** evaluating whether to show promotional pricing
**THEN** the condition is: `found.hasPromotion && found.precioPromocional !== undefined && found.precioPromocional !== found.precioUnitario`
**AND** this matches the exact pattern from `catalog.js` line 925

---

## Requirement: Import formatCurrency

### Scenario: formatCurrency is imported from catalogUtils

**GIVEN** the page needs to format prices
**WHEN** the file is reviewed
**THEN** `formatCurrency` is imported from `../../../../utils/catalogUtils`
**AND** all price values are rendered via `formatCurrency(value)` instead of template string interpolation

---

## Affected Files

| File | Change |
|------|--------|
| `next-app/pages/catalog/categoria/[slug]/[product].js` | Fix field names, import `formatCurrency`, separate into 6 visual blocks, add promo logic |

## Out of Scope

- Changes to `promoEngine.js`, `useCatalog` hook, or promo data pipeline
- Layout changes to other catalog pages
- Adding stock indicators or add-to-cart controls
- Changes to `ProductDetail.js` component (separate concern)
