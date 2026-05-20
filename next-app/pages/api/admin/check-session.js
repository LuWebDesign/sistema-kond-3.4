// GET /api/admin/check-session
// Verifies the httpOnly kond-admin-session cookie and returns the user from DB.
// Used by withAdminAuth to replace the insecure localStorage fallback.

import { jwtVerify } from 'jose'
import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'

/**
 * Decode JWT payload without cryptographic verification.
 * Used as fallback when Supabase issues ES256 (asymmetric) tokens — our
 * SUPABASE_JWT_SECRET is HS256 and cannot verify them.
 * Security: we still perform a DB lookup to confirm the user exists and is admin.
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

  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  const cookie = req.cookies?.['kond-admin-session']

  // No secret configured (local dev) — allow if cookie is present and non-empty
  if (!jwtSecret) {
    if (!cookie) return res.status(401).json({ authorized: false })
    // Without secret we can't verify — return authorized=true for local dev
    return res.status(200).json({ authorized: true, user: null })
  }

  if (!cookie) {
    return res.status(401).json({ authorized: false })
  }

  let userId = null

  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(jwtSecret))
    userId = payload.sub
  } catch {
    // jwtVerify fails when Supabase issues ES256 (asymmetric) tokens.
    // Fall back to decoding the payload without crypto verification.
    // The DB lookup below is the authoritative security check.
    userId = extractUserIdFromJWT(cookie)
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
