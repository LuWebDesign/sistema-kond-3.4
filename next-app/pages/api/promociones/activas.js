import { TENANT_ID } from '../../../lib/tenant'
import { supabaseAdmin } from '../../../utils/supabaseClient'

const PROMO_SELECT = 'id, nombre, tipo, valor, aplica_a, categoria, producto_id, fecha_inicio, fecha_fin, activo, prioridad, badge_texto, badge_color, badge_opacity, badge_text_color, descuento_porcentaje, descuento_monto, precio_especial, config, created_at, updated_at'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('promociones')
      .select(PROMO_SELECT)
      .eq('tenant_id', TENANT_ID)
      .eq('activo', true)
      .order('prioridad', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ data: data || [] })
  } catch (error) {
    console.error('[promociones/activas] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
