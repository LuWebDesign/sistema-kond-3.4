// next-app/utils/supabaseCategorias.js
// Utilidades de acceso a datos para la tabla `categorias`.

import { supabase } from './supabaseClient'

const COLUMNS = 'id, nombre, slug, parent_id, activa, orden'

/**
 * Obtiene categorías activas (uso público / catálogo).
 * Usa el cliente anon — RLS permite SELECT donde activa = true.
 */
export async function getCategoriasPublicas() {
  if (!supabase) return { data: [], error: null }
  return supabase
    .from('categorias')
    .select(COLUMNS)
    .eq('activa', true)
    .order('parent_id', { ascending: true, nullsFirst: true })
    .order('nombre', { ascending: true })
}

/**
 * Obtiene todas las categorías (uso admin).
 * Requiere que ADMIN_API_SECRET permita el acceso a /api/admin/categorias,
 * o que la RLS lo autorice. Llama a la API route para usar service role.
 */
export async function getCategoriasAdmin() {
  const res = await fetch('/api/admin/categorias')
  if (!res.ok) throw new Error(`GET /api/admin/categorias → ${res.status}`)
  const json = await res.json()
  return { data: json.data || [], error: null }
}
