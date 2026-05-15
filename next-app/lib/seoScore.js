// next-app/lib/seoScore.js
// Pluggable SEO score engine.
// Add new providers to PROVIDERS registry for future external integrations.

const DEFAULT_SCORES = { contenido: 0, tecnico: 0, usabilidad: 0, popularidad: 0, total: 0 }

function calcContenido(config) {
  let score = 0
  const { siteTitle = '', siteDescription = '', keywords = '' } = config
  if (siteTitle.trim()) {
    score += 30
    const len = siteTitle.trim().length
    if (len >= 40 && len <= 60) score += 10
  }
  if (siteDescription.trim()) {
    score += 30
    const len = siteDescription.trim().length
    if (len >= 120 && len <= 160) score += 10
  }
  if (keywords.trim()) score += 20
  return Math.min(score, 100)
}

function calcTecnico(config) {
  let score = 0
  if (config.indexSite !== false) score += 25
  if (config.canonicalUrl?.trim()) score += 20
  if (config.siteUrl?.trim()) score += 15
  if (config.googleSearchConsole?.trim()) score += 15
  if (config.googleAnalytics?.trim()) score += 15
  if (config.robotsTxt?.trim()) score += 10
  return Math.min(score, 100)
}

function calcUsabilidad(config) {
  let score = 0
  if (config.language?.trim()) score += 25
  if (config.followLinks !== false) score += 25
  try {
    if (config.siteUrl?.trim()) {
      const raw = config.siteUrl.trim()
      const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      if (!url.search) score += 25
    }
  } catch { /* invalid URL */ }
  const titleLen = config.siteTitle?.trim().length || 0
  if (titleLen >= 20 && titleLen <= 70) score += 25
  return Math.min(score, 100)
}

// ── Provider registry ─────────────────────────────────────────────────────────
// To add an external provider: PROVIDERS.gsc = (config, externalData) => { ... }
const PROVIDERS = {
  local: (config) => {
    const contenido   = calcContenido(config)
    const tecnico     = calcTecnico(config)
    const usabilidad  = calcUsabilidad(config)
    const popularidad = 0 // requires external integration (GSC, etc.)
    const total = Math.round((contenido + tecnico + usabilidad) / 3)
    return { contenido, tecnico, usabilidad, popularidad, total }
  },
  // future: gsc:       (config, externalData) => { ... },
  // future: pagespeed: (config, externalData) => { ... },
}

/**
 * Calculate SEO score.
 * @param {object} config - seo_config values
 * @param {string} [provider='local'] - provider key from PROVIDERS registry
 * @param {object|null} [externalData=null] - pre-computed scores from external API
 * @returns {{ contenido, tecnico, usabilidad, popularidad, total }}
 */
export function calculateSeoScore(config, provider = 'local', externalData = null) {
  if (!config) return DEFAULT_SCORES
  if (externalData) return { ...DEFAULT_SCORES, ...externalData }
  const fn = PROVIDERS[provider] ?? PROVIDERS.local
  try { return fn(config, externalData) } catch { return DEFAULT_SCORES }
}

export { DEFAULT_SCORES }
