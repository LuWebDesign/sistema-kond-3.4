# Spec: Product Description Markdown

## Requirement: Install react-markdown

Add `react-markdown` as a dependency to the Next.js app so product descriptions can be rendered as Markdown.

### Scenario: react-markdown is added to package.json

**GIVEN** the `next-app/package.json` dependencies section
**WHEN** dependencies are installed via `npm install`
**THEN** `react-markdown` is listed in `dependencies`
**AND** it is compatible with React 19 (the version declared in `package.json`)

---

## Requirement: Render descriptions as Markdown in ProductDetail.js

Product descriptions must be rendered as Markdown instead of plain text, matching the existing design system.

### Scenario: Description with Markdown content renders formatted output

**GIVEN** a product has `description: "## Material\nMadera MDF de **3mm** de espesor"`
**WHEN** `ProductDetail.js` renders the description section
**THEN** it imports `ReactMarkdown` from `react-markdown`
**AND** the description is rendered as `<ReactMarkdown>{product.description}</ReactMarkdown>`
**AND** headings, bold, and other Markdown elements are rendered as HTML

### Scenario: Markdown styling matches existing design

**GIVEN** the rendered Markdown content inside the description card
**WHEN** the styles are applied
**THEN** text color uses `var(--text-secondary)` (matching existing `<p>` style)
**AND** line-height is `1.7` (matching existing `<p>` style)
**AND** font-size is `0.95rem` (matching existing `<p>` style)
**AND** margin is `0` on the wrapper (matching existing `<p>` style)

### Scenario: Empty description does not render description section

**GIVEN** a product with no `description` (undefined, null, or empty string)
**WHEN** `ProductDetail.js` renders
**THEN** the description section (`pd-description` div) is not rendered at all
**AND** the existing conditional `{product.description && (...)}` continues to guard the section

### Scenario: Plain text description renders without errors

**GIVEN** a product with `description: "Producto simple sin formato"`
**WHEN** the description renders
**THEN** the text displays as-is (no Markdown transformation needed)
**AND** no console errors or warnings appear

---

## Requirement: Add Markdown hint in admin forms

Admin forms that include a description textarea must show a hint about supported Markdown syntax.

### Scenario: Edit form (products.js) shows Markdown hint

**GIVEN** the admin products edit form in `pages/admin/products.js`
**WHEN** the description textarea is rendered (in expanded/editing card mode)
**THEN** a hint element appears directly below the textarea
**AND** the hint text is: "Soporta Markdown: **negrita**, *cursiva*, ## títulos, - listas, [links](url)"
**AND** the hint uses a smaller font size and muted color (visual hint, not a label)

### Scenario: New product form (productos/new.js) shows Markdown hint

**GIVEN** the new product form in `pages/admin/productos/new.js`
**WHEN** the description textarea renders inside the "Descripción" CollapsibleSection
**THEN** a hint element appears directly below the textarea
**AND** the hint text is: "Soporta Markdown: **negrita**, *cursiva*, ## títulos, - listas, [links](url)"
**AND** the hint uses a smaller font size and muted color (visual hint, not a label)

---

## Requirement: Add DB migration for description column

The `productos` table must have a `description` column. The schema already references this field in the frontend, but the column is missing from the canonical `schema.sql` table definition.

### Scenario: Migration file exists

**GIVEN** the `supabase/migrations/` directory
**WHEN** migrations are listed
**THEN** a file named `2026-05-18-add-description-column.sql` exists
**AND** it contains: `ALTER TABLE productos ADD COLUMN IF NOT EXISTS description TEXT;`

### Scenario: Schema file includes description column

**GIVEN** the canonical `supabase/schema.sql` table definition for `productos`
**WHEN** a fresh installation runs the schema
**THEN** the `productos` table includes `description TEXT` as a column

---

## Affected Files

| File | Change |
|------|--------|
| `next-app/package.json` | Add `react-markdown` to dependencies |
| `next-app/components/ProductDetail.js` | Import `ReactMarkdown`, replace plain `<p>` with `<ReactMarkdown>` |
| `next-app/pages/admin/products.js` | Add Markdown hint below description textarea in edit form |
| `next-app/pages/admin/productos/new.js` | Add Markdown hint below description textarea |
| `supabase/migrations/2026-05-18-add-description-column.sql` | New migration: add `description` column |
| `supabase/schema.sql` | Add `description TEXT` to `productos` table definition |

## Out of Scope

- Static HTML frontend (`index.html`, `catalog.js`, etc.) — progressive migration means only Next.js is in scope
- Rich text editor or WYSIWYG — plain textarea with Markdown hint is sufficient
- Markdown sanitization beyond what `react-markdown` provides by default (it strips HTML by default)
- Changes to the `productos` Supabase utility functions (`supabaseProducts.js`) — `description` is already passed through
