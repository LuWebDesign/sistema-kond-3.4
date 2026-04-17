## Summary

This PR fixes two runtime issues observed in local development:

- Prevent TypeError when the public Supabase client is not initialized by adding a centralized isSupabaseReady() helper and guarding calls to supabase.* in the affected modules.
- Fix React hydration mismatch on /catalog by always rendering the SectionSelector wrapper on the server and only mounting the SectionSelector component client-side (the component remains dynamic ssr:false).

Files changed (high level)
- next-app/utils/supabaseClient.js — export isSupabaseReady()
- next-app/utils/supabaseProducts.js — added guards to public CRUD and storage functions
- next-app/utils/supabaseNotifications.js — added localStorage fallback when Supabase client is unavailable
- next-app/components/NotificationsProvider.js — guard realtime setup when supabase is not ready
- next-app/components/PublicLayout.js — stable wrapper rendering to avoid hydration mismatch

Verification
1. Run the app locally (cd next-app && npm run dev) and reproduce the original error paths:
   - Without NEXT_PUBLIC_SUPABASE_* envs: app should not throw TypeError (Supabase calls return error objects instead).
   - Visit /catalog and confirm no hydration mismatch warning in console.
2. Optional: Run the Playwright repro script scripts/repro-playwright.js to reproduce automated checks (playwright is not required to be installed).

Important notes / secrets
- The PR does NOT include any .env.local or other secret values.
- next-app/.playwright-output/ is intentionally not committed.
- If you want the Playwright devDependency removed from package.json/package-lock.json that were not included here, tell me and I will exclude them in a follow-up PR.

