// next-app/middleware.js
// Edge middleware for DB-driven redirections and admin JWT gate.
// Fetches from Supabase REST API (Edge-compatible).
// Cache: module-level, 5-min TTL per Edge instance.

import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Module-level cache — persists across requests within the same Edge instance
let _redirectionsCache = []
let _cacheExpiresAt    = 0

async function getRedirections() {
  if (Date.now() < _cacheExpiresAt) return _redirectionsCache

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const tenantId    = process.env.NEXT_PUBLIC_TENANT_ID

  // Abort early if env vars not set (local dev without .env.local)
  if (!supabaseUrl || !serviceKey || !tenantId) return _redirectionsCache

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/redirections` +
      `?tenant_id=eq.${tenantId}&active=eq.true` +
      `&select=from_path,to_path,type&limit=500&order=created_at.desc`,
      {
        headers: {
          apikey:        serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    if (res.ok) {
      _redirectionsCache = await res.json()
      _cacheExpiresAt    = Date.now() + CACHE_TTL
    }
  } catch {
    // On error: extend stale cache by 1 minute to avoid hammering DB
    _cacheExpiresAt = Date.now() + 60_000
  }

  return _redirectionsCache
}

async function isValidAdminJWT(request) {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret) return false // local dev without secret = open (acceptable)

  const cookie = request.cookies.get('kond-admin-session')
  if (!cookie?.value) return false

  try {
    await jwtVerify(cookie.value, new TextEncoder().encode(jwtSecret))
    return true
  } catch {
    return false
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Admin JWT gate — all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const valid = await isValidAdminJWT(request)
    if (!valid) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // Existing DB-driven redirections (non-admin paths only)
  const redirections = await getRedirections()
  const match = redirections.find(r => r.from_path === pathname)

  if (match) {
    const url = request.nextUrl.clone()
    url.pathname = match.to_path
    return NextResponse.redirect(url, {
      status: Number(match.type) || 301,
    })
  }

  return NextResponse.next()
}

// Run on all non-api, non-static paths (includes /admin for JWT gate)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2)).*)',
  ],
}
