# AGENTS — Sistema KOND

## Response Format (MANDATORY)

ALWAYS start your response with one of these two lines — before any other text:
```
STATUS: PASSED
```
or
```
STATUS: FAILED
```

Keep analysis extremely short after that.

## High-signal facts (what an agent would likely miss)

- **Two targets**: static site at repo root (HTML + js/) and Next.js app in `next-app/`. Always confirm which target before editing.

- **Next.js dev** (`next-app/`):
  - Install: `npm ci` (CI) or `npm install` (local)
  - Env: copy `.env.example` → `.env.local` — required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_USE_SUPABASE`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `NEXT_PUBLIC_TENANT_ID`
  - Optional email vars (server-only): `RESEND_API_KEY` (starts with `re_`), `RESEND_FROM_EMAIL` — if absent, email sending is silently skipped; no error thrown
  - `NEXT_PUBLIC_TENANT_ID` must be set or `next-app/lib/tenant.js` throws at module load (fail-fast). Use seed UUID `00000000-0000-0000-0000-000000000001` for local dev.
  - Run: `npm run dev` (binds 0.0.0.0:3000). Uses `WATCHPACK_POLLING=true` + `CHOKIDAR_USEPOLLING=1` via `cross-env` — required on Windows/WSL; don't remove.
  - Build: `npm run build`. Start: `npm start`. Prod-test: `npm run test:prod` (build + start on :3001).
  - **Node mismatch**: `package.json` says 22.x, CI uses 20 (via `.github/workflows/ci.yml`). If build fails, check Node version.
  - **Pages Router** (not App Router). All pages live in `next-app/pages/`. Admin pages are under `pages/admin/`; old top-level paths redirect there via `next.config.js`.
  - **Playwright** is installed as dev dependency — no test scripts defined yet.

- **Pre-check**: Run `node verify-setup.js` from repo root before infra changes — exits non-zero if critical Supabase files missing.

- **Two Supabase clients** (don't confuse them):
  - `supabase/client.js` — used by static HTML via `window.KOND_SUPABASE_CONFIG` + `js/supabase-init.js`.
  - `next-app/supabase/client.js` — thin re-export from `next-app/utils/supabaseClient.js` (single `createClient()` instance). Always import from here inside `next-app/`.

- **Admin route layout** (`next-app/pages/admin/`):
  - All admin pages live under `/admin/`. Old top-level paths redirect there via `next.config.js` — never create new pages at those old paths.
  - Redirects: `/products` → `/admin/products`, `/dashboard` → `/admin/dashboard`, `/pedidos` → `/admin/pedidos`, `/pedidos-catalogo` → `/admin/orders`, `/marketing` → `/admin/marketing`, `/finanzas` → `/admin/finanzas`, `/materiales` → `/admin/materiales`, `/mi-cuenta` → `/admin/mi-cuenta`, `/database` → `/admin/database`, `/admin/payment-config` → `/admin/website/metodos-pago`, `/admin/catalog-styles` → `/admin/website/estilos`.
  - Other redirects: `/catalogo` → `/catalog`, `/calendario` → `/calendar`, `/catalog-public.html` → `/catalog`, `/mis-pedidos` → `/catalog/mis-pedidos`.
  - Notable admin pages: `dashboard.js`, `orders.js`, `pedidos.js`, `products.js`, `marketing.js`, `finanzas.js`, `materiales.js`, `categorias/` (CRUD categorías), `metricas.js`, `cotizaciones.js`, `metricas-pedidos.js`, `metricas-productos.js`, `seo/index.js` (SEO config), `panel.js`.
  - **Website management** (`/admin/website/`): reorganized under `website/` — `banner/`, `categorias/`, `destacados/`, `estilos/`, `metodos-pago/`, `secciones/`. Parent `website/index.js` is the hub.
  - **Products subdirectory** (`/admin/productos/`): extended product management (separate from root `products.js`).

- **Static HTML entry points**:
  - `index.html` — admin dashboard
  - `home.html` — landing
  - `marketing.html` — promotions
  - `user-public.html` — public user view
  - `EJECUTAR-SISTEMA.bat` — Windows launcher script
  - Script load order: `utils.js` → `supabase-init.js` → `promo-engine.js` → [module] → `main.js`

- **MercadoPago return flow** (`next-app/pages/mi-carrito/`):
  - `mp-success.js`, `mp-failure.js`, `mp-pending.js` — MP redirects land here after payment.
  - These pages must match the `back_urls` configured in `create-preference.js`.

- **Supabase setup**:
  - SQL order: `supabase/schema.sql` → `supabase/storage-buckets.sql`
  - Migrations live in `supabase/migrations/` — apply in date order after initial schema.
  - Buckets: `comprobantes` (private), `productos` (public)
  - NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

- **localStorage keys** (preserve on migrations):
  - Data: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`, `notifications`, `marketing_promotions`, `marketing_coupons`
  - Auth: `kond-user`, `kond-admin`, `currentUser`, `adminSession`, `userSession` — clear ALL on logout
  - `safeLocalStorageSetItem` may omit `comprobante` on QuotaExceededError — don't remove without planning

