// API Route: Admin — Categoría por ID
// GET    /api/admin/categorias/[id]  → obtener categoría
// PUT    /api/admin/categorias/[id]  → actualizar categoría
// DELETE /api/admin/categorias/[id]  → eliminar (409 si tiene productos o subcategorías)

import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { slugify } from '../../../../utils/slugify'

const ADMIN_SECRET = process.env.ADMIN_API_SECRET

function isAdminAuthorized(req) {
  if (!ADMIN_SECRET) return true
  return req.headers['x-admin-secret'] === ADMIN_SECRET
}

export default async function handler(req, res) {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const supabase = supabaseAdmin()
  const { id } = req.query

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  const categoriaId = Number(id)

  // ── GET: obtener por id ──
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nombre, slug, parent_id, activa, orden, created_at')
      .eq('id', categoriaId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Categoría no encontrada' })
      }
      console.error(`GET /api/admin/categorias/${id} error:`, error)
      return res.status(500).json({ error: error.message || 'Error interno' })
    }

    return res.status(200).json({ data })
  }

  // ── PUT: actualizar ──
  if (req.method === 'PUT') {
    const { nombre, parent_id, activa, orden } = req.body || {}
    const updateData = {}

    // Leer fila actual para comparar
    const { data: current, error: fetchError } = await supabase
      .from('categorias')
      .select('id, nombre, slug, parent_id')
      .eq('id', categoriaId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Categoría no encontrada' })
      }
      return res.status(500).json({ error: fetchError.message || 'Error interno' })
    }

    // Actualizar nombre y re-generar slug si cambió
    if (nombre !== undefined) {
      if (!nombre.trim()) {
        return res.status(400).json({ error: 'El campo nombre no puede estar vacío' })
      }
      updateData.nombre = nombre.trim()

      if (nombre.trim() !== current.nombre) {
        const newSlug = slugify(nombre.trim())
        if (!newSlug) {
          return res.status(400).json({ error: 'El nombre no produce un slug válido' })
        }

        // Verificar unicidad del nuevo slug (excluyendo el propio registro)
        const { data: slugConflict } = await supabase
          .from('categorias')
          .select('id')
          .eq('slug', newSlug)
          .neq('id', categoriaId)
          .maybeSingle()

        if (slugConflict) {
          return res.status(409).json({ error: `Ya existe una categoría con el slug "${newSlug}"` })
        }

        updateData.slug = newSlug
      }
    }

    // Actualizar parent_id con validación de profundidad
    if (parent_id !== undefined) {
      if (parent_id !== null) {
        if (parent_id === categoriaId) {
          return res.status(400).json({ error: 'Una categoría no puede ser su propio padre' })
        }

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
      updateData.parent_id = parent_id
    }

    if (activa !== undefined) updateData.activa = activa
    if (orden !== undefined) updateData.orden = orden

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('categorias')
      .update(updateData)
      .eq('id', categoriaId)
      .select('id, nombre, slug, parent_id, activa, orden, created_at')
      .single()

    if (error) {
      console.error(`PUT /api/admin/categorias/${id} error:`, error)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese slug' })
      }
      return res.status(500).json({ error: error.message || 'Error interno' })
    }

    return res.status(200).json({ data })
  }

  // ── DELETE ──
  if (req.method === 'DELETE') {
    // Guard 1: verificar si hay productos con esta categoria_id
    const { count: productCount, error: prodError } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('categoria_id', categoriaId)

    if (prodError) {
      console.error(`DELETE /api/admin/categorias/${id} — check productos error:`, prodError)
      return res.status(500).json({ error: prodError.message || 'Error interno' })
    }

    if (productCount > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: ${productCount} producto${productCount === 1 ? '' : 's'} asignado${productCount === 1 ? '' : 's'} a esta categoría`
      })
    }

    // Guard 2: verificar si tiene subcategorías
    const { count: subCount, error: subError } = await supabase
      .from('categorias')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', categoriaId)

    if (subError) {
      console.error(`DELETE /api/admin/categorias/${id} — check subcategorias error:`, subError)
      return res.status(500).json({ error: subError.message || 'Error interno' })
    }

    if (subCount > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: esta categoría tiene ${subCount} subcategoría${subCount === 1 ? '' : 's'}. Eliminá las subcategorías primero.`
      })
    }

    // Eliminar
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', categoriaId)

    if (error) {
      console.error(`DELETE /api/admin/categorias/${id} error:`, error)
      return res.status(500).json({ error: error.message || 'Error interno' })
    }

    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  return res.status(405).json({ error: `Método ${req.method} no permitido` })
}
