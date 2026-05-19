# Proposal: Unify home and catalog footers with social media support

## Intent

Two separate footers exist across the KOND project: a hardcoded minimal footer in `home.html` (static landing page) and a dynamic footer in `PublicLayout.js` (Next.js catalog). Neither supports social media links. The admin panel (`estilos/index.js`) manages catalog footer data but has no social media fields. This change unifies both footers to share the same `catalog_styles` data source and adds Instagram, Facebook, and TikTok URL fields.

## Scope

### In Scope
- Add 3 new optional URL fields to `catalog_styles` JSONB: `footerInstagram`, `footerFacebook`, `footerTiktok`
- Update `DEFAULT_STYLES` in both `supabaseCatalogStyles.js` and `api/admin/catalog-styles.js`
- Add social media inputs to admin UI (`estilos/index.js` footer section, lines 332-374)
- Update footer preview in admin panel (lines 704-714) to show social icons
- Update `PublicLayout.js` footer (lines 297-402) to render social media icon links
- Update `home.html` to fetch `catalog_styles` via Supabase JS CDN client and render dynamic footer (replacing hardcoded content at lines 1740-1745)

### Out of Scope
- Migrating `home.html` to Next.js (separate long-term change)
- Adding new social media platforms beyond Instagram, Facebook, TikTok
- Redesigning footer layout or visual structure (additive only)
- DB schema migration (JSONB column accepts new keys without DDL)

## Capabilities

### New Capabilities
- `footer-social-media`: Social media URL fields in catalog styles, rendered in both public footers and admin UI

### Modified Capabilities
- None

## Approach

1. **Data layer (no migration)**: `catalog_styles` uses a single JSONB column. New keys (`footerInstagram`, `footerFacebook`, `footerTiktok`) are added to both `DEFAULT_STYLES` copies. No SQL migration needed.

2. **Admin UI**: Add 3 URL text inputs below the existing footer fields in `estilos/index.js`. Update the live preview to show social icons when URLs are set.

3. **PublicLayout.js**: Add a social media row in the footer's contact column (or new column). Use simple SVG icons or emoji-based links. Only render icons for non-empty URLs.

4. **home.html**: Add a `<script>` that uses Supabase JS CDN (`@supabase/supabase-js`) to fetch styles from `catalog_styles` table (with `tenant_id` filter). Render footer dynamically using the same field names as PublicLayout. Fall back to current hardcoded footer if fetch fails.

5. **No CORS needed**: `home.html` uses the Supabase client directly (same as `supabase/client.js` pattern), avoiding API route CORS issues.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/utils/supabaseCatalogStyles.js` | Modified | Add 3 social media fields to DEFAULT_STYLES |
| `next-app/pages/api/admin/catalog-styles.js` | Modified | Add 3 social media fields to DEFAULT_STYLES (server-side copy) |
| `next-app/pages/admin/website/estilos/index.js` | Modified | Add social media inputs + update preview |
| `next-app/components/PublicLayout.js` | Modified | Render social media icons in footer |
| `home.html` | Modified | Fetch catalog_styles via Supabase CDN, render dynamic footer |
| `home.html` CSS | Modified | Add social icon styles if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| home.html Supabase CDN fetch fails (network, CORS, auth) | Medium | Graceful fallback to current hardcoded footer; use anon key (public read) |
| Two DEFAULT_STYLES copies diverge | Medium | Add a comment in both files pointing to the other; future dedup is a separate change |
| Footer preview in admin becomes too wide with social icons | Low | Use compact icon-only row, same width as existing preview |
| Exceeds 400-line PR budget | Medium | ~350-450 lines estimated. If >400, split into: (1) data layer + admin UI, (2) PublicLayout + home.html |

## Rollback Plan

1. Revert the git commit — all changes are additive, no deletions of existing fields or behavior.
2. If home.html dynamic footer causes issues, the fallback to hardcoded content is built into the fetch logic.
3. Social media fields in JSONB are optional — empty values render nothing, so partial deploys are safe.

## Dependencies

- Supabase anon key must have SELECT access to `catalog_styles` (already configured for public reads)
- No new environment variables needed
- No new npm packages (Supabase CDN loaded via `<script>` tag in home.html)

## Success Criteria

- [ ] Admin UI shows 3 new social media URL inputs in footer section
- [ ] Saving social media URLs persists to `catalog_styles` JSONB
- [ ] PublicLayout.js footer displays social icons for configured URLs
- [ ] home.html footer renders the same data (colors, text, phone, email, address, social links)
- [ ] home.html falls back gracefully if Supabase fetch fails
- [ ] Admin live preview reflects social media URLs when set
- [ ] No regression in existing footer fields or styling
