import { supabaseAdmin } from '../../../utils/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.query
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  try {
    const supabase = supabaseAdmin()

    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page || '50', 10)))
    const start = (page - 1) * perPage
    const end = start + perPage - 1

    const baseCols = [
      'id', 'cliente_nombre', 'cliente_apellido', 'cliente_telefono', 'cliente_email',
      'cliente_direccion', 'fecha_creacion', 'total', 'metodo_pago', 'estado', 'comprobante_omitido'
    ]
    if (req.query.include_comprobante === '1') baseCols.push('comprobante_url')
    const pedidosCols = baseCols.join(',')

    const { data: pedidos, error, count } = await supabase
      .from('pedidos_catalogo')
      .select(pedidosCols, { count: 'exact' })
      .eq('cliente_email', email)
      .order('fecha_creacion', { ascending: false })
      .range(start, end)

    if (error) throw error

    // Cargar items por lote
    const pedidoIds = (pedidos || []).map(p => p.id).filter(Boolean)
    let items = []
    if (pedidoIds.length) {
      items = (await supabase
        .from('pedidos_catalogo_items')
        .select('id,pedido_catalogo_id,producto_id,producto_nombre,producto_precio,cantidad,medidas')
        .in('pedido_catalogo_id', pedidoIds)
        .order('id', { ascending: true })
      ).data || []
    }

    const pedidosMap = (pedidos || []).map(p => ({ ...p, items: items.filter(i => i.pedido_catalogo_id === p.id) }))

    return res.status(200).json({ data: pedidosMap, pagination: { page, perPage, total: count || (pedidos ? pedidos.length : 0) } })
  } catch (error) {
    console.error('Error obteniendo pedidos por email:', error)
    return res.status(500).json({ error: error.message || 'Error interno' })
  }
}
