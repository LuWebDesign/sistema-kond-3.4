# Code Review Rules — sistema-kond

## JavaScript / React

- Use `const`/`let`, never `var`
- Use arrow functions for components and callbacks
- Functional components only (no class components)
- No `console.log`, `console.error`, or `console.warn` in production code
- No dead code or commented-out code blocks

## Next.js (Pages Router)

- Pages Router only — no App Router patterns
- `getServerSideProps` / `getStaticProps` only when strictly necessary
- Avoid hydration mismatches: client-only state (localStorage, window) must use `isMounted` guard or be inside `useEffect`

## State Management

- Use React `useState` / `useEffect` / `useMemo` / `useCallback`
- Initial state must match what SSR would render (no `useState(true)` for loading that causes text-node mismatches)
- localStorage access must always be guarded with `typeof window !== 'undefined'` or inside `useEffect`

## Data / Auth

- Dual pattern: Supabase + localStorage for catalog users
- Never expose admin session data to catalog (public) pages
- Always use `try/catch` on localStorage reads

## Style

- Inline styles only (no CSS modules, no Tailwind in this project)
- Use CSS variables (`var(--accent-blue)`, `var(--text-primary)`, etc.) — never hardcoded colors
