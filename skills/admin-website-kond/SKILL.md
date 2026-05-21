---
name: admin-website-kond
description: >
  Patterns and guards for /admin/website and all its subpages (banner, secciones,
  destacados, categorias, metodos-pago, estilos). Covers shared home_config JSONB
  merge safety, auth rules, and per-subpage gotchas.
triggers:
  - next-app/pages/admin/website/**
  - next-app/pages/api/admin/home-config.js
  - next-app/pages/api/admin/catalog-styles.js
  - next-app/pages/api/admin/payment-config.js
  - next-app/utils/supabaseCatalogStyles.js
  - next-app/utils/supabasePaymentConfig.js
version: 1.0.0
---

# Skill: admin-website-kond

## What this section does

`/admin/website` is the storefront management hub. It has six subpages:

| Route | What it manages | Backend |
|---|---|---|
| `/admin/website/banner` | `home_config.bannerMessages[]` | `PUT /api/admin/home-config` |
| `/admin/website/secciones` | `home_config.sections[]` | `PUT /api/admin/home-config` |
| `/admin/website/categorias` | `home_config.categoryOrder[]` + `home_config.hiddenCategories[]` | `PUT /api/admin/home-config` |
| `/admin/website/destacados` | `productos.featured` (boolean) | `PUT /api/admin/productos/[id]` (batch) |
| `/admin/website/metodos-pago` | `payment_config` table | utils/supabasePaymentConfig |
| `/admin/website/estilos` | `catalog_styles` table | utils/supabaseCatalogStyles |

---

## Compact Rules

### CR-1: withAdminAuth on every page

Every page component MUST be exported wrapped in `withAdminAuth`:

```js
export default withAdminAuth(MyPage)
```

Never export the raw component. This applies to the hub `index.js` and all six subpages.

---

### CR-2: home_config is a shared JSONB — always spread

`home_config` stores four independent concerns in one JSON blob:
- `bannerMessages` (banner subpage)
- `categoryOrder` + `hiddenCategories` (categorias subpage)
- `sections` (secciones subpage)

**NEVER overwrite the entire config.** Always fetch first, then spread:

```js
// CORRECT — merge before save
const res = await fetch('/api/admin/home-config')
const { config } = await res.json()
await saveConfig({ ...config, bannerMessages: newMessages })

// WRONG — wipes the other subpages' data
await saveConfig({ bannerMessages: newMessages })
```

The pages already implement this via a local `config` state that holds the full object. If you add a new field, follow the same pattern.

---

### CR-3: API auth rules

| Endpoint | GET | POST/PUT |
|---|---|---|
| `/api/admin/home-config` | Public (no cookie needed) | Protected (`verifyAdminCookie`) |
| `/api/admin/catalog-styles` | Public (no cookie needed) | Protected (`verifyAdminCookie`) |
| `/api/admin/payment-config` | **Protected** (cookie required) | Protected (`verifyAdminCookie`) |
| `/api/admin/productos/[id]` | Protected | Protected |

`home-config` and `catalog-styles` have public GET because the storefront reads them without a session. `payment-config` GET is also protected because it contains sensitive account data (CBU, alias, etc).

Do NOT add `NEXT_PUBLIC_` prefix to payment credentials. Do NOT make `payment-config` GET public.

---

### CR-4: Always include tenant_id in Supabase queries

```js
import { TENANT_ID } from '../../../lib/tenant'

supabase.from('home_config').select('config').eq('tenant_id', TENANT_ID)
supabase.from('payment_config').select('config').eq('tenant_id', TENANT_ID)
supabase.from('catalog_styles').select('*').eq('tenant_id', TENANT_ID)
```

service_role bypasses RLS, so the `.eq('tenant_id', TENANT_ID)` filter is mandatory in every query.

---

### CR-5: Use utils, not direct fetch, for estilos and metodos-pago

| Subpage | DO use | DO NOT use |
|---|---|---|
| estilos | `getCatalogStyles()` / `saveCatalogStyles()` from `utils/supabaseCatalogStyles` | direct `fetch('/api/admin/catalog-styles')` |
| metodos-pago | `getPaymentConfig()` / `savePaymentConfig()` from `utils/supabasePaymentConfig` | direct `fetch('/api/admin/payment-config')` |

The other subpages (banner, secciones, categorias) DO use direct fetch to `/api/admin/home-config` — that is intentional and correct.

---

### CR-6: ConfirmDialog before every save

All saves MUST go through `ConfirmDialog` confirmation. Never call a save function directly on button click:

```js
// CORRECT
const handleSaveWithConfirm = () => {
  setConfirm({
    title: 'Guardar cambios',
    message: '¿Confirmar los cambios?',
    onConfirm: () => { setConfirm(null); handleSave(next) },
  })
}

// WRONG — saves without user confirmation
<button onClick={() => handleSave(next)}>Guardar</button>
```

---

### CR-7: Secciones — legacy type normalization

When loading sections from `home_config.sections`, normalize legacy type values:

```js
const LEGACY_TYPE_MAP = { featured: 'featured', categories: 'categories', promo: 'promos' }
const normalized = saved.map((s) => ({
  ...s,
  type: s.type || LEGACY_TYPE_MAP[s.id] || 'featured',
})).sort((a, b) => a.order - b.order)
```

Old records used `id` as the type key. New records use an explicit `type` field. Always normalize on load.

Valid types: `featured`, `categories`, `promos`, `categoria_carousel`.
`categoria_carousel` requires `config.categoryId` (integer).

---

### CR-8: Destacados — batch edit pattern

Destacados does NOT save on each toggle. It tracks a `pending` Set of changed product IDs, then saves all at once:

1. Toggle → add/remove from `pending` Set, update local state
2. User clicks "Guardar cambios" → bulk PUT to `/api/admin/productos/[id]` for each pending ID
3. On success → clear `pending`
4. On discard → clear `pending` + reload from `/api/home-data`

Never save one product at a time in this page.

Data source: `/api/home-data` (public) → merges `featured` list + `byCategory` map, deduplicates by id. Do NOT use `/api/admin/productos` list here.

---

### CR-9: Estilos — localStorage presets

The estilos page stores user-defined color presets in localStorage under key `catalog_color_presets_v1`.

- Do NOT rename this key without a migration.
- Presets are local to the browser — not stored in Supabase.
- Social URL fields (`footerInstagram`, `footerFacebook`, `footerTikTok`) have inline validation via `socialUrlErrors` state.

---

### CR-10: Metodos de pago — sections start collapsed

All collapsible sections (transferencia, whatsapp, retiro, texto sections) must start collapsed (`true`) after `loadConfig()` resolves. The user must click "Editar" to expand. Do not change this default.

---

### CR-11: Page header pattern

All subpages share this header pattern:

```jsx
<h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🖥️ Website</h1>
<span style={{
  fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px',
  borderRadius: '4px', background: 'var(--accent-blue)', color: '#fff',
}}>SubpageName</span>
```

And a back-link at the bottom:

```jsx
<a href="/admin/website" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
  ← Volver a Website
</a>
```

Keep this pattern consistent when adding or modifying subpages.

---

## File Map

```
next-app/pages/admin/website/
  index.js                  Hub page (6 cards)
  banner/index.js           bannerMessages CRUD
  secciones/index.js        sections CRUD (drag-and-drop)
  categorias/index.js       categoryOrder + hiddenCategories
  destacados/index.js       products.featured batch edit
  metodos-pago/index.js     payment_config (all methods)
  estilos/index.js          catalog_styles (colors, logo, footer, social)

next-app/pages/api/admin/
  home-config.js            GET public / POST+PUT protected
  catalog-styles.js         GET public / POST+PUT protected
  payment-config.js         ALL methods protected

next-app/utils/
  supabaseCatalogStyles.js  getCatalogStyles / saveCatalogStyles / DEFAULT_STYLES
  supabasePaymentConfig.js  getPaymentConfig / savePaymentConfig
```

---

## Smoke check

Run `skills/admin-website-kond/assets/check-website.sh` with the dev server running to verify the critical API auth rules.
