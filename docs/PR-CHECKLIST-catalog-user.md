PR Checklist — catalog-user-page

This checklist is specific to the catalog-user-page refactor (feat/catalog-user-page).

- [ ] Unit tests pass (run: cd next-app && npm test)
- [ ] Playwright E2E pass locally (run a dev server at http://localhost:3000 and run: npx playwright test tests/e2e/catalog-user.spec.ts)
- [ ] CI Playwright job passes in this PR
- [ ] localStorage keys verified: `currentUser`, `kond-user` contain expected shape after saves
- [ ] Manual mobile check performed at 375–420px and 768px
- [ ] Accessibility quick checks: inputs have labels, images have alt text, color contrast acceptable
- [ ] /catalog/user/perfil behaves identically to previous version

Notes:
- E2E tests seed localStorage and do not require Supabase; if you add tests that hit Supabase add appropriate env secrets.
