// GET /api/admin/check-session
// Verifies the httpOnly kond-admin-session cookie via Supabase JWKS and returns the user from DB.
// Used by withAdminAuth to confirm admin identity server-side.

import { jwtVerify, createRemoteJWKSet } from 'jose'
import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'

// Module-level JWKS cache — reused across warm Lambda instances
let _jwks = null
function getJWKS() {
  if (!_jwks) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null
    _jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    )
  }
  return _jwks
}

/**
 * Decode JWT payload without cryptographic verification.
 * Used only as local-dev fallback when NEXT_PUBLIC_SUPABASE_URL is not set.
 */
function extractUserIdFromJWT(jwt) {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload.sub || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ authorized: false, error: 'Method not allowed' })
  }

  const cookie = req.cookies?.['kond-admin-session']
  if (!cookie) {
    return res.status(401).json({ authorized: false })
  }

  let userId = null
  const jwks = getJWKS()

  if (!jwks) {
    // Local dev without .env.local — decode without verification
    userId = extractUserIdFromJWT(cookie)
    if (!userId) return res.status(401).json({ authorized: false })
  } else {
    try {
      const { payload } = await jwtVerify(cookie, jwks)
      userId = payload.sub
    } catch {
      return res.status(401).json({ authorized: false })
    }
  }

  if (!userId) {
    return res.status(401).json({ authorized: false })
  }

  const { data: usuario, error } = await supabaseAdmin()
    .from('usuarios')
    .select('id, email, username, rol, nombre, apellido')
    .eq('id', userId)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (error || !usuario) {
    return res.status(401).json({ authorized: false })
  }

  if (usuario.rol !== 'admin' && usuario.rol !== 'super_admin') {
    return res.status(403).json({ authorized: false })
  }

  return res.status(200).json({
    authorized: true,
    user: {
      id: usuario.id,
      email: usuario.email,
      username: usuario.username,
      rol: usuario.rol,
      nombre: usuario.nombre || 'Admin',
      apellido: usuario.apellido || '',
      isAdmin: true,
    },
  })
}