- **CI**: Node 20, caches `next-app/package-lock.json`. ESLint non-fatal in CI (`npx eslint . --ext .js,.jsx,.ts,.tsx || true`).

- **Security**: Always use `escapeHtml()` before `.innerHTML`. Never commit `.env.local` or keys.

- **SSR guard**: Use `typeof window !== 'undefined'` or React `useEffect` for browser-only APIs in Next.js.

- **MercadoPago Checkout Pro** (`next-app/pages/api/mp/`):
  - `MP_ACCESS_TOKEN` — server-side ONLY. NEVER use `NEXT_PUBLIC_` prefix for this key.
  - API routes: `create-preference.js` (creates MP preference) and `webhook.js` (receives IPN v1 + Webhooks v2).
  - `pedidos_catalogo` MP columns: `mp_preference_id`, `mp_payment_id`, `mp_payment_status` (`'none'|'approved'|'pending'|'in_process'|'rejected'|'cancelled'`).
  - `estado_pago` MP values: `'pendiente_mp'`, `'rechazado_mp'`, `'pagado'`. `metodo_pago: 'mercadopago'` is valid.
  - When querying `pedidos_catalogo`, always include MP columns — missing them causes "Esperando confirmación MP" to show forever.

- **Transactional email via Resend** (`next-app/pages/api/send-order-email.js`):
  - Triggered automatically when order status changes to `'confirmado'` or `'listo'` from `/admin/orders`.
  - If `RESEND_API_KEY` is absent or the send fails, the state change is persisted normally — email is silently skipped. Never blocks admin operations.
  - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are server-only vars; do NOT use `NEXT_PUBLIC_` prefix.

- **Categorías/Subcategorías** (2 niveles):
  - Table `categorias`: self-referencing `parent_id` (NULL = top-level). Has `slug` field with unique index.
  - `productos.categoria_id` FK → `categorias.id` (ON DELETE SET NULL). A product can point to a parent OR a leaf category.
  - `categorias` with `active = true` → public SELECT via RLS. Writes require service role.

- **Productos table notable columns**:
  - `featured` (boolean) — controls visibility in admin website "destacados" section.
  - `description` (text) — supports markdown rendering via `react-markdown`.
  - `promo_badge`, `static_promo_price`, `static_promo_start`, `static_promo_end` — static promo overrides.
  - `tags` (text[]) — array of tags for filtering.
  - `hidden_in_productos` — hides from internal product list but keeps in catalog.

- **Multi-tenant foundation** (`NEXT_PUBLIC_TENANT_ID`):
  - Every Vercel deployment gets its own `NEXT_PUBLIC_TENANT_ID` UUID — this is how tenants are isolated.
  - `next-app/lib/tenant.js` exports `TENANT_ID` — throws at module load if env var missing.
  - ALL Supabase queries (utils + API routes) must include `.eq('tenant_id', TENANT_ID)` — service_role bypasses RLS so this is mandatory.
  - First tenant UUID: `00000000-0000-0000-0000-000000000001` (seed value — replace in Vercel env vars).
  - To add a second tenant: insert row in `tenants` table + new Vercel deployment with new UUID.
  - MP webhook resolves tenant via `pedidos_catalogo.mp_preference_id` join (no env var needed there).

