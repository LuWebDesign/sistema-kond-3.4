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

Only include concise analysis after that.

## Quick, high-signal facts an agent will likely miss

- Two parallel code areas: a legacy static site at the repo root (HTML + `js/`) and a migrating Next.js app in `next-app/`. Confirm which target you must change BEFORE editing files.

- Next.js commands and env (work in `next-app/`):

  ```bash
  cd next-app
  npm install        # or npm ci in CI
  cp ../.env.example .env.local
  # set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_USE_SUPABASE
  npm run dev        # dev server at 0.0.0.0:3000
  npm run build
  npm start
  ```

- Quick repo health check: run `node verify-setup.js` from the repo root — it detects missing Supabase files and will exit non‑zero if required pieces are missing.

- Supabase setup is explicit and manual: execute `supabase/schema.sql` and `supabase/storage-buckets.sql` in the Supabase SQL editor; use the anon key (NOT service key) in `.env.local`. See `supabase/README.md` for the exact steps.

- Migration script: `node supabase/migrate-data.js` (optional). If you change data shapes, update this script and `MIGRACION-SUPABASE.md`.

- Canonical Supabase client: `supabase/client.js`. Also check `js/supabase-init.js` and `js/utils.js` before changing data access patterns.

- Important localStorage keys used by the static app: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`. Keep keys stable across static pages and the Next app unless you add a migration.

- Static HTML gotcha: script order matters. Utilities (e.g., `js/utils.js`) must be loaded before scripts that use them — verify `index.html`/`catalog.html` when renaming or moving JS files.

- CI and Node versions: `next-app/package.json` sets `engines.node = 22.x` but `.github/workflows/ci.yml` uses Node 20. If CI or build fails, inspect that mismatch and the workflow's cache key (`cache-dependency-path: next-app/package-lock.json`).

- ESLint in CI is non-fatal: CI runs `npx eslint . --ext .js,.jsx,.ts,.tsx || true`, so lint errors will not fail the job by default. Do not assume CI enforces lint rules.

- Security: never commit `.env.local` or secrets. Frontend must use the Supabase anon key only. NEVER put service/admin keys into client-side code.

- Commits: use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Do NOT use `--no-verify`. Do NOT add AI attribution to commits.

- Small style notes that matter here: prefer `const`/`let` over `var`, avoid `console.*` in production code, and guard browser-only APIs with `typeof window !== 'undefined'` (or access them inside `useEffect` in React).

- Next/SSR hydration caution: avoid calling `new Date()` or rendering browser-only values directly in JSX; use an `isMounted` pattern or compute values in effects to prevent mismatches.

- Authoritative docs: prefer executable sources (`verify-setup.js`, `supabase/*.js`, `next-app/package.json`, `.github/workflows/ci.yml`) over prose. If docs conflict with scripts, follow the scripts and update docs.

- If you plan cross-cutting changes (data model, storage keys, auth, build config), STOP and list the files you intend to change — this repo contains two running frontends and migration scripts that must be kept in sync.

## Registered project skills

- analytics-cards — Reusable analytics card component and compact rules (skills/analytics-cards/SKILL.md)
- skill-creator — Skill creation templates and rules (file:///C:/Users/usuario/.config/opencode/skills/skill-creator/SKILL.md)
