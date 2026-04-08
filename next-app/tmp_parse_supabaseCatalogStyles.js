// Temporary parse-only copy of supabaseCatalogStyles.js (imports/exports removed)

const DEFAULT_STYLES = {
  headerBg: '',
  headerTextColor: '',
  logoText: 'KOND',
  logoUrl: '',
  catalogBg: '',
  catalogTextColor: '',
  accentColor: '#3b82f6',
  buttonBg: '#3b82f6',
  buttonTextColor: '#ffffff',
  buttonRadius: '12',
  cardBg: '',
  cardBorderColor: '',
  cardRadius: '12',
  badgeBg: '',
  badgeTextColor: '#ffffff',
  footerBg: '',
  footerTextColor: '',
  footerDescription: 'Tu tienda de confianza para productos de calidad.\nComprá fácil y seguro desde la comodidad de tu hogar.',
  footerPhone: '+54 11 1234-5678',
  footerEmail: 'info@kond.com',
  footerAddress: 'Buenos Aires, Argentina',
  bannerEnabled: false,
  bannerText: '',
  bannerBg: '#3b82f6',
  bannerTextColor: '#ffffff',
  gridColumns: 3,
  whatsappEnabled: false,
  whatsappNumber: '',
  whatsappMessage: 'Hola! Me gustaría consultar sobre sus productos.',
}

function isValidCssColor(value) {
  if (!value || typeof value !== 'string') return false
  const v = value.trim()
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const s = document.createElement('span').style
      s.color = ''
      s.color = v
      return !!s.color
    } catch (e) {
    }
  }
  const hex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
  const rgb = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  return hex.test(v) || rgb.test(v)
}

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
    if (!val) return
    if (isValidCssColor(val)) {
      const hex = normalizeHex(val)
      if (hex) {
        if (hex !== val) normalizedKeys.push(k)
        cleaned[k] = hex
      } else {
        const trimmed = typeof val === 'string' ? val.trim() : val
        if (trimmed !== val) normalizedKeys.push(k)
        cleaned[k] = trimmed
      }
    } else {
      cleaned[k] = ''
      normalizedKeys.push(k)
    }
  })
  return { cleaned, normalizedKeys }
}

async function parseCheck() {
  try {
    // simulate saveCatalogStyles control flow minimally
    const styles = {}
    const { cleaned, normalizedKeys } = sanitizeStyles(styles || {})
    const toSave = { ...cleaned }
    const prevRaw = null
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('catalogStyles', JSON.stringify(toSave)) } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('catalogStyles:updated', { detail: toSave })) } catch (e) {}
      try {
        // noop
      } catch (e) {
      }
    }
    // done
    console.log('parse check ok')
  } catch (err) {
    console.error('parse check err', err)
  }
}

parseCheck()
