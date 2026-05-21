// next-app/pages/api/admin/redirections.js
import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'
import { verifyAdminCookie } from '../../../utils/verifyAdminCookie'

export default async function handler(req, res) {
  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  const supabase = supabaseAdmin()

  if (req.method === 'GET') {
    const limit = parseInt(req.query.limit || '10', 10)
    const { data, error } = await supabase
      .from('redirections')
      .select('id, from_path, to_path, type, active, created_at')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return res.status(500).json({ success: false, error: error.message })
    return res.status(200).json({ redirections: data || [] })
  }

  if (req.method === 'POST') {
    const { from_path, to_path, type = '301' } = req.body || {}
    if (!from_path?.trim() || !to_path?.trim())
      return res.status(400).json({ success: false, error: 'from_path and to_path are required' })
    if (!['301', '302'].includes(type))
      return res.status(400).json({ success: false, error: 'type must be 301 or 302' })
    const { error } = await supabase.from('redirections').insert([{
      from_path: from_path.trim(),
      to_path: to_path.trim(),
      type,
      tenant_id: TENANT_ID,
      active: true,
    }])
    if (error) return res.status(500).json({ success: false, error: error.message })
    return res.status(201).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ success: false, error: 'id is required' })
    const { error } = await supabase.from('redirections')
      .delete().eq('id', id).eq('tenant_id', TENANT_ID)
    if (error) return res.status(500).json({ success: false, error: error.message })
    return res.status(200).json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
