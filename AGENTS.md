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

## What to know (only repo-specific, high-signal items)

- Two targets: legacy static site at the repo root (HTML + js/) and a migrating Next.js app in `next-app/`. Confirm which you must change before editing any files.

- Next.js quick commands (work in `next-app/`):

  cd next-app
  npm install        # or `npm ci` in CI
  cp ../.env.example .env.local
  set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_USE_SUPABASE
  npm run dev        # binds 0.0.0.0:3000
  npm run build
  npm start

- Run `node verify-setup.js` from repo root as a quick pre-check. It verifies presence of required Supabase files and exits non-zero if missing. (It checks: `supabase/client.js`, `supabase/schema.sql`, `supabase/storage-buckets.sql`, `supabase/migrate-data.js`, `supabase/README.md`, `.env.example`, `js/supabase-init.js`, `js/utils.js`, `MIGRACION-SUPABASE.md`.)

- Supabase setup: run `supabase/schema.sql` then `supabase/storage-buckets.sql` in Supabase SQL Editor. Use the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) for frontend; NEVER put service-role/admin keys in client code or commit them.

- Migration: `node supabase/migrate-data.js` is for one-time migration and REQUIRES SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (service role key = secret). The script expects a `data-export.json` produced from browser localStorage (see comments in the script). Treat the service key as a secret.

- Canonical client/init: `supabase/client.js` is the authoritative Supabase client. Also review `js/supabase-init.js` and `js/utils.js` before changing data access or storage keys.

- Legacy localStorage keys you will encounter: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`. If you change keys or shapes, add a migration or keep backward compatibility.

- Static HTML gotcha: script order matters (utils must be loaded before scripts that use them). Verify `index.html` / `catalog.html` when renaming/moving JS files.

- CI notes: `.github/workflows/ci.yml` runs npm ci and build from `next-app/` using Node 20. `next-app/package.json` declares engines.node = 22.x — if builds fail check this mismatch and the cache key `next-app/package-lock.json`.

- ESLint in CI is non-fatal: CI runs `npx eslint ... || true`. Do not rely on CI to block lint issues; run lint locally if enforcement is required.

- Security & commits: never commit `.env.local` or any secrets. Use only the Supabase anon key in frontend. Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Do NOT add AI attribution to commits and do NOT use `--no-verify` unless asked.

- Next/SSR cautions: guard browser-only APIs with `typeof window !== 'undefined'` or call them inside `useEffect`. Avoid rendering browser-only values at build time (use an isMounted pattern) to prevent hydration mismatches.

- Authoritative sources (trust these first): `verify-setup.js`, `supabase/*` (sql/js), `supabase/migrate-data.js`, `next-app/package.json`, `.github/workflows/ci.yml`, `.github/copilot-instructions.md`. If prose docs conflict, prefer the executable scripts and update docs.

- If you plan cross-cutting changes (DB shapes, storage keys, auth, build config): STOP and list files you intend to change in the PR description — this repo runs two frontends and migration scripts that must be coordinated.

## Quick file checklist (open these first)

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
