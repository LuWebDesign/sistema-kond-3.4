// next-app/pages/api/admin/productos/[id].js
// PUT /api/admin/productos/:id  — update a single product (admin only)
// Currently supports: toggling `featured`

import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { TENANT_ID } from '../../../../lib/tenant'
import { verifyAdminCookie } from '../../../../utils/verifyAdminCookie'

export default async function handler(req, res) {
  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.query
  const { featured } = req.body || {}

  if (typeof featured !== 'boolean') {
    return res.status(400).json({ success: false, error: '`featured` must be a boolean' })
  }

  try {
    const supabase = supabaseAdmin()

    const { error } = await supabase
      .from('productos')
      .update({ featured })
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)

    if (error) {
      console.error('[admin/productos/[id]] Supabase error:', error)
      return res.status(500).json({ success: false, error: error.message || String(error) })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[admin/productos/[id]] Error:', err)
    return res.status(500).json({ success: false, error: err?.message || String(err) })
  }
}
