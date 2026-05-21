// POST /api/admin/logout
// Clears the httpOnly admin session cookie `kond-admin-session`.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear the cookie by setting Max-Age=0 and empty value
  const isProd = process.env.NODE_ENV === 'production'
  const secure = isProd ? '; Secure' : ''

  // Important: HttpOnly cookie must be cleared from the server side
  res.setHeader('Set-Cookie', `kond-admin-session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`)

  return res.status(200).json({ ok: true })
}
