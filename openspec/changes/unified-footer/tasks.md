# Tasks: unified-footer

> **Phased delivery**: Phase 1 covers Next.js files only (data layer, admin UI, PublicLayout footer). Phase 2 covers home.html dynamic footer. Each phase is independently verifiable.

---

## Phase 1: Data Layer + Admin UI + PublicLayout Footer (Next.js)

### Task 1: Add social media fields to both DEFAULT_STYLES copies
- Files: `next-app/utils/supabaseCatalogStyles.js` (line 31, after `footerAddress`), `next-app/pages/api/admin/catalog-styles.js` (line 25, after `footerAddress`)
- Description: Add three new string fields to both `DEFAULT_STYLES` objects: `footerInstagram: ''`, `footerFacebook: ''`, `footerTikTok: ''`. Add a cross-reference comment in each file pointing to the other (e.g. `// KEEP IN SYNC with pages/api/admin/catalog-styles.js DEFAULT_STYLES`). No SQL migration needed — `catalog_styles.styles` is JSONB.
- Verification: Start the Next.js dev server, call `getCatalogStyles()`, confirm the returned object includes all three new fields as empty strings. Confirm both files have identical field definitions.

### Task 2: Add social media inputs to admin Footer section
- Files: `next-app/pages/admin/website/estilos/index.js` (lines 369-372, after the address field, before closing `</div>` of the Footer section)
- Description: Add a new subsection below the address input with a top border separator. Render three URL inputs in a 3-column grid: Instagram URL, Facebook URL, TikTok URL. Each input uses `type="url"`, binds to `updateStyle()`, and has a placeholder hint. Add `onBlur` validation: if non-empty, check for valid URL pattern (`^(https?:\/\/)[^\s]+$`), show inline error "URL inválida" if invalid. Persist empty strings when cleared (not null/undefined).
- Verification: Open `/admin/website/estilos`, navigate to Footer tab, confirm three new URL inputs appear below the address field. Enter `not-a-url` in Instagram field, blur, confirm inline error appears. Enter valid URL `https://instagram.com/test`, confirm no error. Clear field, save, confirm empty string is persisted.

### Task 3: Update live preview panel with social media icons
- Files: `next-app/pages/admin/website/estilos/index.js` (lines 704-714, inside the Footer preview section)
- Description: Add a social icon row below the existing contact info in the preview panel. Render small inline SVG icons (16x16) for Instagram, Facebook, and TikTok — only when the corresponding URL field is non-empty. Use simple inline SVGs matching the design spec. Icons should appear in a flex row with `gap: 8px`.
- Verification: Enter URLs for Instagram and TikTok in the form inputs, confirm their icons appear in the preview panel. Leave Facebook empty, confirm no Facebook icon appears. Clear all URLs, confirm social row disappears from preview.

### Task 4: Add social media icons to PublicLayout.js footer
- Files: `next-app/components/PublicLayout.js` (lines 392-393, between the 3-column grid `</div>` and the copyright `</div>`)
- Description: Add a conditional social media icons row that renders only when at least one social URL is non-empty. Each icon is wrapped in an `<a>` tag with `href`, `target="_blank"`, `rel="noopener noreferrer"`, and `aria-label`. Use 24x24 inline SVGs (Instagram camera outline, Facebook "f" logo, TikTok music note). Style with flex row, `gap: 16px`, centered, with `borderTop` separator and hover color transition to `--accent-blue`.
- Verification: Visit `/catalog` with social URLs configured in admin, confirm icons appear below the contact info. Click each icon, confirm it opens the correct URL in a new tab. Clear all social URLs in admin, reload, confirm no social row renders (no extra whitespace). Inspect links, confirm `rel="noopener noreferrer"` is present.

---

## Phase 2: home.html Dynamic Footer (Static HTML)

### Task 5: Replace static footer HTML and add CSS grid styles
- Files: `home.html` (lines 1739-1745 for HTML replacement, lines 1142-1152 for CSS replacement)
- Description: Replace the hardcoded footer (lines 1739-1745) with a structured 3-column grid footer with `id="dynamic-footer"`. The footer includes: brand/description column, useful links column, contact column (`id="footer-contact"`), social icons row (`id="footer-social"`), and copyright bar. Replace the existing `.footer` CSS rules (lines 1142-1152) with new grid-based styles: `.footer-grid`, `.footer-social`, `.footer-copyright` matching the design spec.
- Verification: Open `home.html` in a browser, confirm the new 3-column footer renders with placeholder content. Verify responsive grid behavior. Confirm social icons row exists but is empty (no URLs configured yet).

### Task 6: Add dynamic footer script with Supabase fetch and caching
- Files: `home.html` (before `</body>`, after existing scripts at line 2224)
- Description: Add an IIFE `<script>` that: (1) checks `window.KOND_SUPABASE_CONFIG` and `window.supabase` availability, (2) tries `localStorage` cache first with 5-minute TTL (key: `kond-footer-styles`), (3) if cache miss/expired, creates a Supabase client and queries `catalog_styles` with `.select('styles').eq('tenant_id', TENANT_ID).single()`, (4) calls `renderFooter(styles)` to populate DOM elements by ID, (5) renders social media icons as inline SVG links with `target="_blank"`, `rel="noopener noreferrer"`, `aria-label`, (6) caches result in localStorage, (7) catches errors and logs `console.warn` — static HTML fallback content remains visible.
- Verification: Open `home.html` with Supabase configured, check Network tab for `catalog_styles` query. Confirm footer displays data from Supabase. Disable network, reload, confirm cached footer renders. Clear localStorage, reload with network off, confirm static fallback renders. Configure social URLs in admin, reload `home.html`, confirm social icons appear matching PublicLayout.

---

## Review Workload Forecast

| Phase | Task | Files Changed | Est. Lines Added | Est. Lines Removed | Net Lines |
|-------|------|---------------|-------------------|---------------------|-----------|
| 1 | Task 1 | 2 | 12 | 0 | +12 |
| 1 | Task 2 | 1 | 35 | 0 | +35 |
| 1 | Task 3 | 1 | 20 | 0 | +20 |
| 1 | Task 4 | 1 | 45 | 0 | +45 |
| **Phase 1 total** | | **3 files** | **112** | **0** | **+112** |
| 2 | Task 5 | 1 | 55 | 7 | +48 |
| 2 | Task 6 | 1 | 110 | 0 | +110 |
| **Phase 2 total** | | **1 file** | **165** | **7** | **+158** |
| **Grand total** | | **4 files** | **277** | **7** | **~270 net** |

**Peak review slice**: Task 6 (home.html script) at ~110 lines — well within single-reviewer capacity.
**Total changed lines**: ~277 additions, ~7 deletions across 4 files. Under the 400-line threshold.
