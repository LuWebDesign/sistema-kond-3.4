# Skill Registry (auto-generated)

This file contains compact, machine-friendly rules for project skills. The orchestrator loads the "Compact Rules" blocks from here and injects them into sub-agent prompts as `## Project Standards (auto-resolved)`.

---

## Compact Rules

### analytics-cards (auto-resolved)
- Component path: next-app/components/AnalyticsCard.js
- Primary purpose: standardize analytics/metric cards across admin UI (/admin/dashboard, /admin/products, /admin/cotizaciones).
- Props (expected):
  - title: string
  - value: string | number (format before passing)
  - icon: React node or emoji
  - color: hex string (accent color)
  - isAmount: boolean (adjust font sizing for currency)
  - subtitle: optional string
  - trend: optional object { icon, text, color }
  - compact: boolean (true → compact horizontal card used on metrics grids)
  - leftAccent: boolean (true → render `border-left: 4px solid {color}`)

- Styling rules (must be respected by implementors):
  - Use CSS variables already present: var(--bg-card), var(--border-color), var(--text-primary), var(--text-secondary).
  - Compact mode: border-radius: 8px; padding: 16px; icon font-size ≈ 1.5rem; keep single-row height consistent across cards.
  - Non-compact mode: border-radius: 12px; padding: 24px; icon font-size ≈ 2rem.
  - If `leftAccent` is set, add `border-left: 4px solid {color}` and keep internal padding unchanged.
  - Prefer inline styles or component-scoped styles (CSS module / styled JSX). Do NOT rely on global CSS overrides.

- Accessibility and SSR:
  - Do not access `window` or `document` during module initialization. If DOM APIs are needed, guard with `typeof window !== 'undefined'` or use `useEffect`.
  - Icon containers should include an `aria-hidden` attribute if decorative, or an `aria-label` if informative.
  - Ensure color contrast for value text against background.

- Testing / Validation:
  - Dev command: cd next-app && npm run dev
  - Pages to verify visually: /admin/products, /admin/dashboard, /admin/cotizaciones
  - Responsive check: verify grid behavior at common breakpoints (mobile 375–420px, tablet 768px, desktop 1280px)

### react-query-kond (auto-resolved)
- Skill file: skills/react-query-kond/SKILL.md
- Query keys: always import from `next-app/lib/queryKeys.js` — NEVER hardcode strings
- staleTime policy (LOCKED):
  - productos_admin: 2 min | productos_catalog: 5 min
  - materiales/tamanos/espesores/proveedores: 15 min | promociones: 5 min
  - pedidos: 0 (never cache) | stock: 0 (never cache)
- QueryClient: instantiate with `useState(() => new QueryClient(...))` inside _app.js component — never outside
- useQuery pattern: `queryKey: QUERY_KEYS.x.y(), queryFn: existingUtil, staleTime: STALE_TIMES.x`
- useMutation pattern: `onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.x.all })`
- Dashboard polling: use `refetchInterval` on useQuery, NOT setInterval
- NEVER add React Query to static HTML files (js/ directory) — Next.js only
- NEVER call `refetch()` after mutations — always use `invalidateQueries`
- ReactQueryDevtools: only in development (`process.env.NODE_ENV === 'development'`)

### skill-creator (auto-resolved)
- Location (local tool template): file:///C:/Users/usuario/.config/opencode/skills/skill-creator/SKILL.md
- When creating new skills, follow the SKILL.md template. Frontmatter MUST include: name, description, license (Apache-2.0), metadata.author, metadata.version.
- Compact rules inside a skill should be the minimal instructions that a sub-agent must receive (short decision list, file paths, triggers). Keep examples minimal.

---

## User Skills (trigger table)
| Skill | Trigger keywords | Path |
|-------|------------------|------|
| react-query-kond | react query, useQuery, useMutation, tanstack, query keys, staleTime | skills/react-query-kond/SKILL.md |
| analytics-cards | analytics card, metric card, stats card, tarjeta analitica | skills/analytics-cards/SKILL.md |
| skill-creator | create skill, skill-creator, new skill | file:///C:/Users/usuario/.config/opencode/skills/skill-creator/SKILL.md |

---

## Notes
- This registry is intentionally compact: when launching sub-agents the orchestrator will copy the relevant compact rule block (the text under each skill heading) into the sub-agent prompt as `## Project Standards (auto-resolved)`.
- Keep entries small and actionable; avoid long prose. For new skills, add an entry here and save to engram to make it discoverable by the orchestrator.
