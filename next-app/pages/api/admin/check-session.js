// GET /api/admin/check-session
// Verifies the httpOnly kond-admin-session cookie and returns the user from DB.
// Used by withAdminAuth to replace the insecure localStorage fallback.

import { jwtVerify } from 'jose'
import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'

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

  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(jwtSecret))
    const userId = payload.sub

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
  } catch {
    return res.status(401).json({ authorized: false })
  }
}
