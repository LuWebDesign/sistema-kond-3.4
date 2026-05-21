# Spec: admin-login-rate-limit

> Source: delta spec from `admin-login-security` (2026-05-20)

## Capability: admin-login-rate-limit

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
