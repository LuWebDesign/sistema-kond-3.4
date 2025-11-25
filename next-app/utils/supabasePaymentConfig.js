import supabase from './supabaseClient'

/**
 * Obtener la configuración de métodos de pago
 * @returns {Promise<Object|null>} Configuración de pago o null si hay error
 */
export async function getPaymentConfig() {
  try {
    // Preferir la API server-side que usa service_role para lectura/escritura segura
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/admin/payment-config')
        if (resp.ok) {
          const json = await resp.json()
          return json.config
        }
      } catch (e) {
        console.warn('Fallo al obtener config vía API admin, intentando fallback:', e)
      }
    }

    // Fallback: si no hay API disponible o estamos en servidor, usar cliente Supabase o localStorage
    if (!supabase) {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('paymentConfig')
        if (raw) return JSON.parse(raw)
      }

      return {
        transferencia: { enabled: true, alias: '', cbu: '', titular: '', banco: '' },
        whatsapp: { enabled: true, numero: '', mensaje: '' },
        retiro: { enabled: true, direccion: '', horarios: '' }
      }
    }

    const { data, error } = await supabase.from('payment_config').select('*').single()
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
        return {
          transferencia: { enabled: true, alias: '', cbu: '', titular: '', banco: '' },
          whatsapp: { enabled: true, numero: '', mensaje: '' },
          retiro: { enabled: true, direccion: '', horarios: '' }
        }
      }
      throw error
    }

    return data ? data.config : null
  } catch (error) {
    console.error('Error al obtener configuración de pago:', error)
    return null
  }
}

/**
 * Guardar o actualizar la configuración de métodos de pago
 * @param {Object} config - Configuración de métodos de pago
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export async function savePaymentConfig(config) {
  try {
    // Intentar primero a través de la API server-side (service_role)
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/admin/payment-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        })

        if (resp.ok) {
          const json = await resp.json()
          if (typeof window !== 'undefined') localStorage.setItem('paymentConfig', JSON.stringify(config))
              // Emitir evento para que otras partes de la app (checkout) se actualicen inmediatamente
              try { window.dispatchEvent(new CustomEvent('paymentConfig:updated', { detail: config })) } catch (e) { /* noop */ }
              return { success: true, data: json }
        }

        // Si la API respondió con error (500/403/etc), intentar fallback automático:
        const text = await resp.text()
        console.warn('API admin devolvió error, intentando fallback. status=', resp.status, text)
        // Intentar fallback a Supabase directo
        if (supabase) {
          try {
            const payload = { config }
            const { data, error } = await supabase.from('payment_config').upsert(payload, { returning: 'representation' })
            if (error) {
              console.error('Error fallback supabase upsert:', error)
              return { success: false, error: { message: `Supabase upsert failed: ${error.message || String(error)}`, details: text } }
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem('paymentConfig', JSON.stringify(config))
              try { window.dispatchEvent(new CustomEvent('paymentConfig:updated', { detail: config })) } catch (e) {}
            }
            return { success: true, data }
          } catch (e) {
            console.error('Excepción during supabase fallback:', e)
          }
        }

        // Último recurso: almacenar en localStorage para ambiente local
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('paymentConfig', JSON.stringify(config))
            try { window.dispatchEvent(new CustomEvent('paymentConfig:updated', { detail: config })) } catch(e) {}
            return { success: true, data: { fallback: 'localStorage', details: text } }
          } catch (e) {
            console.error('No se pudo guardar en localStorage:', e)
            return { success: false, error: { message: `API error: ${resp.status}`, details: text } }
          }
        }

        return { success: false, error: { message: `API error: ${resp.status}`, details: text } }
      } catch (e) {
        console.warn('Fallo al guardar vía API admin, intentando fallback:', e)
      }
    }

    // Fallback: usar Supabase directo si está disponible
    if (!supabase) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('paymentConfig', JSON.stringify(config))
        try { window.dispatchEvent(new CustomEvent('paymentConfig:updated', { detail: config })) } catch (e) { /* noop */ }
        return { success: true }
      }

      return { success: false, error: { message: 'No supabase client available' } }
    }

    const payload = { config }
    const { data, error } = await supabase.from('payment_config').upsert(payload, { returning: 'representation' })

    if (error) {
      console.error('Error al guardar config en Supabase:', error)
      return { success: false, error }
    }

    if (typeof window !== 'undefined') localStorage.setItem('paymentConfig', JSON.stringify(config))
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('paymentConfig:updated', { detail: config })) } catch(e) { }

    return { success: true, data }
  } catch (error) {
    console.error('Error al guardar configuración de pago:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Obtener configuración de un método específico
 * @param {string} method - 'transferencia', 'whatsapp' o 'retiro'
 * @returns {Promise<Object|null>}
 */
export async function getPaymentMethodConfig(method) {
  try {
    const config = await getPaymentConfig()
    return config ? config[method] : null
  } catch (error) {
    console.error(`Error al obtener configuración de ${method}:`, error)
    return null
  }
}

/**
 * Verificar si un método de pago está habilitado
 * @param {string} method - 'transferencia', 'whatsapp' o 'retiro'
 * @returns {Promise<boolean>}
 */
export async function isPaymentMethodEnabled(method) {
  try {
    const config = await getPaymentMethodConfig(method)
    return config ? config.enabled === true : false
  } catch (error) {
    console.error(`Error al verificar si ${method} está habilitado:`, error)
    return false
  }
}
