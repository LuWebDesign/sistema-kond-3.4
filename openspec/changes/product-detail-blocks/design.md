# Design: Restructure product detail into visual blocks with promo support

## Technical Approach

Replace the monolithic right-column card in `next-app/pages/catalog/categoria/[slug]/[product].js` with five visually separated blocks (title+category, price+promo, badges, description, measures). Import `formatCurrency` from `catalogUtils`. Mirror the exact promo conditional pattern from `catalog.js:925-953` and `ProductDetail.js:84-87`. Single-file change, no new dependencies.

## Architecture Decisions

### Decision: Import `formatCurrency` from `catalogUtils`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Import from `catalogUtils` | Consistent with rest of app, single source of truth | **Chosen** |
| Inline helper | Zero import, but duplicates logic already exported | Rejected |

**Rationale**: `formatCurrency` is already exported from `next-app/utils/catalogUtils.js` and used across catalog pages (`user.js`, `mis-pedidos.js`). Reusing it keeps formatting consistent (ARS, no decimals, `es-AR` locale).

### Decision: Inline styles only

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline styles (current pattern) | Matches existing file, no CSS changes | **Chosen** |
| CSS modules / styled-components | Cleaner separation, but introduces new dependency | Rejected |

**Rationale**: The file currently uses inline styles exclusively. Introducing a new styling system for one page is overkill. CSS variables (`--bg-card`, `--text-primary`, etc.) are already available globally.

### Decision: Block separation via `gap` + individual card backgrounds

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Each block gets its own `background: var(--bg-card)` + `borderRadius` + `padding` | Clear visual separation, consistent with image card | **Chosen** |
| Single card with `<hr>` separators | Less markup, but weaker visual hierarchy | Rejected |
| CSS `border-bottom` between sections | Requires wrapper, less flexible | Rejected |

**Rationale**: The image block already uses `background: var(--bg-card), padding: 16, borderRadius: 12`. Matching that pattern for each info block creates a consistent two-column card grid.

## Data Flow

```
useProducts() ──→ products[] (enriched by promoEngine)
                      │
                      ├─ found.nombre        → Title block
                      ├─ found.categoria     → Category badge
                      ├─ found.precioUnitario → Price block (regular)
                      ├─ found.precioPromocional → Price block (promo)
                      ├─ found.hasPromotion  → Conditional promo render
                      ├─ found.promotionBadges → Badges block
                      ├─ found.description   → Description block
                      ├─ found.medidas       → Measures block
                      └─ found.imagen        → Image block (unchanged)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `next-app/pages/catalog/categoria/[slug]/[product].js` | Modify | Add `formatCurrency` import, replace right-column JSX with 5-block structure, fix field names (`precio` → `precioUnitario`, `descripcion` → `description`) |

## Interfaces / Contracts

### New JSX structure (right column)

```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
  {/* Block 1: Title + Category */}
  <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
    <h1 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>
      {found.nombre}
    </h1>
    <span style={{
      display: 'inline-block',
      background: 'var(--accent-blue)',
      color: '#fff',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: '0.8rem',
      fontWeight: 600
    }}>
      {found.categoria}
    </span>
  </div>

  {/* Block 2: Price (with promo conditional) */}
  <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Precio
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {found.hasPromotion && found.precioPromocional !== undefined && found.precioPromocional !== found.precioUnitario ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
            {formatCurrency(found.precioUnitario || 0)}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
            {formatCurrency(found.precioPromocional)}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {formatCurrency(found.precioUnitario || 0)}
        </div>
      )}
    </div>
  </div>

  {/* Block 3: Promotion Badges */}
  {found.promotionBadges && found.promotionBadges.length > 0 && (
    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {found.promotionBadges.map((badge, idx) => (
          <span
            key={idx}
            style={{
              backgroundColor: badge.color || '#ef4444',
              color: badge.textColor || '#ffffff',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {badge.text}
          </span>
        ))}
      </div>
    </div>
  )}

  {/* Block 4: Description */}
  <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Descripción
    </div>
    <p style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
      {found.description || 'Sin descripción disponible.'}
    </p>
  </div>

  {/* Block 5: Measures */}
  <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Medidas
    </div>
    <p style={{ color: 'var(--text-primary)', margin: 0 }}>
      {found.medidas || '—'}
    </p>
  </div>
</div>
```

### Import change

```diff
+ import { formatCurrency } from '../../../../utils/catalogUtils'
```

### Field fixes

| Old (bug) | New (correct) |
|-----------|---------------|
| `found.precio` | `found.precioUnitario` |
| `found.descripcion` | `found.description` |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Product with promo shows strikethrough + promo price | Open a product known to have active promotion |
| Manual | Product without promo shows only regular price | Open a product with no active promotion |
| Manual | Badges render with correct colors | Verify badge `color` and `textColor` from `promotionBadges` |
| Manual | Field names correct — no empty price/description | Confirm `precioUnitario` and `description` render |
| Manual | Responsive — two-column grid on desktop | Verify grid doesn't break on narrow screens |

## Migration / Rollout

No migration needed. Single-file change, no schema impact, no cross-cutting dependencies. Rollback: revert git commit.

## Open Questions

- None
