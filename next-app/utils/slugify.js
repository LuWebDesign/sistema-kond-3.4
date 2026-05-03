/**
 * slugify.js — Canonical slug helpers for Sistema KOND.
 *
 * Exports:
 *   slugify(text)            — canonical kebab slug (lowercase, accent-free)
 *   slugifyPreserveCase(str) — legacy alias kept for backwards compatibility
 *
 * Both functions:
 *   1. Normalize to NFD and strip combining diacritics (á→a, ñ→n, ü→u, etc.)
 *   2. Remove any character that is not a-z, 0-9, space, or hyphen
 *   3. Collapse whitespace runs into a single hyphen
 *   4. Trim leading/trailing hyphens
 *   5. Return the result in lowercase
 */

/**
 * Converts a text string to a URL-safe slug.
 *
 * @param {string} text - The input string (may contain accents or special chars).
 * @returns {string} The generated slug, e.g. "Remeras Básicas" → "remeras-basicas"
 *
 * @example
 * slugify('Remeras Básicas')  // "remeras-basicas"
 * slugify('Sillas & Mesas')   // "sillas-mesas"
 * slugify('  CAFÉ  ')         // "cafe"
 */
export function slugify(text) {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics (accents, tildes, etc.)
    .replace(/[^a-z0-9\s-]/g, '')    // remove non-alphanumeric chars except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-')            // collapse whitespace to single hyphen
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
}

/**
 * Legacy alias — kept for backwards compatibility with existing code.
 * New code should use `slugify` directly.
 *
 * @param {string} str
 * @returns {string}
 */
export function slugifyPreserveCase(str) {
  return slugify(str)
}

export default slugify
