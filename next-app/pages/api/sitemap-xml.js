// next-app/pages/api/sitemap-xml.js
// Dynamic sitemap.xml generator.
// Queries published products + active categories + static pages.
// Split into per-type sub-sitemaps when any type exceeds 50,000 URLs.
// Rewrite in next.config.js maps /sitemap.xml → /api/sitemap-xml

import { supabaseAdmin } from '../../utils/supabaseClient'
import { getSeoConfigServer } from '../../lib/getSeoConfigServer'
import { getSitemapUrls } from '../../lib/sitemapUrls'

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

    const sitemapUrls = await getSitemapUrls(admin, {
      includeCategories: seoConfig.sitemapIncludeCategories,
      includeProducts: seoConfig.sitemapIncludeProducts,
      includePages: seoConfig.sitemapIncludePages,
    })
    const uniqueEntries = sitemapUrls.map(({ path, updatedAt, metadata }) => urlEntry(
      `${baseUrl}${path}`,
      { ...metadata, lastmod: updatedAt ? updatedAt.split('T')[0] : today }
    ))

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
