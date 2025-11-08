import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

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
