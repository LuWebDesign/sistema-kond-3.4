---
name: react-query-kond
description: >
  React Query (@tanstack/react-query v5) patterns for sistema-kond-3.4.
  Covers query keys, staleTime policy, useQuery wrappers, and mutation + invalidation.
  Trigger: When adding, modifying, or reviewing any useQuery / useMutation / QueryClient code in next-app/.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Adding a new data fetch to any page or hook in next-app/
- Creating a mutation (create / edit / delete) for any Supabase table
- Reviewing code that calls Supabase directly in a useEffect

## Critical Patterns

### 1. Query Keys — always import from lib/queryKeys.js

```js
// next-app/lib/queryKeys.js
export const QUERY_KEYS = {
  productos: {
    all:        ['productos'],
    list:       () => ['productos', 'list'],
    publicados: () => ['productos', 'publicados'],
    byId:       (id) => ['productos', id],
  },
  materiales: {
    all:        ['materiales'],
    list:       () => ['materiales', 'list'],
    byId:       (id) => ['materiales', id],
    proveedores: () => ['materiales', 'proveedores'],
    tamanos:    () => ['materiales', 'tamanos'],
    espesores:  () => ['materiales', 'espesores'],
  },
  promociones: {
    all:    ['promociones'],
    activas: () => ['promociones', 'activas'],
  },
  pedidos: {
    catalogo: () => ['pedidos', 'catalogo'],
    byId:     (id) => ['pedidos', id],
  },
}
```

NEVER hardcode query key strings inline. Always call `QUERY_KEYS.x.y()`.

### 2. staleTime policy (LOCKED — do not override without approval)

```js
// next-app/lib/queryKeys.js — also export this map
export const STALE_TIMES = {
  productos_admin:   2  * 60 * 1000,  // 2 min  — edited often, admin needs fresh data
  productos_catalog: 5  * 60 * 1000,  // 5 min  — catalog visitors don't need millisecond precision
  materiales:        15 * 60 * 1000,  // 15 min — reference data, rarely changes
  promociones:       5  * 60 * 1000,  // 5 min
  pedidos:           0,               // NEVER cache — real-time
  stock:             0,               // NEVER cache — critical precision
}
```

### 3. QueryClient — configured once in pages/_app.js

```js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

// MUST be inside the component to avoid shared state across SSR requests
function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:           5 * 60 * 1000,  // default: 5 min
        gcTime:              30 * 60 * 1000, // 30 min
        retry:               1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

### 4. useQuery wrapper — wrap existing util functions

```js
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '@/lib/queryKeys'
import { getAllProductos } from '@/utils/supabaseProducts'

// Admin context — shorter staleTime
export function useProductos() {
  return useQuery({
    queryKey: QUERY_KEYS.productos.list(),
    queryFn:  getAllProductos,
    staleTime: STALE_TIMES.productos_admin,
  })
}

// Catalog context — longer staleTime, used by public-facing pages
export function useProductosPublicados() {
  return useQuery({
    queryKey: QUERY_KEYS.productos.publicados(),
    queryFn:  getProductosPublicados,
    staleTime: STALE_TIMES.productos_catalog,
  })
}
```

### 5. useMutation + invalidation

```js
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/queryKeys'

export function useCreateProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProducto,
    onSuccess: () => {
      // Invalidate all producto queries — list + publicados + byId caches
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productos.all })
    },
  })
}
```

ALWAYS use `invalidateQueries` after mutations — never manually call `refetch`.
Invalidate the `.all` key so ALL sub-queries of that entity refresh.

### 6. refetchInterval for dashboard polling

```js
// Replace setInterval with React Query's built-in polling:
useQuery({
  queryKey: QUERY_KEYS.pedidos.catalogo(),
  queryFn:  getAllPedidosCatalogo,
  staleTime: 0,
  refetchInterval: 5 * 60 * 1000, // 5 min
})
```

## NEVER Rules

- NEVER set `staleTime: 0` for productos or materiales (defeats caching purpose)
- NEVER set `staleTime > 0` for pedidos or stock
- NEVER create a QueryClient outside the component (causes SSR shared state bugs)
- NEVER hardcode query key strings — always use QUERY_KEYS constants
- NEVER add React Query to static HTML files in js/ directory — Next.js only
- NEVER call `refetch()` after mutations — use `invalidateQueries` instead

## Commands

```bash
# Install
cd next-app && npm install @tanstack/react-query @tanstack/react-query-devtools

# Dev server
cd next-app && npm run dev

# Check for existing useEffect fetches to convert
# (run from next-app/ directory)
grep -r "useEffect" pages/ hooks/ --include="*.js" -l
```

## Files

| File | Role |
|------|------|
| next-app/lib/queryKeys.js | Central query key + staleTime constants |
| next-app/pages/_app.js | QueryClientProvider setup |
| next-app/hooks/useCatalog.js | Main hook — highest egress, convert to useQuery |
| next-app/hooks/useAdmin*.js | Admin hooks if they exist |
| next-app/utils/supabaseProducts.js | queryFn source for productos |
| next-app/utils/supabaseMateriales.js | queryFn source for materiales |
| next-app/utils/supabaseMarketing.js | queryFn source for promociones |
| next-app/utils/supabasePedidos.js | queryFn source for pedidos |
