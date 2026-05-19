# Design: Product Description Markdown Support

## Context

Product descriptions in the KOND system are currently rendered as plain text. Admin users need the ability to format descriptions with headings, lists, bold, italic, and links — common for product specifications, usage instructions, and feature lists. This change adds Markdown support to the product description field across the Next.js app.

## Architecture

### Decision: react-markdown (no rehype/sanitize)

We use `react-markdown` as the sole rendering engine. No `rehype-sanitize` or `rehype-raw` is needed because:

1. **Input is admin-controlled** — only authenticated admin users can edit descriptions via the admin panel. There is no user-facing input vector.
2. **react-markdown is safe by default** — it does NOT render raw HTML. It only processes Markdown syntax. Any HTML tags in the input are escaped and rendered as text.
3. **No external links or images** — the design does not enable `remark-gfm` tables or `rehype-external-links`. If those are needed later, they can be added as separate changes.

This keeps the bundle small and avoids unnecessary dependencies.

### Decision: Inline CSS over CSS modules

The `.pd-markdown` styles are added inline via a `<style>` tag in `ProductDetail.js` (or appended to the existing global CSS pattern used by the component). This matches the existing convention in `ProductDetail.js` where styles are defined as inline objects or component-scoped CSS classes. We do NOT create a new CSS module file.

### Decision: Migration uses `IF NOT EXISTS`

The `description` column does not currently exist in the `productos` table (confirmed in `supabase/schema.sql`). The migration uses `IF NOT EXISTS` to be idempotent and safe for repeated runs.

## Technical Design

### 1. Dependency: Add `react-markdown`

```
cd next-app && npm install react-markdown
```

No peer dependency conflicts expected — `react-markdown` supports React 19.

### 2. Migration: Add `description` column

**File**: `supabase/migrations/2026-05-19-add-description-column.sql`

```sql
ALTER TABLE productos ADD COLUMN IF NOT EXISTS description TEXT;
```

- Column type is `TEXT` (unlimited length — product descriptions can be long).
- No `NOT NULL` constraint — existing products will have `NULL` descriptions, which is fine.
- No default value — `NULL` is the correct default.
- Must be run **before** any frontend changes that read/write this field.

### 3. ProductDetail.js — Markdown rendering

**File**: `next-app/components/ProductDetail.js` (lines 509-524)

**Changes**:

1. Add import at top of file:
   ```js
   import ReactMarkdown from 'react-markdown';
   ```

2. Replace the plain `<p>` description block:
   ```jsx
   // BEFORE
   <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
     {product.description}
   </p>

   // AFTER
   <div className="pd-markdown" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
     <ReactMarkdown>{product.description}</ReactMarkdown>
   </div>
   ```

3. Add CSS for `.pd-markdown` elements. Since `ProductDetail.js` uses inline styles, add a `<style>` block inside the component (or append to the existing global stylesheet if one is used). The CSS:

   ```css
   .pd-markdown h1, .pd-markdown h2, .pd-markdown h3 {
     color: var(--text-primary);
     margin: 1em 0 0.5em 0;
     font-weight: 700;
   }
   .pd-markdown h1 { font-size: 1.3rem; }
   .pd-markdown h2 { font-size: 1.15rem; }
   .pd-markdown h3 { font-size: 1.05rem; }
   .pd-markdown p { margin: 0.5em 0; }
   .pd-markdown ul, .pd-markdown ol { margin: 0.5em 0; padding-left: 1.5em; }
   .pd-markdown li { margin: 0.25em 0; }
   .pd-markdown strong { color: var(--text-primary); font-weight: 600; }
   .pd-markdown a { color: var(--accent-blue); text-decoration: underline; }
   .pd-markdown code { background: var(--bg-section); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
   ```

   **Design rationale**:
   - Headings use `var(--text-primary)` for contrast against the `text-secondary` container.
   - Heading sizes are scoped (1.3rem, 1.15rem, 1.05rem) to not compete with the product title.
   - `h4-h6` are not styled separately — they inherit from the base heading rule. This is intentional; product descriptions rarely need more than 3 heading levels.
   - `code` uses `var(--bg-section)` for a subtle inline code background.

### 4. products.js (edit form) — Markdown hint

**File**: `next-app/pages/admin/products.js` (lines 3976-3998)

Add hint `<span>` immediately after the description `<textarea>` (before the closing `</div>`):

```jsx
<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
  Soporta Markdown: **negrita**, *cursiva*, ## títulos, - listas, [links](url)
</span>
```

This is a non-breaking change — the textarea behavior is identical. The hint is purely informational.

### 5. productos/new.js — Markdown hint

**File**: `next-app/pages/admin/productos/new.js` (lines 1042-1073)

Same hint as `products.js`, added after the `<textarea>` inside the `CollapsibleSection`:

```jsx
<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
  Soporta Markdown: **negrita**, *cursiva*, ## títulos, - listas, [links](url)
</span>
```

### 6. No static HTML changes

The static HTML frontend (`index.html`, `js/`) is NOT affected by this change. The static site uses `productosBase` from localStorage, and the description field is not currently rendered there in a way that requires Markdown support. If this is needed later, it will be a separate change.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `react-markdown` bundle size | ~12KB gzipped. Acceptable for a product detail page. |
| Existing products with HTML in description | `react-markdown` escapes HTML by default — any existing HTML will render as literal text, not break the page. If migration of existing HTML is needed, that's a separate change. |
| Admin users don't know Markdown syntax | The hint text shows common patterns. No full editor/preview is in scope for this change. |
| CSS class collision (`.pd-markdown`) | The `pd-` prefix is already used by ProductDetail component styles (`.pd-card`, `.pd-section-title`, etc.). Low collision risk. |

## Out of Scope

- Markdown editor with live preview (textarea remains plain text).
- `remark-gfm` for tables, strikethrough, task lists.
- Image embedding in descriptions.
- Static HTML frontend support.
- Migration of existing HTML descriptions to Markdown.

## Files Changed

| File | Change |
|------|--------|
| `next-app/package.json` | Add `react-markdown` dependency |
| `next-app/package-lock.json` | Auto-generated |
| `supabase/migrations/2026-05-19-add-description-column.sql` | New migration |
| `next-app/components/ProductDetail.js` | Import + render ReactMarkdown + add CSS |
| `next-app/pages/admin/products.js` | Add Markdown hint |
| `next-app/pages/admin/productos/new.js` | Add Markdown hint |
