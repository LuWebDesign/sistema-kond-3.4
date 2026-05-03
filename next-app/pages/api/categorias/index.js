// API Route: Pública — Categorías
// GET /api/categorias  → lista categorías activas (sin auth)

import { supabaseAdmin } from '../../../utils/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Método ${req.method} no permitido` })
  }

  try {
    const supabase = supabaseAdmin()

    const { data, error } = await supabase
      .from('categorias')
      .select('id, nombre, slug, parent_id, activa, orden, created_at')
      .eq('activa', true)
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('nombre', { ascending: true })

    if (error) {
      console.error('GET /api/categorias error:', error)
      return res.status(500).json({ error: error.message || 'Error interno' })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ data })
  } catch (err) {
    console.error('GET /api/categorias unexpected error:', err)
    return res.status(500).json({ error: err?.message || 'Error interno' })
  }
}
