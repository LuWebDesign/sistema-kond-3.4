// utils/verifyAdminCookie.js
// Shared helper for admin API routes — verifies the kond-admin-session httpOnly
// cookie using Supabase JWKS (ES256). Returns the userId (sub) if valid, null otherwise.
// For local dev without NEXT_PUBLIC_SUPABASE_URL the check is skipped (returns 'local-dev').

import { jwtVerify, createRemoteJWKSet } from 'jose'

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
 * Verifies the kond-admin-session httpOnly cookie.
 * @param {import('next').NextApiRequest} req
 * @returns {Promise<string|null>} userId (sub) if valid, null if invalid/absent,
 *   or 'local-dev' if SUPABASE_URL is not configured.
 */
export async function verifyAdminCookie(req) {
  const cookie = req.cookies?.['kond-admin-session']
  if (!cookie) return null

  const jwks = getJWKS()
  if (!jwks) return 'local-dev' // local dev without .env.local — skip gate

  try {
    const { payload } = await jwtVerify(cookie, jwks)
    return payload.sub || null
  } catch {
    return null
  }
}
