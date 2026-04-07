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
}

/**
 * Obtener estilos del catálogo
 */
export async function getCatalogStyles() {
  try {
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/admin/catalog-styles')
        if (resp.ok) {
          const json = await resp.json()
          return { ...DEFAULT_STYLES, ...json.styles }
        }
      } catch (e) {
        console.warn('Fallo al obtener estilos vía API, intentando fallback:', e)
      }
    }

    if (!supabase) {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('catalogStyles')
        if (raw) return { ...DEFAULT_STYLES, ...JSON.parse(raw) }
      }
      return DEFAULT_STYLES
    }

    const { data, error } = await supabase.from('catalog_styles').select('*').single()
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
        return DEFAULT_STYLES
      }
      throw error
    }

    return data ? { ...DEFAULT_STYLES, ...data.styles } : DEFAULT_STYLES
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
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/admin/catalog-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ styles })
        })
        if (resp.ok) {
          localStorage.setItem('catalogStyles', JSON.stringify(styles))
          try { window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: styles })) } catch (e) {}
          return { success: true }
        }
        const text = await resp.text()
        console.warn('API devolvió error:', resp.status, text)
      } catch (e) {
        console.warn('Fallo al guardar vía API:', e)
      }
    }

    if (supabase) {
      const { data: existing } = await supabase.from('catalog_styles').select('id').single()
      if (existing) {
        const { error } = await supabase.from('catalog_styles').update({ styles, updated_at: new Date().toISOString() }).eq('id', existing.id)
        if (error) return { success: false, error: error.message }
      } else {
        const { error } = await supabase.from('catalog_styles').insert([{ styles, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        if (error) return { success: false, error: error.message }
      }
      localStorage.setItem('catalogStyles', JSON.stringify(styles))
      return { success: true }
    }

    localStorage.setItem('catalogStyles', JSON.stringify(styles))
    return { success: true }
  } catch (error) {
    console.error('Error al guardar estilos:', error)
    return { success: false, error: error.message || String(error) }
  }
}

export { DEFAULT_STYLES }
