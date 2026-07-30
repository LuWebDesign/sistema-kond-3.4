import { supabaseAdmin } from '../../utils/supabaseClient'
import { TENANT_ID } from '../../lib/tenant'

const DEFAULT_CONFIG = {
  transferencia: { enabled: true, alias: '', cbu: '', titular: '', banco: '' },
  whatsapp: { enabled: true, numero: '', mensaje: '' },
  retiro: { enabled: true, direccion: '', direccionLink: '', horarios: '' },
}

/**
 * GET /api/payment-config
 * Public endpoint — no auth required.
 * Returns payment config for the current tenant (used by checkout & public pages).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase.from('payment_config').select('config').eq('tenant_id', TENANT_ID).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(200).json({ config: DEFAULT_CONFIG })
      }
      console.error('[public payment-config] Error:', error)
      return res.status(200).json({ config: DEFAULT_CONFIG })
    }

    return res.status(200).json({ config: data?.config || DEFAULT_CONFIG })
  } catch (err) {
    console.error('[public payment-config] Exception:', err)
    return res.status(200).json({ config: DEFAULT_CONFIG })
  }
}
