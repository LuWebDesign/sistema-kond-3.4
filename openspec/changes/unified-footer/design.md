# Design: Unified Footer with Social Media Support

## Context

Both the static site (`home.html`) and the Next.js catalog (`PublicLayout.js`) render footers independently with duplicated structure and hardcoded content. Admin-configured footer data lives in the `catalog_styles` JSONB column but is only consumed by the Next.js app. This change unifies both footers to a single data source and adds social media link support.

## Architecture Decisions

### No DB migration required
The `catalog_styles` table already uses a JSONB `styles` column. Three new string fields (`footerInstagram`, `footerFacebook`, `footerTikTok`) are added to the default style object -- no schema change, no migration, no RLS update.

### Single data source, two consumers
Both frontends read from the same `catalog_styles` row filtered by `tenant_id`:
- **Next.js**: uses `supabaseCatalogStyles.js` (CDN Supabase client with API route fallback)
- **home.html**: uses `window.KOND_SUPABASE_CONFIG` directly (avoids CORS issues with API routes)

### Inline SVG icons (no dependencies)
Social icons are rendered as inline SVGs -- no icon library, no additional bundle weight, no external network requests.

### home.html uses CDN Supabase client directly
`home.html` already has `window.KOND_SUPABASE_CONFIG` available. It creates a Supabase client in-browser to fetch `catalog_styles`. This avoids CORS issues. Results are cached in `localStorage` with a 5-minute TTL.

## File Changes

### 1. `next-app/utils/supabaseCatalogStyles.js`

**Change**: Add 3 new fields to `DEFAULT_STYLES` (line 31, after `footerAddress`):

```js
footerInstagram: '',
footerFacebook: '',
footerTikTok: '',
```

No other changes needed -- the existing merge logic (`{ ...DEFAULT_STYLES, ...data.styles }`) automatically picks up new fields.

### 2. `next-app/pages/api/admin/catalog-styles.js`

**Change**: Add the same 3 fields to the server-side `DEFAULT_STYLES` (line 25, after `footerAddress`):

```js
footerInstagram: '',
footerFacebook: '',
footerTikTok: '',
```

This keeps the two `DEFAULT_STYLES` copies in sync. Both are needed because the API route runs server-side and the utils module runs client-side.

### 3. `next-app/pages/admin/website/estilos/index.js`

**Change A -- Admin form inputs** (lines 369-372, inside the Footer section after the address field):

Add a new subsection for social media links with 3 URL inputs:

```jsx
<div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
  <label style={{ ...labelStyle, marginBottom: '12px' }}>Redes sociales</label>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
    <div>
      <label style={{ ...labelStyle, fontSize: '0.8rem' }}>Instagram URL</label>
      <input type="url" value={styles.footerInstagram || ''} onChange={(e) => updateStyle('footerInstagram', e.target.value)} placeholder="https://instagram.com/tu-tienda" style={inputStyle} />
    </div>
    <div>
      <label style={{ ...labelStyle, fontSize: '0.8rem' }}>Facebook URL</label>
      <input type="url" value={styles.footerFacebook || ''} onChange={(e) => updateStyle('footerFacebook', e.target.value)} placeholder="https://facebook.com/tu-tienda" style={inputStyle} />
    </div>
    <div>
      <label style={{ ...labelStyle, fontSize: '0.8rem' }}>TikTok URL</label>
      <input type="url" value={styles.footerTikTok || ''} onChange={(e) => updateStyle('footerTikTok', e.target.value)} placeholder="https://tiktok.com/@tu-tienda" style={inputStyle} />
    </div>
  </div>
</div>
```

**Change B -- Preview update** (lines 704-714, inside the Footer preview section):

Add social icon row below the contact info in the live preview. Only render icons for URLs that have values. Use small inline SVGs (16x16).

### 4. `next-app/components/PublicLayout.js`

**Change**: Add social media icons row to the footer (lines 392-393, between the 3-column grid and the copyright bar).