- **Cross-cutting changes** (STOP and coordinate): DB schema, storage keys, auth, or build/config changes affect BOTH frontends. List all artifacts in PR.

- **SEO rewrites** (`next.config.js`): `/robots.txt` → `/api/robots-txt`, `/sitemap.xml` → `/api/sitemap-xml`. Google verification file at `next-app/public/googlef0dbeb1a47fa8146.html`.

- **Edge middleware** (`next-app/middleware.js`): DB-driven redirections fetched from `redirections` table (Supabase). Module-level cache, 5-min TTL per Edge instance. Runs on all non-admin/non-api paths. Requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_TENANT_ID` at Edge runtime. If env vars are missing, middleware is a no-op (safe for local dev without `.env.local`).

- **React Query v5** (`@tanstack/react-query`): installed in `next-app/`. Query keys defined in `next-app/lib/queryKeys.js`. See `react-query-kond` skill for staleTime policies.

- **SDD/openspec completed changes**: `product-description-markdown`, `product-detail-blocks`, `unified-footer`. Archive reports in `openspec/changes/*/archive-report.md`.

- **Skills**: Project-specific skills live in `skills/` at repo root and `.github/skills/`. Registry: `.atl/skill-registry.md`. Key ones:
  - `admin-sidebar-kond` — sidebar admin colapsable: NavIcon/NavLink/SectionDivider, CSS hover-expand, gotcha de clipping en Windows/Chrome
  - `react-query-kond` — staleTime policies, queryKeys from `next-app/lib/queryKeys.js`
  - `supabase-egress-best-practices` — no `select(*)`, server-side filters, pagination
  - `analytics-cards` — card components patterns
  - `mi-carrito-summary` — cart/checkout flow context
  - `theme-centralized` — use centralized theme system; no local `useState('dark')` or localStorage theme keys
  - `collapsible-sections` — use CollapsibleSection for long admin forms
  - `api-route-supabase` — Supabase patterns for Next.js API routes
  - `email-transaccional` — Resend email setup and transactional flow
  - `next-admin-page` — conventions for new admin pages
  - `catalog-feature-toggle` — feature flag patterns in catalog
  - `image-upload-compress` — image upload/compression flow
  - `code-cleanup` — cleanup patterns
  - `skill-manager` — managing project skills
  - `admin-categorias-kond` — patterns and guards for /admin/categorias CRUD and API
  - `admin-api-public-get` — allow public GET for admin read-only endpoints and protect write methods
  - `admin-website-kond` — patterns and guards for /admin/website and all subpages (banner, secciones, categorias, destacados, metodos-pago, estilos)

- **Deep context**: See `.github/copilot-instructions.md` for full technical details (schema, patterns, functions, dual Supabase/localStorage pattern, promo engine rules, calendar constraints, coding conventions).

## Critical conventions agents miss

- **Never use native `alert()` or `confirm()`** — always use `showCustomAlert()` and `showCustomConfirm()` from `js/utils.js`.
- **Always call `guardarProductos()` after mutating `productosBase` or `pedidos`** in vanilla JS code.
- **Promo engine load order**: `promo-engine.js` MUST load before `catalog.js` in static HTML.
- **DB naming**: `snake_case` in Supabase, `camelCase` in frontend. Convert at layer boundaries.
- **Theme**: use `document.body.getAttribute('data-theme')` and `setAppTheme()` from `utils/theme.js` — never local state for theme.

## Commands

- Verify setup: `node verify-setup.js`
- Next.js dev: `cd next-app && npm run dev`
- Next.js build: `cd next-app && npm run build`
- Lint: `cd next-app && npx eslint .`
- Prod-test: `cd next-app && npm run test:prod`
