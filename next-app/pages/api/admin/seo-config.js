// next-app/pages/api/admin/seo-config.js
import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'
import { verifyAdminCookie } from '../../../utils/verifyAdminCookie'

export const DEFAULT_SEO_CONFIG = {
  // ── General ──────────────────────────────────────────────────────────────────
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
  sitemapLastGenerated: null,
  sitemapUrlCount: null,
  // ── Home ─────────────────────────────────────────────────────────────────────
  homeSeoTitle: '',
  homeSeoDescription: '',
  homeOgImage: '',
  homeOgImageAlt: '',
  homeSchemaEnabled: true,
  // ── Productos ────────────────────────────────────────────────────────────────
  productTitleTemplate: '{{nombre}} | {{sitio}}',
  productDescriptionTemplate: 'Comprá {{nombre}} al mejor precio. Envíos disponibles.',
  productSchemaEnabled: true,
  // ── Categorías ───────────────────────────────────────────────────────────────
  categoryTitleTemplate: '{{categoria}} — {{sitio}}',
  categoryDescriptionTemplate: 'Explorá todos los productos de {{categoria}} en {{sitio}}.',
  categorySchemaEnabled: true,
  // ── Páginas estáticas ────────────────────────────────────────────────────────
  pagesSeo: {},
  // ── Técnico ──────────────────────────────────────────────────────────────────
  ogEnabled: true,
  twitterCardEnabled: true,
  twitterCardType: 'summary_large_image',
  twitterHandle: '',
  schemaOrganizationEnabled: true,
  schemaBreadcrumbEnabled: true,
  canonicalStrategy: 'auto',
  hreflangEnabled: false,
  noindexPaths: '/admin/\n/api/\n/carrito/\n/checkout/',
}

export default async function handler(req, res) {
  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  if (!['GET', 'POST', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  try {
    const supabase = supabaseAdmin()
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('seo_config')
        .select('config')
        .eq('tenant_id', TENANT_ID)
        .single()
      if (error) return res.status(200).json({ config: DEFAULT_SEO_CONFIG })
      return res.status(200).json({ config: { ...DEFAULT_SEO_CONFIG, ...(data?.config || {}) } })
    }
    const incoming = req.body?.config
    if (!incoming || typeof incoming !== 'object')
      return res.status(400).json({ success: false, error: 'Missing or invalid config' })

    const { data: existing, error: fetchError } = await supabase
      .from('seo_config').select('id').eq('tenant_id', TENANT_ID).single()
    if (fetchError && fetchError.code !== 'PGRST116')
      return res.status(500).json({ success: false, error: fetchError.message })

    const now = new Date().toISOString()
    if (existing) {
      const { error } = await supabase.from('seo_config')
        .update({ config: incoming, updated_at: now })
        .eq('id', existing.id).eq('tenant_id', TENANT_ID)
      if (error) return res.status(500).json({ success: false, error: error.message })
    } else {
      const { error } = await supabase.from('seo_config')
        .insert([{ config: incoming, tenant_id: TENANT_ID, created_at: now, updated_at: now }])
      if (error) return res.status(500).json({ success: false, error: error.message })
    }
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[seo-config]', err)
    return res.status(500).json({ success: false, error: err?.message || String(err) })
  }
}
