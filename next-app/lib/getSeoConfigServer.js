// next-app/lib/getSeoConfigServer.js
// Server-side SEO config loader with module-level cache (5 min TTL).
// Intentionally NOT exported as a React hook — server-only utility.

import { supabaseAdmin } from '../utils/supabaseClient'
import { TENANT_ID } from './tenant'

const DEFAULT_SEO_CONFIG = {
  siteTitle: '',
  siteDescription: '',
  keywords: '',
  siteUrl: '',
  language: 'es',
  indexSite: true,
  followLinks: true,
  canonicalUrl: '',
  googleSearchConsole: '',
  googleAnalytics: '',
  bingWebmaster: '',
  yandexWebmaster: '',
  pinterestVerification: '',
  facebookDomainVerification: '',
  robotsTxt: 'User-agent: *\nAllow: /\n\nDisallow: /admin/\nDisallow: /api/\nDisallow: /carrito/\nDisallow: /*?\n\nSitemap: https://tu-sitio.com/sitemap.xml',
  sitemapIncludeProducts: true,
  sitemapIncludeCategories: true,
  sitemapIncludePages: true,
  sitemapIncludeImages: false,
  sitemapIncludeBlogs: false,
}

let _cache = null
let _cacheExpiresAt = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getSeoConfigServer() {
  if (_cache && Date.now() < _cacheExpiresAt) return _cache
  try {
    const { data, error } = await supabaseAdmin()
      .from('seo_config')
      .select('config')
      .eq('tenant_id', TENANT_ID)
      .single()
    const config = error ? DEFAULT_SEO_CONFIG : { ...DEFAULT_SEO_CONFIG, ...(data?.config || {}) }
    _cache = config
    _cacheExpiresAt = Date.now() + CACHE_TTL
    return config
  } catch {
    return DEFAULT_SEO_CONFIG
  }
}

/** Call this after admin saves seo_config so next request gets fresh data */
export function invalidateSeoConfigCache() {
  _cache = null
  _cacheExpiresAt = 0
}

export { DEFAULT_SEO_CONFIG as SEO_DEFAULTS }
