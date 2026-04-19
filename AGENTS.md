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

- Two targets: legacy static site at the repo root (HTML + js/) and a migrating Next.js app in `next-app/`. Confirm which target you must change before editing files.

- Next.js quick dev (work in `next-app/`):
  cd next-app
  npm ci
  cp ../.env.example .env.local
  set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_USE_SUPABASE
  npm run dev    # binds 0.0.0.0:3000
  npm run build
  npm start

- Pre-check: run `node verify-setup.js` from the repo root. It exits non-zero when required Supabase files or docs are missing.

- Supabase notes:
  - Apply `supabase/schema.sql` then `supabase/storage-buckets.sql` in the Supabase SQL Editor.
  - Use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) in frontend code. NEVER commit service-role/admin keys or put them in client code.
  - Data migration: `node supabase/migrate-data.js` requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env and expects a local `data-export.json`. Treat the service key as secret.

- Canonical client: `supabase/client.js`. If you change data access or storage keys, update this file and re-check `js/supabase-init.js` and `js/utils.js` (legacy site).

- Legacy localStorage keys: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`. Changing keys or shapes requires a migration or compatibility layer (both frontends read the same keys).

- Static-site gotchas:
  - Script order matters: load utilities (`utils.js`) before files that use them. Verify `index.html` / `catalog.html` when renaming/moving scripts.
  - The code contains quota-handling fallbacks (omit comprobante) — don't remove without a migration.

- CI & Node:
  - CI (`.github/workflows/ci.yml`) builds `next-app/` on Node 20. `next-app/package.json` declares `engines.node = 22.x` — a mismatch that can break builds.
  - CI caches `next-app/package-lock.json`; check cache key if builds misbehave.
  - ESLint in CI is non-fatal (`npx eslint . || true`) — run lint locally when enforcing style.

- Security & commits: never commit `.env.local` or secrets. Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Do NOT add AI attribution and avoid `--no-verify` unless requested.

- Next/SSR caution: guard browser-only APIs (use `typeof window !== 'undefined'` or `useEffect`) to avoid hydration mismatches.

- Cross-cutting changes (DB schema, storage keys, auth, build config): STOP and list affected files in the PR description; coordinate changes across both frontends and migration scripts.

## Files to open first

- verify-setup.js
- README.md
- supabase/README.md
- supabase/schema.sql
- supabase/storage-buckets.sql
- supabase/migrate-data.js
- supabase/client.js
- js/supabase-init.js
- js/utils.js
- next-app/package.json
- .github/workflows/ci.yml
- .github/copilot-instructions.md

Keep this file short; only add items an agent would likely miss.
