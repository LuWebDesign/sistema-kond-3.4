import { supabaseAdmin } from '../../../utils/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.query
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .eq('cliente_email', email)
      .order('fecha_creacion', { ascending: false })

    if (error) throw error
    return res.status(200).json({ data })
  } catch (error) {
    console.error('Error obteniendo pedidos por email:', error)
    return res.status(500).json({ error: error.message || 'Error interno' })
  }
}
