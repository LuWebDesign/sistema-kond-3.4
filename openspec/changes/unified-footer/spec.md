# Spec: unified-footer

## Purpose

Define the behavioral requirements for unifying the home.html and PublicLayout.js footers with social media support (Instagram, Facebook, TikTok), driven by the `catalog_styles` JSONB column and configurable via the admin UI.

---

## 1. Data Layer — Social Media Fields in catalog_styles

### Requirement: Add Social Media Fields to DEFAULT_STYLES

The system MUST add three new optional string fields to both `DEFAULT_STYLES` copies:
- `footerInstagram` — Instagram profile URL (empty string = not configured)
- `footerFacebook` — Facebook page URL (empty string = not configured)
- `footerTiktok` — TikTok profile URL (empty string = not configured)

Both files MUST be updated in lockstep:
- `next-app/utils/supabaseCatalogStyles.js` (client-side DEFAULT_STYLES)
- `next-app/pages/api/admin/catalog-styles.js` (server-side DEFAULT_STYLES)

No SQL migration is required — `catalog_styles.styles` is JSONB and accepts new keys without DDL changes.

#### Scenario: DEFAULT_STYLES includes social media fields

- GIVEN both DEFAULT_STYLES objects are loaded
- WHEN the application starts
- THEN `footerInstagram`, `footerFacebook`, and `footerTiktok` exist as empty strings in both copies

#### Scenario: Saved social media URLs are retrieved

- GIVEN an admin has saved social media URLs to `catalog_styles`
- WHEN `getCatalogStyles()` is called
- THEN the returned object includes the saved `footerInstagram`, `footerFacebook`, and `footerTiktok` values

#### Scenario: Missing social media fields fall back to defaults

- GIVEN a `catalog_styles` row exists without the new social media keys (legacy data)
- WHEN `getCatalogStyles()` is called
- THEN the missing keys resolve to empty strings from DEFAULT_STYLES (no crash, no undefined)

---

## 2. Admin UI — Social Media Inputs

### Requirement: Add Social Media Section to Footer Tab

The admin page `next-app/pages/admin/website/estilos/index.js` MUST add a social media input section within the Footer tab (lines 332-374), below the existing address field. Three URL text inputs MUST be rendered:
- Instagram URL
- Facebook URL
- TikTok URL

Each input MUST:
- Accept a valid URL or be left empty
- Display a preview icon for its respective network next to the input
- Validate on blur: if non-empty, the value MUST be a valid URL (protocol + host)
- Show an inline error message if validation fails
- Persist empty strings when cleared (not null or undefined)

#### Scenario: Admin enters valid social media URLs

- GIVEN the admin is on the Footer tab of Personalizar Catálogo
- WHEN they enter `https://instagram.com/kond.tienda` in the Instagram field
- AND the field passes URL validation
- THEN no error is shown and the value is accepted

#### Scenario: Admin enters invalid URL

- GIVEN the admin types `not-a-url` in the Facebook field
- WHEN the field loses focus (onBlur)
- THEN an inline error message "URL inválida" is shown and the value is NOT saved until corrected

#### Scenario: Admin leaves social media fields empty

- GIVEN all three social media fields are empty
- WHEN the admin clicks "Guardar Cambios"
- THEN empty strings are persisted to `catalog_styles` and no error is shown

#### Scenario: Admin clears a previously saved URL

- GIVEN `footerInstagram` was previously saved with a URL
- WHEN the admin clears the field and saves
- THEN the stored value becomes an empty string and the icon no longer renders in public footers

---

## 3. Admin UI — Footer Preview with Social Icons

### Requirement: Update Live Preview Panel

The live preview panel in `estilos/index.js` (lines 704-714) MUST be updated to show social media icons when URLs are configured. Icons MUST appear in the footer preview section, below the contact info line.

Each icon MUST:
- Only render when its corresponding URL field is non-empty
- Use a compact inline SVG (no external dependencies)
- Be visually consistent with the existing emoji-based contact icons in the preview

#### Scenario: Preview shows social icons when URLs are set

- GIVEN the admin enters URLs for Instagram and TikTok in the form
- WHEN the preview panel re-renders
- THEN Instagram and TikTok icons appear in the footer preview area
- AND no Facebook icon appears (since its field is empty)

#### Scenario: Preview hides social icons when URLs are cleared

- GIVEN all social media fields are empty
- WHEN the preview panel renders
- THEN no social media icons are shown in the footer preview

---

## 4. PublicLayout.js Footer — Social Media Icons

### Requirement: Render Social Media Icons in Public Footer

