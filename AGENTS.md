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

- Two targets: legacy static site at the repo root (HTML + js/) and a migrating Next.js app in `next-app/`. Confirm which target you'll change before editing files.

- Next.js quick dev (work in `next-app/`):
  - cd next-app
  - npm ci   # use `npm ci` in CI/automation; `npm install` is fine for local work
  - cp ../.env.example .env.local
  - Edit `.env.local` and set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_USE_SUPABASE
  - npm run dev    # dev server binds 0.0.0.0:3000 per package.json
  - npm run build
  - npm start
  - Note: `next-app/package.json` lists engines.node = 22.x but CI uses Node 20 (see .github/workflows/ci.yml). Reconcile Node versions if you hit build/runtime issues.

- Pre-check: run `node verify-setup.js` from the repo root. It exits non-zero when key Supabase files or docs (e.g. MIGRACION-SUPABASE.md) are missing.

- Supabase (practical gotchas):
  - Apply `supabase/schema.sql` first, then `supabase/storage-buckets.sql` in the Supabase SQL Editor.
  - storage-buckets.sql creates: `comprobantes` (private) and `productos` (public); review storage policies before changing behavior.
  - Frontend must use the anon key: NEXT_PUBLIC_SUPABASE_ANON_KEY. NEVER commit or expose SUPABASE_SERVICE_ROLE_KEY.
  - Migration script: `node supabase/migrate-data.js` requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and a local `data-export.json`. Run migrations only in secure environments and always take backups.

- Canonical client and static-site integration:
  - Canonical Supabase client: `supabase/client.js` → update this if you change env names or helpers.
  - Static HTML uses `window.KOND_SUPABASE_CONFIG` + `js/supabase-init.js`; check both when changing config loading.

- Legacy localStorage keys (both frontends read these): `productosBase`, `pedidos`, `pedidosCatalogo`, `cart` (also `notifications`). Changing keys or shapes requires a migration or compatibility layer.

- Static-site gotchas:
  - Script order matters: load `js/utils.js` and `js/supabase-init.js` before scripts that depend on them. Verify `index.html` / `catalog.html` when moving/renaming files.
  - Quota fallback: `js/utils.js` implements `safeLocalStorageSetItem` that can omit `comprobante` on QuotaExceededError — do NOT remove this behavior without planning a migration.

- CI & Node:
  - CI (.github/workflows/ci.yml) sets up Node 20 and caches `next-app/package-lock.json` (cache-dependency-path). If builds fail, check Node version mismatch and cache key first.
  - ESLint in CI is intentionally non-fatal (`npx eslint . || true`). Run lint locally when style matters.

- Security & commits: never commit `.env.local` or any service-role/admin keys. Use conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Do NOT add AI attribution to commits. Avoid `--no-verify` unless requested.

- Next/SSR caution: guard browser-only APIs (use `typeof window !== 'undefined'` or React `useEffect`) to avoid hydration/runtime mismatches in Next.js.

- Cross-cutting changes (DB schema, storage keys, auth, build config): STOP. Document affected files in the PR description (include `supabase/*.sql`, `supabase/migrate-data.js`, `js/utils.js`, `supabase/client.js`, and `next-app/` changes) and coordinate both frontends and migration scripts.

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
