# Spec: admin-auth

> Source: delta spec from `admin-login-security` (2026-05-20)

## Capability: admin-auth

### Requirement: Explicit column selection in auth queries

The `loginAdmin()` function in `supabaseAuthV2.js` SHALL select only
`id, email, username, rol, nombre, apellido` from the `admins` table.

The `getCurrentSession()` fallback query in `supabaseAuthV2.js` SHALL use the
same explicit column list.

Neither function MAY use `select('*')`.

(Previously: both queries used `select('*')`, returning all columns.)

#### Scenario: Login returns only allowed columns

- GIVEN a valid admin credential
- WHEN `loginAdmin()` is called
- THEN the returned user object contains exactly `id, email, username, rol, nombre, apellido`
- AND no other database columns are present in the response

#### Scenario: Session restore returns only allowed columns

- GIVEN an existing session token
- WHEN `getCurrentSession()` resolves via the DB fallback
- THEN the returned session contains exactly `id, email, username, rol, nombre, apellido`

---

### Requirement: Edge middleware JWT gate for admin routes

The Edge middleware SHALL validate the Supabase JWT for all requests to paths
matching `/admin/:path*`, except `/admin/login`.

The middleware MUST read the JWT from the `kond-admin-session` cookie.

> Note: the delta spec mentioned `Authorization: Bearer` header or `sb-access-token` cookie,
> but the authoritative tasks doc and implementation use `kond-admin-session` (httpOnly cookie
> set by `/api/admin/login`). This spec reflects the implemented behavior.

If the token is absent or fails `jwtVerify` against `SUPABASE_JWT_SECRET`, the
middleware MUST redirect the request to `/admin/login`.

If `SUPABASE_JWT_SECRET` is absent (local dev), the middleware MUST pass the request
through unchanged (safe passthrough — do NOT block).

If the token is valid, the middleware MUST pass the request through unchanged.

The existing URL-redirection logic in middleware MUST remain intact and continue
to function for all non-admin paths.

(Previously: `/admin` paths were excluded from the middleware matcher entirely.)

#### Scenario: Authenticated access to protected admin page

- GIVEN a request with a valid Supabase JWT in `kond-admin-session` cookie
- WHEN the request targets `/admin/dashboard`
- THEN the middleware allows the request through to the page

#### Scenario: Unauthenticated access redirected

- GIVEN a request with no JWT (no cookie)
- WHEN the request targets `/admin/products`
- THEN the middleware returns a redirect to `/admin/login`

#### Scenario: Expired or invalid JWT redirected

- GIVEN a request with a JWT that fails `jwtVerify`
- WHEN the request targets any `/admin/:path*` route (except `/admin/login`)
- THEN the middleware returns a redirect to `/admin/login`

#### Scenario: Login page always accessible

- GIVEN any request, authenticated or not
- WHEN the request targets `/admin/login`
- THEN the middleware does NOT validate the JWT and passes the request through

#### Scenario: Secret absent — safe passthrough

- GIVEN `SUPABASE_JWT_SECRET` is not set in the environment
- WHEN any request targets `/admin/*`
- THEN the middleware passes the request through without redirecting

#### Scenario: Non-admin redirection logic preserved

- GIVEN a request to a legacy path (e.g., `/products`)
- WHEN the middleware processes it
- THEN the existing redirection table applies and the request is redirected as before

---

## What Does NOT Change

- `loginAdmin()` signature and behavior for callers outside `pages/admin/login.js`
- Admin session storage in localStorage (`withAdminAuth` HOC soft gate unchanged)
- Any UI elements on the login page
- RLS policies in Supabase
- `supabaseAdmin()` (service role) usage elsewhere
- Any non-admin middleware routes or redirection entries
