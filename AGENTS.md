# AGENTS — Sistema KOND (compact notes for OpenCode agents)

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

- Two targets: static site at the repo root (HTML + js/) and a migrating Next.js app in `next-app/`. Always confirm which target you'll change before editing files.

- Next.js (quick dev):
  - workdir: `next-app`
  - Install: `npm ci` (CI). `npm install` is acceptable for local dev.
  - Create env: `cp ../.env.example .env.local` and set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_USE_SUPABASE
  - Run: `npm run dev` (binds 0.0.0.0:3000 per package.json). Build: `npm run build`. Start: `npm start`.
  - NOTE: `next-app/package.json` lists engines.node = 22.x but CI uses Node 20 (.github/workflows/ci.yml). If you hit build/runtime errors check Node version and the CI cache (cache-dependency-path: next-app/package-lock.json).

- Pre-check (always run before making infra changes): `node verify-setup.js` from repo root — it fails (non-zero) when key Supabase files or docs are missing.

- Supabase (must-read):
  - Apply SQL in this order in Supabase SQL Editor: `supabase/schema.sql` then `supabase/storage-buckets.sql`.
  - Buckets created: `comprobantes` (private) and `productos` (public). Review `supabase/storage-buckets.sql` policies before edits.
  - Frontends must use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY). NEVER commit or expose SUPABASE_SERVICE_ROLE_KEY (server-only).
  - `supabase/migrate-data.js` requires SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL and a local `data-export.json`. Run migrations only in secure environments and take backups.
  - Canonical client: `supabase/client.js`. Static HTML expects `window.KOND_SUPABASE_CONFIG` + `js/supabase-init.js` — update both when changing env names or loading behavior.
  - RLS and storage policies are defined in `supabase/schema.sql` and `supabase/storage-buckets.sql` — changing them affects both frontends.

- LocalStorage & migration gotchas:
  - Keys to preserve/consider: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`, `notifications`. Changing shapes or names requires a migration/compat layer.
  - `js/utils.js` implements `safeLocalStorageSetItem` which may omit `comprobante` on QuotaExceededError — do NOT remove this fallback without planning data handling.

- Static-site entry points:
  - `index.html` — admin dashboard
  - `home.html` — main landing
  - `marketing.html` — promotions management
  - `catalog.html` — public catalog (in `backup-archivos-originales/`)
  - Script order: load `js/utils.js` and `js/supabase-init.js` before dependent scripts.

- CI & tooling:
  - CI sets up Node 20 and caches `next-app/package-lock.json` (see `.github/workflows/ci.yml`). Use `npm ci` in CI; local `npm install` is fine.
  - ESLint in CI is non-fatal (`npx eslint . || true`). Run lint locally if style matters.

- Security & commits:
  - Never commit `.env.local` or any service-role/admin keys. Follow conventional commits (`feat:`, `fix:`, `chore:`). Do NOT add AI attribution to commits.

- Next/SSR caution:
  - Guard browser-only APIs (use `typeof window !== 'undefined'` or React `useEffect`) to avoid hydration/runtime mismatches in Next.js.

- Cross-cutting changes (STOP):
  - For DB schema, storage keys, auth, or build/config changes: STOP and coordinate. In the PR description list affected artifacts: `supabase/*.sql`, `supabase/migrate-data.js`, `js/utils.js`, `supabase/client.js`, and any `next-app/` changes. Both frontends must be considered.

- Skills registry:
  - Available skills for this project: `catalog-user-design` - Defines user profile page design and adaptation for admin area [SKILL.md](next-app/skills/catalog-user-design/SKILL.md)

## Files to open first

- verify-setup.js
- MIGRACION-SUPABASE.md
- README.md
- supabase/README.md
- supabase/schema.sql
- supabase/storage-buckets.sql
- supabase/migrate-data.js
- supabase/client.js
- js/supabase-init.js
- js/utils.js
- next-app/package.json
- next-app/migrations/
- .github/workflows/ci.yml
- .github/copilot-instructions.md

Keep this file short; add only items an agent would likely miss.
