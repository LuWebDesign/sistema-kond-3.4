import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server not configured: missing Supabase env vars' })
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing user id' })
  }

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, username, rol, telefono, direccion, localidad, provincia, apellido, email')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching usuario by id:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  return res.status(200).json({ user: data })
}
