---
name: admin-api-public-get
description: "Trigger: admin API returns 401 for public GET requests. Allow public GET for admin read-only endpoints and protect write methods."
license: Apache-2.0
metadata:
  author: gentle-orchestrator
  version: "1.0"
---

Activation Contract
-------------------
- Create or update this skill when an admin API route under next-app/pages/api/admin/ is returning 401 for unauthenticated GETs used by the storefront or public pages.
- Create when the pattern repeats across multiple endpoints or developers report confusion about which admin APIs must be public.

Hard Rules
----------
- Public GETs: Endpoints that only READ configuration or public data (e.g. /api/admin/home-config, /api/admin/catalog-styles) MUST allow unauthenticated GET requests.
- Protected writes: Any non-GET (POST/PUT/DELETE) that mutates server state MUST verify admin auth via verifyAdminCookie(req) or an equivalent JWT gate.
- Do NOT expose SUPABASE_SERVICE_ROLE_KEY or other secret keys to client-side code.
- Add tests (assets/check-admin-apis.sh) for every endpoint changed.

Decision Gates
--------------
- If an endpoint must expose extra fields only for admins, implement a two-tier response: public subset (GET unauthenticated) and an admin-only extended object when the request is authenticated.
- If an endpoint is strictly admin-only (e.g., sensitive user management), keep it protected for GET as well and document the reason in the route file.

Execution Steps
---------------
1. Identify target route(s) under next-app/pages/api/admin/ that the storefront fetches (grep for fetch('/api/admin/')).
2. Update handler so that only mutating methods require admin auth:
   - if (req.method !== 'GET') { const userId = await verifyAdminCookie(req); if (!userId) return res.status(401).json({ error: 'No autorizado' }) }
3. Add or update assets/check-admin-apis.sh to validate:
   - Public GET returns 200
   - POST without cookie returns 401
   - Optional: POST with admin cookie returns 200
4. Add unit/integration smoke tests or include the shell check in CI dev pipeline for local devs.
5. Update AGENTS.md registry (project skills list) and add a short note in the route file referencing this skill.

Output Contract
---------------
When invoked to apply this skill produce:
- Modified API source files under next-app/pages/api/admin/ with the public-GET pattern applied
- assets/check-admin-apis.sh — simple curl-based smoke checks
- skills/admin-api-public-get/SKILL.md (this file)
- skills/admin-api-public-get/references/README.md linking to verifyAdminCookie and middleware
- A short changelog note to commit message describing the change

References
----------
- next-app/utils/verifyAdminCookie.js
- next-app/middleware.js
- next-app/pages/api/admin/home-config.js
- next-app/pages/api/admin/catalog-styles.js
