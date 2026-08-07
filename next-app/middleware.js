// next-app/middleware.js
// Edge middleware for DB-driven redirections and admin JWT gate.
// Fetches from Supabase REST API (Edge-compatible).
// Cache: module-level, 5-min TTL per Edge instance.

import { NextResponse } from 'next/server'
import { jwtVerify, createRemoteJWKSet } from 'jose'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const VERIFIED_SEO_REDIRECTS = {
  '/productos': '/catalog',
  '/productos/': '/catalog',
  '/productos-navidenos': '/catalog/productos-navidenos',
  '/productos-navidenos/': '/catalog/productos-navidenos',
  '/juegos-y-juguetes': '/catalog/juegos-y-juguetes',
  '/juegos-y-juguetes/': '/catalog/juegos-y-juguetes',
  '/productos/exhibidor-repisa-autos-coleccion-para-28-autos-escala-143-vertical': '/catalog/escala-143/exhibidor-repisa-autos-coleccion-para-28-autos-escala-143-vertical',
  '/productos/exhibidor-repisa-autos-coleccion-para-28-autos-escala-143-vertical/': '/catalog/escala-143/exhibidor-repisa-autos-coleccion-para-28-autos-escala-143-vertical',
  '/productos/exhibidor-repisa-autos-coleccion-para-35-autos-escala-143': '/catalog/escala-143/exhibidor-repisa-autos-coleccion-para-35-autos-escala-143',
  '/productos/exhibidor-repisa-autos-coleccion-para-35-autos-escala-143/': '/catalog/escala-143/exhibidor-repisa-autos-coleccion-para-35-autos-escala-143',
  '/productos/exhibidor-repisa-autos-coleccion-para-70-autos-escala-143': '/catalog/escala-143/exhibidor-repisa-autos-coleccion-para-70-autos-escala-143',
  '/productos/exhibidor-repisa-autos-coleccion-para-70-autos-escala-143/': '/catalog/escala-143/exhibidor-repisa-autos-coleccion-para-70-autos-escala-143',
}

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

// Module-level JWKS cache — reused across requests within the same Edge instance
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

async function isValidAdminJWT(request) {
  const cookie = request.cookies.get('kond-admin-session')
  if (!cookie?.value) return false

  const jwks = getJWKS()
  if (!jwks) return true // no Supabase URL → skip gate (local dev without .env.local)

  try {
    await jwtVerify(cookie.value, jwks)
    return true
  } catch {
    return false
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  const seoDestination = VERIFIED_SEO_REDIRECTS[pathname]
  if (seoDestination) {
    const url = request.nextUrl.clone()
    url.pathname = seoDestination
    url.search = ''
    return NextResponse.redirect(url, { status: 301 })
  }

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
