# Code Review Rules — Sistema KOND

## Response Format (MANDATORY)

**ALWAYS start your response with one of these two lines — before any other text:**
```
STATUS: PASSED
```
or
```
STATUS: FAILED
```

Then provide the detailed analysis below.

## General

- Use `const`/`let`, never `var`
- Use arrow functions
- No `console.log`, `console.error`, or `console.warn` in production code
- All browser APIs (`window`, `localStorage`, `document`) must be accessed inside `useEffect` or guarded with `typeof window !== 'undefined'`

## React / Next.js

- Use functional components only
- Page files: default export only. Shared/reusable components: named exports
- Internal helper components defined inside a page file (not exported, not reused elsewhere) are acceptable as `function` declarations or `const` arrow functions — both styles are allowed for internal-only components
- Never call `new Date()`, `Date.now()`, or any time/locale-sensitive function **directly inside JSX** (in the render return) — initialize in `useEffect` and store in state to avoid SSR hydration mismatches. Calling `new Date()` inside async data-loading functions (not in the render path) is acceptable
- Any state that depends on browser-only data (localStorage, window dimensions, etc.) must be read inside `useEffect` or guarded with `typeof window !== 'undefined'`
- When a page renders conditional text that could differ between SSR and the initial client render, use the `isMounted` pattern:
  ```js
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => { setIsMounted(true) }, [])
  if (!isMounted) return null
  ```
- Use `<Link>` from `next/link` for internal navigation — never bare `<a href>` for internal routes

## Supabase / Data

- Always use the dual pattern: Supabase first, localStorage as fallback
- Never expose admin credentials in client-side code

## Commits

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Never use `--no-verify`
