// Helper to create canonical slugs from strings used across the catalog
// Normaliza acentos, reemplaza espacios por '-' y elimina caracteres inválidos.
// Devuelve el slug en minúsculas para comparaciones consistentes.
export function slugifyPreserveCase(str) {
  if (!str) return ''
  const normalized = String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalized.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '').toLowerCase()
}

export default slugifyPreserveCase
