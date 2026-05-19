# Proposal: Add Markdown support for product descriptions

## Intent

Product descriptions in `ProductDetail.js` render as a single `<p>` tag with raw text interpolation — no formatting, no structure, poor readability, and hurts SEO. Admin forms use plain `<textarea>` with no hint that Markdown is supported.

## Scope

### In Scope
- Install `react-markdown` as a dependency
- Update `ProductDetail.js` to render descriptions as Markdown
- Add Markdown hint/preview in admin forms (`products.js`, `productos/new.js`)
- Add DB migration for `description TEXT` column (for environments without it)

### Out of Scope
- Rich text editor (WYSIWYG)
- Image embedding in descriptions
- Custom Markdown syntax extensions
- Static HTML site changes (vanilla JS catalog)

## Capabilities

### New Capabilities
- `product-descriptions`: Markdown rendering for product descriptions in ProductDetail and admin forms

### Modified Capabilities
- None

## Approach

1. **Install `react-markdown`** — secure by default (no raw HTML), SSR-compatible, well-maintained
2. **Update `ProductDetail.js`** — replace `<p>{product.description}</p>` with `<ReactMarkdown>{product.description}</ReactMarkdown>`
3. **Add admin hints** — small text below description textarea: "Soporta Markdown" in `products.js` and `productos/new.js`
4. **Add migration** — `supabase/migrations/YYYYMMDDHHMMSS_add_description_column.sql` with `ALTER TABLE productos ADD COLUMN IF NOT EXISTS description TEXT`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/package.json` | Modified | Add `react-markdown` dependency |
| `next-app/components/ProductDetail.js` | Modified | Render description with ReactMarkdown |
| `next-app/pages/admin/products.js` | Modified | Add Markdown hint to description textarea |
| `next-app/pages/admin/productos/new.js` | Modified | Add Markdown hint to description textarea |
| `supabase/migrations/` | New | Migration for `description TEXT` column |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `description` column missing in some environments | Medium | Migration uses `IF NOT EXISTS` — safe to run |
| Markdown rendering performance on long descriptions | Low | `react-markdown` is fast; descriptions are short |
| Admin users don't know Markdown syntax | Medium | Add hint text + link to Markdown guide (future) |
| Existing products with HTML in description | Low | `react-markdown` strips raw HTML by default — safe |

## Rollback Plan

1. Revert the git commit — all changes are additive
2. Uninstall `react-markdown` with `npm uninstall react-markdown`
3. Migration is safe to leave — `IF NOT EXISTS` prevents errors on re-run
4. ProductDetail falls back to a simple `<p>` tag if needed

## Dependencies

- `react-markdown` npm package (no peer dependency conflicts expected)
- `productos.description` column already exists in live DB — migration only for fresh environments

## Success Criteria

- [ ] Product descriptions render as formatted Markdown (headings, lists, bold, italic, links)
- [ ] Raw HTML in descriptions is safely stripped (no XSS)
- [ ] Admin forms show "Soporta Markdown" hint below description textarea
- [ ] Migration runs successfully on fresh Supabase instances
- [ ] No regression for products with empty or plain-text descriptions
- [ ] SSR renders correctly (no hydration mismatch)
