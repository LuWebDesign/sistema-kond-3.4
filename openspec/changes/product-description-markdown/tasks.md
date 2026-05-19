# Tasks: Product Description Markdown Support

## Task 1: Install react-markdown dependency

**Goal**: Add `react-markdown` to `next-app/package.json` dependencies.

**Steps**:
1. Run `cd next-app && npm install react-markdown`
2. Verify `react-markdown` appears in `dependencies` in `package.json`
3. Verify `package-lock.json` is updated
4. Confirm no peer dependency warnings (React 19 compatibility)

**Acceptance**:
- `react-markdown` is listed in `next-app/package.json` under `dependencies`
- `npm install` completes without errors or peer dependency conflicts
- `package-lock.json` is regenerated

**Files changed**:
- `next-app/package.json`
- `next-app/package-lock.json`

---

## Task 2: Add DB migration for description column

**Goal**: Create an idempotent migration to add the `description` column to `productos` and update the canonical schema.

**Steps**:
1. Create `supabase/migrations/2026-05-18-add-description-column.sql` with:
   ```sql
   ALTER TABLE productos ADD COLUMN IF NOT EXISTS description TEXT;
   ```
2. Add `description TEXT` to the `productos` table definition in `supabase/schema.sql` (in the correct column order, matching existing conventions)

**Acceptance**:
- Migration file exists at `supabase/migrations/2026-05-18-add-description-column.sql`
- Migration uses `IF NOT EXISTS` for idempotency
- `supabase/schema.sql` includes `description TEXT` in the `productos` table definition
- No `NOT NULL` constraint or default value on the column

**Files changed**:
- `supabase/migrations/2026-05-18-add-description-column.sql` (new)
- `supabase/schema.sql`

---

## Task 3: Render Markdown descriptions in ProductDetail.js

**Goal**: Replace plain text description rendering with `ReactMarkdown` in the product detail component.

**Steps**:
1. Add import at top of `next-app/components/ProductDetail.js`:
   ```js
   import ReactMarkdown from 'react-markdown';
   ```
2. Replace the existing `<p>` description element (lines ~509-524) with:
   ```jsx
   <div className="pd-markdown" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
     <ReactMarkdown>{product.description}</ReactMarkdown>
   </div>
   ```
3. Add CSS for `.pd-markdown` elements. Since the component uses inline styles, add a `<style>` tag within the component or append to the existing global CSS pattern:
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
4. Verify the existing `{product.description && (...)}` conditional guard is preserved (empty descriptions must not render the section)

**Acceptance**:
- `ReactMarkdown` is imported and used to render `product.description`
- Markdown syntax (headings, bold, lists, links, code) renders as formatted HTML
- Plain text descriptions render without errors
- Empty/undefined descriptions do not render the description section
- Text color, font-size, and line-height match existing `<p>` styles
- No new CSS module files are created (inline/global CSS only)

**Files changed**:
- `next-app/components/ProductDetail.js`

---

## Task 4: Add Markdown hints in admin forms

**Goal**: Add a visual hint below description textareas in both admin forms indicating supported Markdown syntax.

**Steps**:
1. In `next-app/pages/admin/products.js` (edit form, lines ~3976-3998):
   - Add a `<span>` directly after the description `<textarea>`:
     ```jsx
     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
       Soporta Markdown: **negrita**, *cursiva*, ## títulos, - listas, [links](url)
     </span>
     ```
2. In `next-app/pages/admin/productos/new.js` (new product form, lines ~1042-1073):
   - Add the same `<span>` hint after the description `<textarea>` inside the `CollapsibleSection`

**Acceptance**:
- Both admin forms show the Markdown hint below the description textarea
- Hint text matches exactly: "Soporta Markdown: **negrita**, *cursiva*, ## títulos, - listas, [links](url)"
- Hint uses smaller font size and muted color
- No changes to textarea behavior (non-breaking)
- Hint renders correctly in both expanded/editing card mode (products.js) and CollapsibleSection (new.js)

**Files changed**:
- `next-app/pages/admin/products.js`
- `next-app/pages/admin/productos/new.js`

---

## Execution Order

1. **Task 2** (DB migration) — must run first so the column exists before any frontend reads/writes
2. **Task 1** (dependency) — can be done in parallel with Task 2, but before Task 3
3. **Task 3** (ProductDetail rendering) — depends on Task 1
4. **Task 4** (admin hints) — independent, can be done in parallel with Task 3

Recommended sequence: Task 2 → Task 1 → Task 3 → Task 4

---

## Review Workload Forecast

| Task | Estimated Lines | Complexity | Review Time |
|------|----------------|------------|-------------|
| Task 1: Install dependency | ~1 (package.json diff) | Trivial | < 1 min |
| Task 2: DB migration | ~5 (new file + schema edit) | Low | < 2 min |
| Task 3: ProductDetail rendering | ~40 (import + JSX replacement + CSS) | Medium | ~5 min |
| Task 4: Admin hints | ~10 (2 files, ~5 lines each) | Low | ~2 min |
| **Total** | **~56 lines** | **Low-Medium** | **~10 min** |

**Risk assessment**: Low. All changes are additive. No breaking changes to existing functionality. The migration is idempotent (`IF NOT EXISTS`). `react-markdown` escapes HTML by default, so existing data is safe.
