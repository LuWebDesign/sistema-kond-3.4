# Tasks: Product Detail Blocks

## Task 1: Fix field name bugs

**File**: `next-app/pages/catalog/categoria/[slug]/[product].js`

**What**: Replace incorrect field names that produce undefined values.

**Changes**:
1. Add `import { formatCurrency } from '../../../../utils/catalogUtils'` at the top of the file (after existing imports)
2. Line 50: change `found.precio` → `found.precioUnitario || 0`
3. Line 50: change `$ ${found.precio}` → `{formatCurrency(found.precioUnitario || 0)}`
4. Line 53: change `found.descripcion` → `found.description`

**Verification**:
- Price displays as formatted currency (e.g. `$ 1.500`) instead of `$ undefined`
- Description text renders instead of empty string
- No console errors

**Estimated lines changed**: ~10 (4 lines of diffs + 1 import)

---

## Task 2: Separate content into visual blocks

**File**: `next-app/pages/catalog/categoria/[slug]/[product].js`

**What**: Replace the single monolithic right-column card (lines 46-55) with 5 visually separated blocks, each with its own `background: var(--bg-card)`, `padding: 16`, `borderRadius: 12`.

**Changes**: Replace the right-column `<div>` with this structure wrapped in `<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>`:

1. **Block 1 — Title + Category**: `<h1>` for `found.nombre` + category badge `<span>` for `found.categoria`
2. **Block 2 — Price**: Label "PRECIO" + price value (uses `formatCurrency`, already fixed in Task 1)
3. **Block 3 — Description**: Label "DESCRIPCIÓN" + `found.description || 'Sin descripción disponible.'`
4. **Block 4 — Measures**: Label "MEDIDAS" + `found.medidas || '—'`

**Styles** (per block):
- Container: `background: var(--bg-card)`, `padding: 16`, `borderRadius: 12`
- Section labels: `fontSize: '0.75rem'`, `fontWeight: 600`, `color: 'var(--text-secondary)`, `marginBottom: 8`, `textTransform: 'uppercase'`, `letterSpacing: '0.05em'`
- Title: `marginTop: 0`, `color: 'var(--text-primary)`, `fontSize: '1.5rem'`
- Category badge: `display: 'inline-block'`, `background: 'var(--accent-blue)'`, `color: '#fff'`, `padding: '2px 8px'`, `borderRadius: 4`, `fontSize: '0.8rem'`, `fontWeight: 600`
- Price: `fontSize: '1.1rem'`, `fontWeight: 700`

**Verification**:
- Each block has its own card background
- Blocks are separated by `gap: 16`
- Page still renders in two-column grid (image left, info blocks right)
- No regression in image block (left column unchanged)

**Estimated lines changed**: ~60 (replacing ~10 lines with ~60 lines of block JSX)

---

## Task 3: Add promo rendering (mirror catalog.js pattern)

**File**: `next-app/pages/catalog/categoria/[slug]/[product].js`

**What**: Add conditional promo pricing to the Price block, matching the exact pattern from `catalog.js:925-953`.

**Changes**: Inside the Price block (Block 2 from Task 2), replace the simple price display with:

1. **Promo conditional**: `found.hasPromotion && found.precioPromocional !== undefined && found.precioPromocional !== found.precioUnitario`
   - **True**: Show strikethrough original price (`fontSize: '0.85rem'`, `color: 'var(--text-secondary)'`, `textDecoration: 'line-through'`) + promo price (`fontSize: '1.2rem'`, `fontWeight: 800`, `color: 'var(--accent-blue)'`) stacked vertically with `flexDirection: 'column'`, `gap: 4`
   - **False**: Show regular price only (`fontSize: '1.1rem'`, `fontWeight: 700`)

2. **Badges block**: After the Price block, add a conditional badges block:
   - Guard: `found.promotionBadges && found.promotionBadges.length > 0`
   - Each badge: `<span>` with `backgroundColor: badge.color || '#ef4444'`, `color: badge.textColor || '#ffffff'`, `padding: '3px 8px'`, `borderRadius: 4`, `fontSize: '0.75rem'`, `fontWeight: 600`
   - Badges container: `display: 'flex'`, `gap: 4`, `flexWrap: 'wrap'`, inside its own card block

**Verification**:
- Product with active promotion: strikethrough original + larger promo price in accent color
- Product without promotion: single regular price, no strikethrough
- Badges render as colored pills when `promotionBadges` array has items
- No badges render when array is empty or undefined
- Condition matches catalog.js line 925 exactly

**Estimated lines changed**: ~30 (adding promo conditional + badges block)

---

## Review Workload Forecast

| Task | Estimated Lines | Risk Level | Review Focus |
|------|----------------|------------|--------------|
| 1. Fix field names | ~10 | Low | Correct import path, correct property names, `formatCurrency` usage |
| 2. Visual blocks | ~60 | Medium | Block structure matches design.md JSX, CSS variables used, no style regressions |
| 3. Promo rendering | ~30 | Medium | Promo condition matches catalog.js:925 exactly, badge colors/rendering, no badges when empty |
| **Total** | **~100** | **Low-Medium** | Single file, no new dependencies, no schema changes |

**Review time estimate**: 10-15 minutes (single file, ~100 lines of diffs)
**Rollback**: Revert single git commit — no migration, no cross-cutting impact
**Testing**: Manual only — open a product with promo, one without, verify field names render correctly
