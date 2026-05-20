# Proposal: admin-login-security

## Intent

Eliminate three critical security gaps in the admin panel: unbounded brute-force on login, over-exposure of user data via `select('*')`, and the absence of any server-side gate protecting `/admin` routes from unauthenticated access via localStorage manipulation.

## Scope

### In Scope
- Server-side rate limiter on admin login (5 attempts / 15 min per IP)
- Replace `select('*')` with explicit column lists in `supabaseAuthV2.js`
- JWT validation in Edge middleware for all `/admin` paths except `/admin/login`

### Out of Scope
- Session rotation, 2FA, RBAC beyond admin/non-admin
- Upstash Redis (deferred until multi-instance is needed)
- Any UI/UX changes

## Capabilities

### New Capabilities
- `admin-login-rate-limit`: Server-side rate limiting for admin login API route

### Modified Capabilities
- `admin-auth`: Edge middleware JWT gate added to `/admin` paths; `loginAdmin()` column selection narrowed

## Approach

Three independent fixes delivered as three commits in one PR:

1. **Rate limiter** — new `pages/api/admin/login.js` API route; move `loginAdmin()` call server-side; in-memory `Map` tracks attempts per IP; existing `pages/admin/login.js` calls this route instead of the Supabase client directly.
2. **Column narrowing** — two-line change in `supabaseAuthV2.js`: replace both `select('*')` occurrences with `select('id, email, username, rol, nombre, apellido')`.
3. **Middleware JWT gate** — add `/admin/:path*` to `middleware.js` matcher (excluding `/admin/login`); validate Supabase JWT using `jose` (Edge-compatible); redirect to `/admin/login` on invalid/absent token.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `next-app/pages/api/admin/login.js` | New | Rate-limited server-side login handler |
| `next-app/pages/admin/login.js` | Modified | Call new API route instead of `loginAdmin()` directly |
| `next-app/utils/supabaseAuthV2.js` | Modified | Replace `select('*')` in `loginAdmin()` (L204) and `getCurrentSession()` (L335) |
| `next-app/middleware.js` | Modified | Add `/admin` paths to matcher; add JWT validation logic |
| `next-app/package.json` | Modified | Add `jose` dependency (Edge-compatible JWT decode) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cold start resets in-memory rate limiter | Med | Documented; acceptable for single-tenant. Upstash planned for multi-instance. |
| `jose` adds weight to Edge bundle | Low | `jose` is tree-shakeable; only `jwtVerify` imported |
| Middleware matcher change affects all requests | Med | Explicit path exclusions for `/admin/login`, `/api/`, `/_next/`, `/static/` validated in tests |

## Rollback Plan

Each fix is a standalone commit. Rollback per commit:
1. Rate limiter — revert `login.js` page to direct `loginAdmin()` call; delete `api/admin/login.js`
2. Column narrowing — restore `select('*')` in `supabaseAuthV2.js` (2 lines)
3. Middleware gate — remove `/admin` from matcher in `middleware.js`; remove `jose` import

None of the three changes share state, so partial rollback is safe.

## Dependencies

- `jose` npm package (MIT, Edge-compatible, no Node APIs)
- Supabase JWT secret must be accessible at Edge runtime via `SUPABASE_JWT_SECRET` env var (add to Vercel + `.env.local`)

## Success Criteria

- [ ] 6th login attempt within 15 min returns HTTP 429, not 200
- [ ] Requesting `/admin/dashboard` without a valid JWT redirects to `/admin/login`
- [ ] `loginAdmin()` DB query no longer returns columns outside the explicit list
- [ ] Existing admin login flow (happy path) unaffected
- [ ] `npm run build` passes with no new warnings
