---
name: admin-categorias-kond
description: "Trigger: /admin/categorias changes. Standardize category CRUD (parent/child), slug uniqueness, deletion rules, tenant scoping and UI patterns."
license: Apache-2.0
metadata:
  author: gentle-orchestrator
  version: "1.0"
---

Activation Contract
-------------------
- Create or update this skill when modifying files under `next-app/pages/admin/categorias/` or the backend API under `next-app/pages/api/admin/categorias`.
- Create when the category model changes (schema, constraints, tenant scoping), or when the UI/UX for categories is redesigned.

Hard Rules
----------
- Tenant scoping: All server-side queries MUST include tenant filtering (e.g. `.eq('tenant_id', TENANT_ID)`). See `next-app/lib/tenant.js` — missing tenant filters cause cross-tenant leakage.
- Auth guard: `/api/admin/categorias` endpoints are ADMIN endpoints. Protect GET/POST/PUT/DELETE with `verifyAdminCookie(req)` or equivalent server-side guard. Do NOT make these endpoints public GETs.
- Slug uniqueness: Slugs must be unique per tenant. Enforce uniqueness on the DB (unique index on `(tenant_id, slug)`) and validate on API create/update. Sanitize slugs server-side.
- Deletion policy:
  - Do not delete a category silently if it has child categories or products assigned. The API MUST either reject the delete with 409 (explain reason) or perform a safe strategy (soft-delete or set FK to NULL) — document the chosen behavior in the route.
  - UI must show an explicit confirmation modal that lists implications (number of products, children) before attempting DELETE.
- Client-side tree: Fetch all categories once and build the parent->children tree client-side (no per-parent fetch loops). Cache with react-query and invalidate after mutations.
- Response shape: API handlers SHOULD return `{ data: [...], meta?: {...} }` on success and `{ error: 'message' }` on failure — follow project API patterns used elsewhere.

Decision Gates
--------------
- If the product model requires a non-null `categoria_id` for integrity, prefer soft-delete (active=false) or disallow deleting parents until products are reassigned.
- If downstream storefront needs public access to category lists, create a separate public API (`/api/catalog/categorias`) with RLS and limited fields; do NOT reuse the admin API for public reads.

Execution Steps
---------------
1. Inspect files: `next-app/pages/admin/categorias/index.js`, `nueva.js`, `[id]/editar.js` and `next-app/pages/api/admin/categorias*(.js|/index.js)`.
2. Confirm server guards: Add `import verifyAdminCookie from '../../../utils/verifyAdminCookie'` and early return 401 for non-auth in handlers.
3. Validate DB constraints: ensure `supabase/schema.sql` or migrations include `tenant_id` and a unique index for `(tenant_id, slug)`.
4. Implement deletion checks server-side: before DELETE, check for child categories and product references; return 409 with details if blocked.
5. UI: Ensure `withAdminAuth` wraps pages, show a detailed delete modal (count children/products) and use optimistic update only after successful delete response.
6. Add smoke tests: `skills/admin-categorias-kond/assets/check-categorias.sh` to validate fetch usage, wrapper, and API guard presence.

Output Contract
---------------
When this skill is executed, produce:
- `skills/admin-categorias-kond/SKILL.md` (this file)
- `skills/admin-categorias-kond/assets/check-categorias.sh` — smoke-check script
- `skills/admin-categorias-kond/references/README.md` — links to relevant files and DB migration suggestions
- A suggested commit message: `feat(skill): add admin-categorias skill and smoke checks`

References
----------
- next-app/pages/admin/categorias/index.js
- next-app/pages/admin/categorias/nueva.js
- next-app/pages/admin/categorias/[id]/editar.js
- next-app/pages/api/admin/categorias (API handlers)
- next-app/utils/verifyAdminCookie.js
- next-app/lib/tenant.js
- supabase/schema.sql
