# Tasks: admin-login-security

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 220–310 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (WU1+WU3 together, WU2 independent but included) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| WU2 | Column narrowing in supabaseAuthV2.js | PR 1 or same | Safe, independent, ~10 lines |
| WU1+WU3 | API route + middleware JWT gate | PR 1 | Must ship together per design constraint |

---

## Phase 1: Foundation / Infrastructure

- [ ] 1.1 Install `jose` in `next-app/` — `npm install jose`
- [ ] 1.2 Add `SUPABASE_JWT_SECRET` to `next-app/.env.local` (from Supabase dashboard → Settings → API → JWT Secret); document in `.env.example`
- [ ] 1.3 Add `SUPABASE_JWT_SECRET` to Vercel environment variables (production + preview)

## Phase 2: Column Narrowing (WU2 — independent)

- [ ] 2.1 `next-app/utils/supabaseAuthV2.js` — `loginAdmin()`: change `.select('*')` → `.select('id, email, username, rol, nombre, apellido')`
- [ ] 2.2 `next-app/utils/supabaseAuthV2.js` — `getCurrentSession()` DB fallback: same column list, remove `select('*')`

## Phase 3: API Route (WU1)

- [ ] 3.1 Create `next-app/pages/api/admin/login.js` — POST handler skeleton with `export default async function handler(req, res)`
- [ ] 3.2 Implement in-memory rate limiter: `Map<ip, { count, windowStart }>`, 5 attempts / 15 min window; read IP from `x-forwarded-for` header fallback `req.socket.remoteAddress`
- [ ] 3.3 Add request validation: require `email` + `password` in body; return 400 if missing
- [ ] 3.4 Call `supabase.auth.signInWithPassword({ email, password })` (anon client); increment IP counter on failure; return 401 on auth error
- [ ] 3.5 Query `usuarios` table via `supabaseAdmin()`: `.select('id, email, username, rol, nombre, apellido').eq('id', uid).eq('tenant_id', TENANT_ID).single()`
- [ ] 3.6 Role check: if `rol !== 'admin' && rol !== 'super_admin'` → call `supabase.auth.signOut()` + return 403
- [ ] 3.7 Set `kond-admin-session` cookie: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 3600`; value = Supabase JWT
- [ ] 3.8 Return `{ user: { id, email, username, rol, nombre, apellido } }` on 200

## Phase 4: Login Page Wire-up (WU1)

- [ ] 4.1 `next-app/pages/admin/login.js` — replace `loginAdmin()` import call with `fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })`
- [ ] 4.2 Handle 429 response: show "Too many attempts. Try again later." error message in UI
- [ ] 4.3 Handle 401/403: show appropriate error messages matching existing UI error state

## Phase 5: Edge Middleware JWT Gate (WU3 — ships with WU1)

- [ ] 5.1 `next-app/middleware.js` — expand `matcher` config to include `/admin/:path*` (already excludes `/admin/login` via negative lookahead or conditional check)
- [ ] 5.2 Add JWT gate logic: read `kond-admin-session` cookie; call `jwtVerify(token, secret)` from `jose` with `SUPABASE_JWT_SECRET`
- [ ] 5.3 On missing or invalid JWT: `NextResponse.redirect(new URL('/admin/login', req.url))`; skip redirect if path is exactly `/admin/login`
- [ ] 5.4 Verify existing DB-driven redirection logic (non-admin paths) still executes — JWT gate must be an early-return only for admin paths

## Phase 6: Verification

- [ ] 6.1 Manual: `POST /api/admin/login` with valid credentials → 200 + cookie set
- [ ] 6.2 Manual: 6 rapid POST attempts → 6th returns 429
- [ ] 6.3 Manual: wait 15 min (or mock clock) → counter resets, login succeeds
- [ ] 6.4 Manual: navigate to `/admin/dashboard` without cookie → redirected to `/admin/login`
- [ ] 6.5 Manual: navigate to `/admin/login` without cookie → page loads (no redirect loop)
- [ ] 6.6 Manual: existing legacy redirect (e.g., `/products` → `/admin/products`) still works
- [ ] 6.7 Verify `next build` passes with no type/lint errors
