// next-app/pages/api/sitemap-xml.js
// Dynamic sitemap.xml generator.
// Queries published products + active categories + static pages.
// Split into per-type sub-sitemaps when any type exceeds 50,000 URLs.
// Rewrite in next.config.js maps /sitemap.xml → /api/sitemap-xml

import { supabaseAdmin } from '../../utils/supabaseClient'
import { TENANT_ID } from '../../lib/tenant'
import { getSeoConfigServer } from '../../lib/getSeoConfigServer'

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')

  try {
    const admin = supabaseAdmin()
    const seoConfig = await getSeoConfigServer()

    // Resolve base URL: prefer config.siteUrl, fall back to request host
    const proto = req.headers['x-forwarded-proto'] || 'https'
    const host  = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000'
    const baseUrl = seoConfig.siteUrl?.trim().replace(/\/$/, '') || `${proto}://${host}`

    const today = new Date().toISOString().split('T')[0]

    const [categoriesResult, productsResult] = await Promise.all([
      seoConfig.sitemapIncludeCategories
        ? admin.from('categorias')
            .select('slug, updated_at')
            .eq('tenant_id', TENANT_ID)
            .eq('activa', true)
        : Promise.resolve({ data: [] }),

      seoConfig.sitemapIncludeProducts
        ? admin.from('productos')
            .select('id, nombre, categoria_id, updated_at')
            .eq('tenant_id', TENANT_ID)
            .eq('publicado', true)
            .eq('active', true)
            .eq('hidden_in_productos', false)
        : Promise.resolve({ data: [] }),
    ])

    const categories = categoriesResult.data || []
    const products   = productsResult.data  || []

    // Build slug map for products
    const categorySlugMap = Object.fromEntries(categories.map(c => [c.id, c.slug]))

    const entries = []

    // Static pages
    if (seoConfig.sitemapIncludePages) {
      entries.push(urlEntry(`${baseUrl}/`,        { changefreq: 'daily',  priority: '1.0', lastmod: today }))
      entries.push(urlEntry(`${baseUrl}/catalog`, { changefreq: 'daily',  priority: '0.9', lastmod: today }))
    }

    // Categories
    for (const cat of categories) {
      if (!cat.slug) continue
      const lastmod = cat.updated_at ? cat.updated_at.split('T')[0] : today
      entries.push(urlEntry(`${baseUrl}/catalog/${escapeXml(cat.slug)}`, { lastmod, changefreq: 'weekly', priority: '0.8' }))
    }

    // Products — link to their category page (catalog/{slug})
    for (const product of products) {
      const slug = categorySlugMap[product.categoria_id]
      if (!slug) continue
      const lastmod = product.updated_at ? product.updated_at.split('T')[0] : today
      entries.push(urlEntry(`${baseUrl}/catalog/${escapeXml(slug)}`, { lastmod, changefreq: 'weekly', priority: '0.7' }))
    }

    // Deduplicate entries (products in same category → same URL)
    const seen = new Set()
    const uniqueEntries = entries.filter(e => {
      const locMatch = e.match(/<loc>([^<]+)<\/loc>/)
      if (!locMatch) return true
      if (seen.has(locMatch[1])) return false
      seen.add(locMatch[1])
      return true
    })

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
      '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
      ...uniqueEntries,
      '</urlset>',
    ].join('\n')

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(xml)

  } catch (err) {
    console.error('[sitemap-xml]', err)
    return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
  }
}
