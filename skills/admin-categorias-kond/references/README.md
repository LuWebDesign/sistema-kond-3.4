References for admin-categorias-kond skill

- Pages:
  - next-app/pages/admin/categorias/index.js
  - next-app/pages/admin/categorias/nueva.js
  - next-app/pages/admin/categorias/[id]/editar.js

- API:
  - next-app/pages/api/admin/categorias/index.js
  - next-app/pages/api/admin/categorias/[id].js

- Utilities:
  - next-app/utils/verifyAdminCookie.js
  - next-app/lib/tenant.js

- DB:
  - supabase/schema.sql (ensure unique index on (tenant_id, slug) and tenant_id columns)

Notes:
- Prefer to create a separate public API for storefront reads if needed.
- Follow project patterns for API responses (`{ data, meta }`) and error shapes.
