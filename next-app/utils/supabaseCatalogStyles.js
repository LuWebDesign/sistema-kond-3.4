import supabase from './supabaseClient'

const DEFAULT_STYLES = {
  // Header
  headerBg: '',
  headerTextColor: '',
  logoText: 'KOND',
  logoUrl: '',
  // General
  catalogBg: '',
  catalogTextColor: '',
  accentColor: '#3b82f6',
  // Botones
  buttonBg: '#3b82f6',
  buttonTextColor: '#ffffff',
  buttonRadius: '12',
  // Cards de producto
  cardBg: '',
  cardBorderColor: '',
  cardRadius: '12',
  // Badges de categoría
  badgeBg: '',
  badgeTextColor: '#ffffff',
  // Footer
  footerBg: '',
  footerTextColor: '',
  footerDescription: 'Tu tienda de confianza para productos de calidad.\nComprá fácil y seguro desde la comodidad de tu hogar.',
  footerPhone: '+54 11 1234-5678',
  footerEmail: 'info@kond.com',
  footerAddress: 'Buenos Aires, Argentina',
  // Banner superior (opcional)
  bannerEnabled: false,
  bannerText: '',
  bannerBg: '#3b82f6',
  bannerTextColor: '#ffffff',
  // Layout del catálogo
  gridColumns: 3,
  // Botón flotante WhatsApp
  whatsappEnabled: false,
  whatsappNumber: '',
  whatsappMessage: 'Hola! Me gustaría consultar sobre sus productos.',
}

// Helper: validar si un string es un color CSS válido.
function isValidCssColor(value) {
  if (!value || typeof value !== 'string') return false
  const v = value.trim()
  // Si estamos en el navegador, usar el motor CSS para validar
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const s = document.createElement('span').style
      s.color = ''
      s.color = v
      return !!s.color
    } catch (e) {
      // fallthrough
    }
  }
  // Fallback: validar hex y rgb(a) mediante regex
  const hex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
  const rgb = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  return hex.test(v) || rgb.test(v)
}

// Normalizar un valor de color: expandir hex corto y asegurar prefijo '#'.
function normalizeHex(value) {
  if (!value || typeof value !== 'string') return ''
  const v = value.trim()
  const hexNoHash = v.replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(hexNoHash)) {
    return '#' + hexNoHash.split('').map(c => c + c).join('').toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(hexNoHash)) return '#' + hexNoHash.toLowerCase()
  if (/^[0-9a-fA-F]{8}$/.test(hexNoHash)) return '#' + hexNoHash.toLowerCase()
  return ''
}

function sanitizeStyles(inputStyles) {
  const colorKeys = [
    'headerBg','headerTextColor','accentColor','buttonBg','buttonTextColor','cardBg','cardBorderColor','badgeBg','badgeTextColor','bannerBg','bannerTextColor','footerBg','footerTextColor','catalogBg','catalogTextColor'
  ]
  const cleaned = { ...inputStyles }
  const normalizedKeys = []
  colorKeys.forEach(k => {
    if (!Object.prototype.hasOwnProperty.call(cleaned, k)) return
    const val = cleaned[k]
    if (!val) {
      // keep falsy as-is (means fallback to defaults)
      return
    }
    if (isValidCssColor(val)) {
      // prefer hex normalized when possible
      const hex = normalizeHex(val)
      if (hex) {
        if (hex !== val) normalizedKeys.push(k)
        cleaned[k] = hex
      } else {
        // keep original (e.g., rgb(...), color names)
        // but mark normalized if we trimmed whitespace
        const trimmed = typeof val === 'string' ? val.trim() : val
        if (trimmed !== val) normalizedKeys.push(k)
        cleaned[k] = trimmed
      }
    } else {
      // Invalid color -> remove to fallback to defaults
      cleaned[k] = ''
      normalizedKeys.push(k)
    }
  })
  return { cleaned, normalizedKeys }
}

/**
 * Obtener estilos del catálogo
 */
