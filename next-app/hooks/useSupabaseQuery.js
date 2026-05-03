// next-app/hooks/useSupabaseQuery.js
// Ready-made useQuery hooks wrapping Supabase utility functions.
// Import these in pages/components instead of calling utils directly.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '@/lib/queryKeys'

// -- Productos (supabaseProducts.js has isSupabaseReady guard — preferred for Next.js)
import {
  getAllProductos,
  getProductosPublicados,
  getProductoById,
} from '@/utils/supabaseProducts'

// -- Materiales, Proveedores, Tamaños, Espesores
import {
  getAllMateriales,
  getAllProveedores,
  getAllTamanos,
  getAllEspesores,
} from '@/utils/supabaseMateriales'

// -- Promociones
import { getPromocionesActivas } from '@/utils/supabaseMarketing'

// -- Pedidos catálogo
import {
  getAllPedidosCatalogo,
  getPedidoCatalogoById,
} from '@/utils/supabasePedidos'

// -- Categorías
import { getCategoriasPublicas, getCategoriasAdmin } from '@/utils/supabaseCategorias'

// ============================================================
// PRODUCTOS
// ============================================================

/**
 * All productos — admin context.
 * staleTime: productos_admin (2 min)
 */
export function useProductos() {
  return useQuery({
    queryKey: QUERY_KEYS.productos.list(),
    queryFn: () => getAllProductos().then(res => res.data || []),
    staleTime: STALE_TIMES.productos_admin,
  })
}

/**
 * Productos publicados — catalog context.
 * staleTime: productos_catalog (5 min)
 */
export function useProductosPublicados() {
  return useQuery({
    queryKey: QUERY_KEYS.productos.publicados(),
    queryFn: () => getProductosPublicados().then(res => res.data || []),
    staleTime: STALE_TIMES.productos_catalog,
  })
}

/**
 * Single producto by ID — admin context.
 * staleTime: productos_admin (2 min)
 * Disabled when id is falsy.
 */
export function useProductoById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.productos.byId(id),
    queryFn: () => getProductoById(id),
    staleTime: STALE_TIMES.productos_admin,
    enabled: !!id,
  })
}

// ============================================================
// MATERIALES
// ============================================================

/**
 * All materiales.
 * staleTime: materiales (15 min)
 */
export function useMateriales() {
  return useQuery({
    queryKey: QUERY_KEYS.materiales.list(),
    queryFn: () => getAllMateriales().then(res => res.data || []),
    staleTime: STALE_TIMES.materiales,
  })
}

/**
 * All tamaños de materiales.
 * staleTime: materiales (15 min)
 */
export function useTamanos() {
  return useQuery({
    queryKey: QUERY_KEYS.materiales.tamanos(),
    queryFn: () => getAllTamanos().then(res => res.data || []),
    staleTime: STALE_TIMES.materiales,
  })
}

/**
 * All espesores de materiales.
 * staleTime: materiales (15 min)
 */
export function useEspesores() {
  return useQuery({
    queryKey: QUERY_KEYS.materiales.espesores(),
    queryFn: () => getAllEspesores().then(res => res.data || []),
    staleTime: STALE_TIMES.materiales,
  })
}

/**
 * All proveedores.
 * staleTime: materiales (15 min)
 */
export function useProveedores() {
  return useQuery({
    queryKey: QUERY_KEYS.materiales.proveedores(),
    queryFn: () => getAllProveedores().then(res => res.data || []),
    staleTime: STALE_TIMES.materiales,
  })
}

// ============================================================
// PROMOCIONES
// ============================================================

/**
 * Active promociones — catalog/public context.
 * staleTime: promociones (5 min)
 */
export function usePromocionesActivas() {
  return useQuery({
    queryKey: QUERY_KEYS.promociones.activas(),
    queryFn: getPromocionesActivas,
    staleTime: STALE_TIMES.promociones,
  })
}

// ============================================================
// PEDIDOS CATÁLOGO
// ============================================================

/**
 * All pedidos catálogo — admin context.
 * staleTime: pedidos (0 — never cache)
 */
export function usePedidosCatalogo() {
  return useQuery({
    queryKey: QUERY_KEYS.pedidos.catalogo(),
    queryFn: () => getAllPedidosCatalogo().then(res => res.data || []),
    staleTime: STALE_TIMES.pedidos,
  })
}

/**
 * Single pedido catálogo by ID.
 * staleTime: pedidos (0 — never cache)
 * Disabled when id is falsy.
 */
export function usePedidoCatalogoById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.pedidos.byId(id),
    queryFn: () => getPedidoCatalogoById(id).then(res => res.data),
    staleTime: STALE_TIMES.pedidos,
    enabled: !!id,
  })
}

// ============================================================
// CATEGORÍAS
// ============================================================

/**
 * Categorías activas — catálogo público.
 * staleTime: 15 min (reference data, changes rarely)
 */
export function useCategorias() {
  return useQuery({
    queryKey: QUERY_KEYS.categorias.list(),
    queryFn: async () => {
      const { data, error } = await getCategoriasPublicas()
      if (error) throw error
      return data || []
    },
    staleTime: STALE_TIMES.categorias,
  })
}

/**
 * Todas las categorías — admin.
 * staleTime: 15 min
 */
export function useCategoriasAdmin() {
  return useQuery({
    queryKey: [...QUERY_KEYS.categorias.list(), 'admin'],
    queryFn: async () => {
      const { data, error } = await getCategoriasAdmin()
      if (error) throw error
      return data || []
    },
    staleTime: STALE_TIMES.categorias,
  })
}
