// next-app/pages/api/robots-txt.js
// Serves robots.txt content from seo_config DB row.
// Rewrite in next.config.js maps /robots.txt → /api/robots-txt

import { getSeoConfigServer } from '../../lib/getSeoConfigServer'

const FALLBACK_ROBOTS = `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /api/
Disallow: /carrito/
Disallow: /*?
`

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')
  try {
    const config = await getSeoConfigServer()
    const content = config.robotsTxt?.trim() || FALLBACK_ROBOTS
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    // Cache 1 hour at edge/CDN, revalidate in background
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(content)
  } catch {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(200).send(FALLBACK_ROBOTS)
  }
}
