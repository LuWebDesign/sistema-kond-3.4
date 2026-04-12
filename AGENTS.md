# Code Review Rules — Sistema KOND 3.4

## General
REJECT if:
- Hardcoded secrets or credentials
- Empty catch blocks (silent error handling)
- Code duplication (violates DRY)
- `console.log` / `print()` in production code
- `var` declaration — use `const` or `let`

## JavaScript (Vanilla + Next.js)
REJECT if:
- `var` instead of `const`/`let`
- `console.log` left in production code
- Hardcoded API keys, passwords, or Supabase URLs
- Supabase calls without checking `USE_SUPABASE` / `isSupabaseConfigured()`
- Missing localStorage fallback for Supabase operations
- Functions longer than 40 lines without clear justification

PREFER:
- Arrow functions over `function` declarations
- Descriptive variable names (English or Spanish, consistent within a file)
- Explicit error handling in every async call
- Named exports over default exports (Next.js components)

## React / Next.js
REJECT if:
- Missing `"use client"` directive in App Router client components that use hooks (NOT required in Pages Router)
- `import * as React` → use named imports: `import { useState } from 'react'`
- `useMemo`/`useCallback` without clear justification (React 19 Compiler handles this automatically)

## Response Format
FIRST LINE must be exactly:
STATUS: PASSED
or
STATUS: FAILED

If FAILED, list: `file:line - rule violated - issue`
