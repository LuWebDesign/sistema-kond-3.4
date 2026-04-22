// next-app/lib/queryKeys.js
// Central query key constants and staleTime policy for React Query.
// NEVER hardcode query key strings in components — always import from here.

export const QUERY_KEYS = {
  productos: {
    all:        ['productos'],
    list:       () => ['productos', 'list'],
    publicados: () => ['productos', 'publicados'],
    byId:       (id) => ['productos', id],
  },
  materiales: {
    all:         ['materiales'],
    list:        () => ['materiales', 'list'],
    byId:        (id) => ['materiales', id],
    proveedores: () => ['materiales', 'proveedores'],
    tamanos:     () => ['materiales', 'tamanos'],
    espesores:   () => ['materiales', 'espesores'],
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

// staleTime values in milliseconds — DO NOT change without team approval
export const STALE_TIMES = {
  productos_admin:   2  * 60 * 1000,  // 2 min  — edited often
  productos_catalog: 5  * 60 * 1000,  // 5 min  — catalog browsing
  materiales:        15 * 60 * 1000,  // 15 min — reference data
  promociones:       5  * 60 * 1000,  // 5 min
  pedidos:           0,               // never cache — real-time
  stock:             0,               // never cache — critical precision
}
