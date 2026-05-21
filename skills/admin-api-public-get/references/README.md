References and relevant files for admin-api-public-get skill

- verifyAdminCookie implementation:
  - next-app/utils/verifyAdminCookie.js

- Edge middleware and route guard information:
  - next-app/middleware.js

- Example routes to update:
  - next-app/pages/api/admin/home-config.js
  - next-app/pages/api/admin/catalog-styles.js

- Notes:
  - Follow AGENTS.md conventions for committing and testing.
  - Don't expose SUPABASE_SERVICE_ROLE_KEY or other secrets in client code.
