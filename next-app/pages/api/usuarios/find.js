import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Lazy init: evitamos throw en import si faltan env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server not configured: missing Supabase env vars' })
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  let username

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    username = body?.username?.trim()
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  if (!username) {
    return res.status(400).json({ error: 'username is required' })
  }

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, username, rol, telefono, direccion, localidad, provincia, apellido, email')
    .eq('username', username)
    .single()

  if (error) {
    console.error('Error fetching usuario by username:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  return res.status(200).json({ user: data })
}
