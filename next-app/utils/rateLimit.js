// utils/rateLimit.js
// Simple in-memory sliding-window rate limiter for Next.js API routes.
//
// NOTE: Vercel runs serverless functions — each cold start resets the in-memory
// state. This limiter is effective on warm instances and provides meaningful
// protection against bursts, but is not a substitute for edge-level rate limiting
// on sustained attacks. It requires zero external dependencies.

const counters = new Map()

/**
 * Creates a rate limiter check function.
 * @param {{ maxRequests?: number, windowMs?: number }} options
 * @returns {(ip: string) => { allowed: boolean, retryAfter?: number }}
 */
export function rateLimit({ maxRequests = 20, windowMs = 60_000 } = {}) {
  return function check(ip) {
    const now = Date.now()
    const key = ip || 'unknown'
    const entry = counters.get(key)

    if (!entry || now - entry.start > windowMs) {
      counters.set(key, { start: now, count: 1 })
      // Prune stale entries periodically to avoid memory leak
      if (counters.size > 5_000) {
        for (const [k, v] of counters) {
          if (now - v.start > windowMs) counters.delete(k)
        }
      }
      return { allowed: true }
    }

    entry.count++
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000)
      return { allowed: false, retryAfter }
    }

    return { allowed: true }
  }
}

/**
 * Extracts the real client IP from a Next.js request.
 * Respects Vercel's x-forwarded-for header.
 * @param {import('next').NextApiRequest} req
 * @returns {string}
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}
