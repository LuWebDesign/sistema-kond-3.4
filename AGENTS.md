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
  - Env: `cp ../.env.example .env.local` — set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_USE_SUPABASE
  - Run: `npm run dev` (binds 0.0.0.0:3000). Build: `npm run build`. Start: `npm start`.
  - **Node mismatch**: `package.json` says 22.x, CI uses 20 (via `.github/workflows/ci.yml`). If build fails, check Node version.

- **Pre-check**: Run `node verify-setup.js` from repo root before infra changes — exits non-zero if critical Supabase files missing.

- **Supabase setup** (must read `supabase/README.md`):
  - SQL order: `supabase/schema.sql` → `supabase/storage-buckets.sql`
  - Buckets: `comprobantes` (private), `productos` (public)
  - Client: `supabase/client.js`. Static HTML uses `window.KOND_SUPABASE_CONFIG` + `js/supabase-init.js`.
  - NEVER expose SUPABASE_SERVICE_ROLE_KEY in client code.

- **localStorage keys** (preserve on migrations):
  - Data: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`, `notifications`
  - Auth: `kond-user`, `kond-admin`, `currentUser`, `adminSession`, `userSession` — clear ALL on logout
  - `safeLocalStorageSetItem` may omit `comprobante` on QuotaExceededError — don't remove without planning

- **Static HTML entry points**:
  - `index.html` — admin dashboard
  - `home.html` — landing
  - `marketing.html` — promotions
  - Script order: `utils.js` → `supabase-init.js` → `promo-engine.js` → [module] → `main.js`

- **CI**: Node 20, caches `next-app/package-lock.json`. ESLint non-fatal in CI (`npx eslint . || true`).

- **Security**: Always use `escapeHtml()` before `.innerHTML`. Never commit `.env.local` or keys.

- **SSR guard**: Use `typeof window !== 'undefined'` or React `useEffect` for browser-only APIs in Next.js.

- **Cross-cutting changes** (STOP and coordinate): DB schema, storage keys, auth, or build/config changes affect BOTH frontends. List all artifacts in PR.

- **Skills**: See `.atl/skill-registry.md` for project-specific skills. Key ones:
  - `react-query-kond` — staleTime policies, queryKeys from `next-app/lib/queryKeys.js`
  - `supabase-egress-best-practices` — no `select(*)`, server-side filters, pagination

- **Deep context**: See `.github/copilot-instructions.md` for full technical details (schema, patterns, functions).

## Files to open first

1. verify-setup.js
2. .env.example
3. .github/workflows/ci.yml
4. next-app/package.json
5. supabase/client.js
6. supabase/schema.sql (tables + RLS)
7. .atl/skill-registry.md
8. .github/copilot-instructions.md

## Commands

- Verify setup: `node verify-setup.js`
- Next.js dev: `cd next-app && npm run dev`
- Next.js build: `cd next-app && npm run build`
- Lint: `cd next-app && npx eslint .`