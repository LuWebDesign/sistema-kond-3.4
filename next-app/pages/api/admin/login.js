// POST /api/admin/login
// Rate limited: 5 attempts per IP per 15 minutes
import { supabase, supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const attempts = new Map() // ip -> { count, windowStart }

function getRateLimitKey(req) {
  const forwarded = req.headers['x-forwarded-for']
  return (forwarded ? forwarded.split(',')[0] : req.socket?.remoteAddress) || 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const ip = getRateLimitKey(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' })
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const { data: usuario, error: fetchError } = await supabaseAdmin()
      .from('usuarios')
      .select('id, email, username, rol, nombre, apellido')
      .eq('id', authData.user.id)
      .eq('tenant_id', TENANT_ID)
      .single()

    if (fetchError || !usuario) {
      await supabase.auth.signOut()
      return res.status(401).json({ error: 'User not found' })
    }

    if (usuario.rol !== 'admin' && usuario.rol !== 'super_admin') {
      await supabase.auth.signOut()
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    // Set httpOnly cookie with Supabase JWT for Edge middleware validation
    const jwt = authData.session?.access_token
    if (jwt) {
      const isProd = process.env.NODE_ENV === 'production'
      res.setHeader('Set-Cookie', [
        `kond-admin-session=${jwt}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax${isProd ? '; Secure' : ''}`
      ])
    }

    return res.status(200).json({
      user: {
        id: usuario.id,
        email: usuario.email,
        username: usuario.username,
        rol: usuario.rol,
        nombre: usuario.nombre || 'Admin',
        apellido: usuario.apellido || '',
        isAdmin: true
      }
    })
  } catch (err) {
    console.error('[/api/admin/login]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
