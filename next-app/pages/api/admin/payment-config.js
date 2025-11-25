import { supabaseAdmin } from '../../../utils/supabaseClient'

const DEFAULT_CONFIG = {
  transferencia: { enabled: true, alias: '', cbu: '', titular: '', banco: '' },
  whatsapp: { enabled: true, numero: '', mensaje: '' },
  retiro: { enabled: true, direccion: '', horarios: '' }
}

export default async function handler(req, res) {
  try {
    const supabase = supabaseAdmin()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('payment_config').select('config').single()
      if (error) {
        // Si no existe, devolver default
        return res.status(200).json({ config: DEFAULT_CONFIG })
      }

      return res.status(200).json({ config: data?.config || DEFAULT_CONFIG })
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const config = req.body?.config
      if (!config) return res.status(400).json({ success: false, error: 'Missing config in body' })

      // Verificar si existe registro
      const { data: existing, error: fetchError } = await supabase.from('payment_config').select('id').single()
      if (fetchError && fetchError.code !== 'PGRST116') {
        return res.status(500).json({ success: false, error: fetchError.message || String(fetchError) })
      }

      if (existing) {
        const { error } = await supabase.from('payment_config').update({ config, updated_at: new Date().toISOString() }).eq('id', existing.id)
        if (error) return res.status(500).json({ success: false, error: error.message || String(error) })
        return res.status(200).json({ success: true })
      }

      const { error } = await supabase.from('payment_config').insert([{ config, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      if (error) return res.status(500).json({ success: false, error: error.message || String(error) })
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error('API /api/admin/payment-config error:', err)
    return res.status(500).json({ success: false, error: err?.message || String(err) })
  }
}