export async function getCatalogStyles() {
  try {
    // Si estamos en el navegador, devolver inmediatamente la copia cacheada
    // (si existe) para evitar parpadeos, y actualizar en background.
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('catalogStyles')
        if (raw) {
          const parsed = JSON.parse(raw)
          const merged = { ...DEFAULT_STYLES, ...parsed }

          // Background refresh desde API (stale-while-revalidate)
          ;(async () => {
            try {
              const resp = await fetch('/api/admin/catalog-styles')
              if (resp.ok) {
                const json = await resp.json()
                const remote = { ...DEFAULT_STYLES, ...(json.styles || {}) }
                try {
                  if (JSON.stringify(remote) !== JSON.stringify(merged)) {
                    localStorage.setItem('catalogStyles', JSON.stringify(remote))
                    try { window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: remote })) } catch (e) {}
                  }
                } catch (e) {}
              }
            } catch (e) {
              // ignore network errors here; fallback será manejado más abajo
            }
          })()

          return merged
        }
      } catch (e) {
        console.warn('Error leyendo catalogStyles en localStorage:', e)
      }

      // No había cache local: intentar traer desde API antes de la persistencia local
      try {
        const resp = await fetch('/api/admin/catalog-styles')
        if (resp.ok) {
          const json = await resp.json()
          const merged = { ...DEFAULT_STYLES, ...(json.styles || {}) }
          try { localStorage.setItem('catalogStyles', JSON.stringify(merged)) } catch (e) {}
          return merged
        }
      } catch (e) {
        console.warn('Fallo al obtener estilos vía API:', e)
      }
    }

    // Si estamos en servidor o la API falló, intentar Supabase directo
    if (supabase) {
      const { data, error } = await supabase.from('catalog_styles').select('*').single()
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
          return DEFAULT_STYLES
        }
        throw error
      }
      return data ? { ...DEFAULT_STYLES, ...(data.styles || {}) } : DEFAULT_STYLES
    }

    // Último recurso: revisar localStorage si está disponible
    if (typeof window !== 'undefined') {
      const raw2 = localStorage.getItem('catalogStyles')
      if (raw2) {
        try { return { ...DEFAULT_STYLES, ...JSON.parse(raw2) } } catch (e) { /* fallthrough */ }
      }
    }

    return DEFAULT_STYLES
  } catch (error) {
    console.error('Error al obtener estilos del catálogo:', error)
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('catalogStyles')
      if (raw) return { ...DEFAULT_STYLES, ...JSON.parse(raw) }
    }
    return DEFAULT_STYLES
  }
}

/**
 * Guardar estilos del catálogo
 */
export async function saveCatalogStyles(styles) {
  try {
    // Sanitizar y normalizar colores antes de persistir
    const { cleaned, normalizedKeys } = sanitizeStyles(styles || {})
    const toSave = { ...cleaned }
    // Optimistic update: aplicar inmediatamente en localStorage and disparar evento
    const prevRaw = (typeof window !== 'undefined') ? localStorage.getItem('catalogStyles') : null
    try {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('catalogStyles', JSON.stringify(toSave)) } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: toSave })) } catch (e) {}
        // Intentar persistir en API; si falla, revertir
        try {
          const resp = await fetch('/api/admin/catalog-styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styles: toSave })
          })
          if (resp.ok) return { success: true, normalized: normalizedKeys }
          const text = await resp.text()
          // Revertir localStorage si había un valor previo
          if (prevRaw != null) {
            try { localStorage.setItem('catalogStyles', prevRaw) } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: JSON.parse(prevRaw) })) } catch (e) {}
          } else {
            try { localStorage.removeItem('catalogStyles') } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: {} })) } catch (e) {}
          }
          return { success: false, error: text }
        } catch (e) {
          console.warn('Fallo al guardar vía API:', e)
          // fallback: intentar persistir en supabase si existe
        }
      }

      if (supabase) {
        const { data: existing } = await supabase.from('catalog_styles').select('id').single()
        if (existing) {
          const { error } = await supabase.from('catalog_styles').update({ styles: toSave, updated_at: new Date().toISOString() }).eq('id', existing.id)
          if (error) return { success: false, error: error.message }
        } else {
          const { error } = await supabase.from('catalog_styles').insert([{ styles: toSave, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          if (error) return { success: false, error: error.message }
        }
        try { localStorage.setItem('catalogStyles', JSON.stringify(toSave)) } catch (e) {}
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: toSave })) } catch (e) {}
        return { success: true, normalized: normalizedKeys }
      }

      // Si no hay supabase y la API falló, dejar los cambios en localStorage (ya aplicados optimísticamente)
      return { success: true, normalized: normalizedKeys }
    }
  } catch (error) {
    console.error('Error al guardar estilos:', error)
    return { success: false, error: error.message || String(error) }
  }
}

export { DEFAULT_STYLES }
export { isValidCssColor, normalizeHex, sanitizeStyles }