Add a new row with inline SVG icons for Instagram, Facebook, and TikTok. Each icon:
- Wrapped in an `<a>` tag with `href`, `target="_blank"`, `rel="noopener noreferrer"`
- Only rendered if the corresponding style field is non-empty
- 24x24 SVG with hover color transition
- Displayed in a flex row with `gap: 16px`, centered

SVG definitions (inline, no library):

**Instagram** (camera outline):
```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
  <circle cx="12" cy="12" r="5"/>
  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
</svg>
```

**Facebook** ("f" lettermark):
```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
</svg>
```

**TikTok** (music note):
```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.8a4.84 4.84 0 0 1-1-.11z"/>
</svg>
```

The social row is placed after the 3-column grid `</div>` and before the copyright `</div>`:

```jsx
{/* Social media icons */}
{(catalogStyles.footerInstagram || catalogStyles.footerFacebook || catalogStyles.footerTikTok) && (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '20px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
  }}>
    {catalogStyles.footerInstagram && (
      <a href={catalogStyles.footerInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
        {/* Instagram SVG */}
      </a>
    )}
    {catalogStyles.footerFacebook && (
      <a href={catalogStyles.footerFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
        {/* Facebook SVG */}
      </a>
    )}
    {catalogStyles.footerTikTok && (
      <a href={catalogStyles.footerTikTok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
        {/* TikTok SVG */}
      </a>
    )}
  </div>
)}
```

### 5. `home.html`

**Change A -- Footer structure replacement** (lines 1739-1745):

Replace the static footer with a structured 3-column grid matching `PublicLayout.js`, plus a social icons row. The footer gets an `id="dynamic-footer"` for the script to target:

```html
<footer class="footer" id="dynamic-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h3 id="footer-brand"></h3>
        <p id="footer-description"></p>
      </div>
      <div>
        <h4>Enlaces utiles</h4>
        <div>
          <a href="catalog.html">Catalogo de productos</a>
          <a href="#contacto">Contacto</a>
        </div>
      </div>
      <div>
        <h4>Contacto</h4>
        <div id="footer-contact"></div>
      </div>
    </div>
    <div id="footer-social" class="footer-social"></div>
    <div class="footer-copyright">
      <p>&copy; 2025 KOND - Sistema de Gestion de Produccion</p>
    </div>
  </div>
</footer>
```

Add CSS for the new footer grid structure (in the `<style>` block, replacing the existing `.footer` rules):

```css
.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
  margin-bottom: 24px;
}
.footer-grid h3, .footer-grid h4 {
  color: #f8fafc;
  margin-bottom: 16px;
  font-size: 1rem;
  font-weight: 600;
}
.footer-grid p {
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.6;
}
.footer-grid a {
  display: block;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 4px 0;
  transition: color 0.2s;
}
.footer-grid a:hover { color: #3b82f6; }
.footer-social {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}
.footer-social a {
  color: #94a3b8;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
.footer-social a:hover { color: #3b82f6; }
.footer-copyright {
  padding-top: 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  text-align: center;
}
.footer-copyright p {
  color: #64748b;
  font-size: 0.8rem;
}
```

**Change B -- Dynamic footer script** (before `</body>`, after the existing scripts):

Add a `<script>` that:
1. Uses `window.KOND_SUPABASE_CONFIG` to create a Supabase client
2. Fetches `catalog_styles` for the current tenant
3. Updates footer DOM elements with fetched data
4. Caches result in `localStorage` with 5-minute TTL
5. Falls back to static content on error

