# Design: Admin Login Security

## Technical Approach

Three independent hardening layers applied in priority order: (1) rate-limit the login surface via a new server-side API route, (2) narrow DB egress in `supabaseAuthV2.js`, (3) add an Edge middleware guard for `/admin/*` paths. Work Unit 3 requires a deliberate architectural choice due to the localStorage-only JWT storage of plain `supabase-js`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| WU1: Login surface | New `POST /api/admin/login` route | Keep client-side `loginAdmin()` | Rate limiting requires server context; client-side is unenforceable |
| WU1: Rate-limit store | In-memory `Map` | Redis, KV, DB | No external dependency; acceptable for single-instance Vercel deployment; resets on cold start (acceptable tradeoff) |
| WU3: Cookie strategy | Set `httpOnly` session cookie from `/api/admin/login` | Migrate to `@supabase/ssr` | `@supabase/ssr` migration is out of scope; a signed cookie avoids the localStorage-inaccessible-in-Edge problem with no new dependencies |
| WU3: JWT validation lib | `jose` (install required) | `jsonwebtoken` (not Edge-compatible) | `jose` is Edge Runtime compatible; `jsonwebtoken` uses Node crypto APIs unavailable in Edge |
| WU3: Cookie value | Supabase JWT from `authData.session.access_token` | Custom opaque token | Reuses existing Supabase JWT; validated with `SUPABASE_JWT_SECRET` — no new token format |

## Data Flow

### WU1 — Login via API Route

```
Browser POST /api/admin/login { email, password }
  │
  ├─ rate limit check (in-memory Map by IP)
  │     │ 429 if exceeded
  │
  ├─ supabase.auth.signInWithPassword()   ← anon client
  │     │ 401 if authError
  │
  ├─ supabaseAdmin().from('usuarios')
  │   .select('id,email,username,rol,nombre,apellido')
  │   .eq('id', authData.user.id)
  │   .eq('tenant_id', TENANT_ID)
  │     │ 403 + signOut() if rol not admin/super_admin
  │
  ├─ Set-Cookie: kond-admin-session=<JWT>; HttpOnly; Secure; SameSite=Strict; Path=/admin
  │
  └─ 200 { user: { id, email, username, rol, nombre, apellido } }
       └─ client sets localStorage['kond-admin'] (existing pattern unchanged)
```

### WU3 — Edge Middleware Guard

```
Request to /admin/*
  │
  ├─ request.cookies.get('kond-admin-session') → token
  │     │ no cookie → redirect /admin/login
  │
  ├─ jwtVerify(token, TextEncoder(SUPABASE_JWT_SECRET))
  │     │ invalid/expired → redirect /admin/login
  │
  └─ NextResponse.next()
```

## File Changes

| File | Action | Description |
|---|---|---|
| `next-app/pages/api/admin/login.js` | Create | Rate-limited login API route |
| `next-app/utils/supabaseAuthV2.js` | Modify | Replace `select('*')` with explicit columns in `loginAdmin()` and `getCurrentSession()` fallback |
| `next-app/pages/admin/login.js` | Modify | Call `POST /api/admin/login` instead of `loginAdmin()` directly |
| `next-app/middleware.js` | Modify | Add `/admin` to matcher; add JWT cookie validation via `jose` |
| `next-app/package.json` | Modify | Add `jose` dependency |

## Interfaces / Contracts

```js
// POST /api/admin/login
// Request body
{ email: string, password: string }

// 200 response
{ user: { id: string, email: string, username: string, rol: string, nombre: string, apellido: string } }

// Error responses
{ error: string }   // 400 | 401 | 403 | 429 | 500

// Cookie set on 200
Set-Cookie: kond-admin-session=<supabase_jwt>; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=3600
```

```js
// Rate limit entry shape (in-memory, not exported)
Map<string, { count: number, windowStart: number }>
// key: IP string, window: 15 min (900_000 ms), max: 5 attempts
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Rate limiter logic (count, window reset, IP extraction) | Jest — test Map state transitions |
| Unit | Column list in `loginAdmin()` and `getCurrentSession()` | Code review / grep for `select('*')` |
| Integration | `POST /api/admin/login` happy path + 401 + 403 + 429 | `next-test` or manual curl |
| Integration | Middleware passes valid cookie, blocks missing/expired | Local dev smoke test |
| E2E | Full admin login flow in browser | Manual + existing Playwright setup |

## Migration / Rollout

No DB migration required. `@supabase/ssr` is NOT needed — the cookie is set server-side from the new API route. `jose` must be installed (`npm install jose`).

`SUPABASE_JWT_SECRET` must be added to Vercel environment variables (found in Supabase dashboard → Settings → API → JWT Secret). Without it, middleware runs as no-op (matches existing fail-safe pattern).

Rollout: WU2 (column narrowing) is safe to ship first independently. WU1 and WU3 must ship together — WU3 validates a cookie that only WU1 sets. If WU3 ships without WU1, all admins are locked out.

## Open Questions

- [ ] Confirm `SUPABASE_JWT_SECRET` env var is available in Vercel for this tenant — required for WU3 JWT validation
- [ ] Cookie `Max-Age`: set to match Supabase JWT expiry (default 3600s) or make it session-scoped? Confirm with team.
