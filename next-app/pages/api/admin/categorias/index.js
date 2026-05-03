// API Route: Admin — Categorías
// GET  /api/admin/categorias  → lista todas las categorías (parent_id NULLS FIRST, nombre ASC)
// POST /api/admin/categorias  → crea nueva categoría (admin auth requerida)

import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { slugify } from '../../../../utils/slugify'

const ADMIN_SECRET = process.env.ADMIN_API_SECRET

/**
 * Verifica que el request incluya el header x-admin-secret válido.
 * Retorna true si la autenticación pasa.
 *
 * Nota: los admin routes existentes del proyecto no implementan auth
 * server-side (la protección es front-end via localStorage). Este guard
 * usa ADMIN_API_SECRET como mecanismo server-side opcional; si la variable
 * no está definida, se permite el acceso (comportamiento compatible con el
 * resto de las rutas admin existentes).
 */
function isAdminAuthorized(req) {
  if (!ADMIN_SECRET) return true // compatible con rutas admin existentes sin auth
  return req.headers['x-admin-secret'] === ADMIN_SECRET
}

export default async function handler(req, res) {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const supabase = supabaseAdmin()

  // ── GET: listar todas las categorías ──
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nombre, slug, parent_id, activa, orden, created_at')
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('nombre', { ascending: true })

    if (error) {
      console.error('GET /api/admin/categorias error:', error)
      return res.status(500).json({ error: error.message || 'Error interno' })
    }

    return res.status(200).json({ data })
  }

  // ── POST: crear categoría ──
  if (req.method === 'POST') {
    const { nombre, parent_id = null, orden = 0 } = req.body || {}

    // Validación: nombre requerido
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El campo nombre es requerido' })
    }

    // Validación de profundidad máxima (max 1 nivel)
    if (parent_id !== null && parent_id !== undefined) {
      const { data: padre, error: padreError } = await supabase
        .from('categorias')
        .select('id, parent_id')
        .eq('id', parent_id)
        .single()

      if (padreError || !padre) {
        return res.status(400).json({ error: 'El parent_id indicado no existe' })
      }

      if (padre.parent_id !== null) {
        return res.status(400).json({
          error: 'Profundidad máxima excedida: el padre indicado ya es una subcategoría (max 1 nivel)'
        })
      }
    }

    // Generar slug
    const slug = slugify(nombre.trim())

    if (!slug) {
      return res.status(400).json({ error: 'El nombre no produce un slug válido' })
    }

    // Verificar unicidad del slug
    const { data: existing } = await supabase
      .from('categorias')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: `Ya existe una categoría con el slug "${slug}"` })
    }

    // Insertar
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nombre: nombre.trim(), slug, parent_id: parent_id ?? null, orden }])
      .select('id, nombre, slug, parent_id, activa, orden, created_at')
      .single()

    if (error) {
      console.error('POST /api/admin/categorias error:', error)
      if (error.code === '23505') {
        return res.status(409).json({ error: `Ya existe una categoría con el slug "${slug}"` })
      }
      return res.status(500).json({ error: error.message || 'Error interno' })
    }

    return res.status(201).json({ data })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: `Método ${req.method} no permitido` })
}