```html
<script>
(function() {
  var CACHE_KEY = 'kond-footer-styles';
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  function getSocialIconSVG(platform) {
    var icons = {
      instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>',
      facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
      tiktok: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.8a4.84 4.84 0 0 1-1-.11z"/></svg>'
    };
    return icons[platform] || '';
  }

  function renderFooter(styles) {
    var brand = document.getElementById('footer-brand');
    var desc = document.getElementById('footer-description');
    var contact = document.getElementById('footer-contact');
    var social = document.getElementById('footer-social');

    if (brand) brand.textContent = styles.logoText || 'KOND';
    if (desc) desc.textContent = styles.footerDescription || 'Tu tienda de confianza para productos de calidad. Compras facil y seguro desde la comodidad de tu hogar.';

    if (contact) {
      var html = '';
      if (styles.footerPhone) html += '<div>' + styles.footerPhone + '</div>';
      if (styles.footerEmail) html += '<div>' + styles.footerEmail + '</div>';
      if (styles.footerAddress) html += '<div>' + styles.footerAddress + '</div>';
      contact.innerHTML = html;
    }

    if (social) {
      var socialHtml = '';
      var platforms = [
        { key: 'footerInstagram', name: 'instagram', label: 'Instagram' },
        { key: 'footerFacebook', name: 'facebook', label: 'Facebook' },
        { key: 'footerTikTok', name: 'tiktok', label: 'TikTok' }
      ];
      platforms.forEach(function(p) {
        if (styles[p.key]) {
          socialHtml += '<a href="' + styles[p.key] + '" target="_blank" rel="noopener noreferrer" aria-label="' + p.label + '">' + getSocialIconSVG(p.name) + '</a>';
        }
      });
      social.innerHTML = socialHtml;
    }

    // Apply footer colors if set
    var footerEl = document.getElementById('dynamic-footer');
    if (footerEl) {
      if (styles.footerBg) footerEl.style.background = styles.footerBg;
      if (styles.footerTextColor) footerEl.style.color = styles.footerTextColor;
    }
  }

  function loadFooterStyles() {
    // Try cache first
    try {
      var cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) {
          renderFooter(parsed.data);
          return;
        }
      }
    } catch (e) {}

    // Fetch from Supabase
    if (!window.KOND_SUPABASE_CONFIG || !window.supabase) return;

    var client = window.supabase.createClient(
      window.KOND_SUPABASE_CONFIG.url,
      window.KOND_SUPABASE_CONFIG.anonKey
    );

    client.from('catalog_styles')
      .select('styles')
      .eq('tenant_id', window.KOND_SUPABASE_CONFIG.tenantId || '00000000-0000-0000-0000-000000000001')
      .single()
      .then(function(result) {
        if (result.error) throw result.error;
        var styles = result.data ? result.data.styles : {};
        renderFooter(styles);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: styles, ts: Date.now() }));
        } catch (e) {}
      })
      .catch(function(err) {
        console.warn('Could not load footer styles from Supabase:', err);
        // Static fallback is already in the HTML
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooterStyles);
  } else {
    loadFooterStyles();
  }
})();
</script>
```

## Data Flow

```
Admin (estilos/index.js)
  --> saveCatalogStyles() --> Supabase catalog_styles.styles (JSONB)
                                      |
                    +-----------------+-----------------+
                    |                                   |
              Next.js app                         home.html
  getCatalogStyles()                    Supabase CDN client
  (API route fallback)                  (direct, no CORS)
                    |                                   |
              PublicLayout.js                     dynamic footer
              (footer + social)                   (footer + social)
```

## Testing Strategy

1. **Admin UI**: Set social URLs in `/admin/website/estilos`, verify preview shows icons
2. **Next.js catalog**: Visit `/catalog`, verify footer shows social icons with correct links
3. **Static site**: Open `home.html`, verify footer renders with Supabase data (check network tab for Supabase query)
4. **Fallback**: Disable network, reload `home.html`, verify cached footer renders
5. **Empty state**: Clear all social URLs in admin, verify no social row renders in either frontend
6. **Security**: Verify `target="_blank"` links include `rel="noopener noreferrer"`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Two `DEFAULT_STYLES` copies drift | Keep them identical; add a comment in both files pointing to each other |
| home.html Supabase client not available | Script checks `window.KOND_SUPABASE_CONFIG` and `window.supabase` before use; static HTML is the fallback |
| localStorage quota exceeded on cache | Cache is small (JSONB styles ~1KB); wrapped in try/catch |
| Social URLs with malicious content | URLs are set in admin (authenticated); rendered as `href` values, not innerHTML; `rel="noopener noreferrer"` prevents tabnabbing |