The footer in `next-app/components/PublicLayout.js` (lines 297-402) MUST render social media icon links in the Contact column (or a new row below it). Icons MUST:
- Use inline SVGs (no external icon libraries)
- Only render when the corresponding URL field is non-empty
- Open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- Have appropriate `aria-label` attributes for accessibility
- Be placed below the existing contact info (phone, email, address)

The three SVG icons MUST be:
- Instagram: camera-outline style
- Facebook: "f" logo or messenger-style
- TikTok: musical-note style

#### Scenario: Footer displays social icons for configured URLs

- GIVEN `catalog_styles` has `footerInstagram` and `footerFacebook` set
- WHEN the PublicLayout footer renders
- THEN Instagram and Facebook SVG icon links appear below the contact info
- AND each icon links to the configured URL with `target="_blank"`

#### Scenario: Footer omits icons for empty URLs

- GIVEN `footerTiktok` is an empty string
- WHEN the PublicLayout footer renders
- THEN no TikTok icon is rendered

#### Scenario: All social media URLs are empty

- GIVEN all three social media fields are empty strings
- WHEN the PublicLayout footer renders
- THEN no social media section or icons appear (no extra whitespace or empty containers)

#### Scenario: Social icons are accessible

- GIVEN social media icons are rendered
- WHEN a screen reader navigates the footer
- THEN each icon has an `aria-label` like "Instagram", "Facebook", "TikTok"

---

## 5. home.html — Dynamic Footer

### Requirement: Fetch catalog_styles and Render Dynamic Footer

The static file `home.html` MUST replace its hardcoded footer (lines 1740-1745) with a dynamically rendered footer that fetches `catalog_styles` from Supabase using the Supabase JS CDN client (`@supabase/supabase-js`).

The implementation MUST:
- Use `window.KOND_SUPABASE_CONFIG` to initialize the Supabase client (same pattern as `js/supabase-init.js`)
- Query `catalog_styles` with `.eq('tenant_id', TENANT_ID).single()`
- Render footer content matching the PublicLayout structure: description, phone, email, address, social media icons
- Cache the fetched styles in `localStorage` under the key `catalogStyles`
- Fall back to the current hardcoded footer content if the fetch fails (network error, auth error, no row found)
- Use inline SVGs for social media icons (same icons as PublicLayout, copied as inline markup)

#### Scenario: Dynamic footer loads successfully

- GIVEN Supabase is reachable and `catalog_styles` has data for the current tenant
- WHEN `home.html` loads
- THEN an inline script fetches styles from Supabase
- AND the footer renders description, phone, email, address, and social icons from the fetched data
- AND the data is cached in `localStorage` under `catalogStyles`

#### Scenario: Dynamic footer falls back on fetch failure

- GIVEN Supabase is unreachable or returns an error
- WHEN `home.html` loads
- THEN the footer renders the hardcoded fallback content (current static footer text)
- AND no JavaScript error is thrown to the console (error is caught and logged with console.warn)

#### Scenario: Cached styles are used on subsequent loads

- GIVEN styles were previously fetched and cached in `localStorage`
- WHEN `home.html` loads
- THEN cached styles are applied immediately
- AND a background refresh attempts to fetch fresh data from Supabase
- AND if the refresh succeeds, the cache is updated

#### Scenario: Social media icons render in home.html footer

- GIVEN `catalog_styles` has `footerInstagram` set to a valid URL
- WHEN the dynamic footer renders in `home.html`
- THEN an Instagram SVG icon link appears in the footer, matching the PublicLayout rendering

#### Scenario: home.html footer matches PublicLayout structure

- GIVEN the same `catalog_styles` data is used by both footers
- WHEN both `home.html` and PublicLayout footers render
- THEN they display the same fields: description, phone, email, address, and social media icons
- AND the visual structure is consistent (3-column grid or equivalent layout)

---

## Constraints

| Constraint | Rule |
|---|---|
| No external icon libraries | MUST use inline SVGs for social media icons |
| URL validation | Non-empty URLs MUST pass basic URL validation (protocol + host) |
| Empty string semantics | Empty string = do not render; NEVER render broken/empty links |
| Tenant isolation | ALL Supabase queries MUST include `.eq('tenant_id', TENANT_ID)` |
| No DB migration | `catalog_styles.styles` is JSONB — new keys require no DDL |
| DEFAULT_STYLES sync | Both copies MUST be updated together; add a comment in each file pointing to the other |
| Graceful degradation | home.html MUST always render a footer, even if Supabase fetch fails |
| Accessibility | Social media links MUST have `aria-label` and `rel="noopener noreferrer"` |
| No `select(*)` | Supabase queries MUST use explicit column projection |
| localStorage cache key | MUST use existing `catalogStyles` key (shared with PublicLayout) |
