# Delta Spec: admin-login-security

## Capabilities

| Capability | Type | Domain |
|------------|------|--------|
| `admin-login-rate-limit` | New | Server-side admin login API |
| `admin-auth` | Modified | Auth utilities + Edge middleware |

---

## Capability: admin-login-rate-limit (NEW)

### Requirement: Server-side rate limit on admin login

The system SHALL enforce a maximum of 5 login attempts per IP address within any
rolling 15-minute window via an in-memory store on the server.

The API route `POST /api/admin/login` MUST return HTTP 429 when the attempt count
for the requesting IP exceeds 5 within the window.

The page `pages/admin/login.js` SHALL call `/api/admin/login` instead of invoking
`loginAdmin()` directly from the browser.

`loginAdmin()` in `supabaseAuthV2.js` MUST NOT be removed (other callers exist).

#### Scenario: Successful login on first attempt

- GIVEN a valid admin email and password
- WHEN `POST /api/admin/login` is called
- THEN the route returns HTTP 200 with the session data

#### Scenario: Rate limit exceeded

- GIVEN an IP that has made 5 failed login attempts within 15 minutes
- WHEN a 6th attempt is made from the same IP
- THEN the route returns HTTP 429 with `{ error: "Too many attempts. Try again later." }`
- AND the attempt is NOT forwarded to Supabase auth

#### Scenario: Window resets after 15 minutes

- GIVEN an IP that made 5 failed attempts 15+ minutes ago
- WHEN a new attempt is made
- THEN the counter is reset and the login attempt is processed normally

#### Scenario: Wrong credentials within limit

- GIVEN an IP with fewer than 5 attempts in the window
- WHEN an invalid credential is submitted
- THEN the route returns HTTP 401 and increments the IP counter

---

## Capability: admin-auth (MODIFIED)

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

The middleware MUST read the JWT from the `Authorization: Bearer` header or the
`sb-access-token` cookie (whichever is present).

If the token is absent or fails `jwtVerify` against `SUPABASE_JWT_SECRET`, the
middleware MUST redirect the request to `/admin/login`.

If the token is valid, the middleware MUST pass the request through unchanged.

The existing URL-redirection logic in middleware MUST remain intact and continue
to function for all non-admin paths.

(Previously: `/admin` paths were excluded from the middleware matcher entirely.)

#### Scenario: Authenticated access to protected admin page

- GIVEN a request with a valid Supabase JWT
- WHEN the request targets `/admin/dashboard`
- THEN the middleware allows the request through to the page

#### Scenario: Unauthenticated access redirected

- GIVEN a request with no JWT (no header, no cookie)
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
