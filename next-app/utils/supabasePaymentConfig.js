import supabase from './supabaseClient'

/**
 * Obtener la configuración de métodos de pago
 * @returns {Promise<Object|null>} Configuración de pago o null si hay error
 */
export async function getPaymentConfig() {
  try {
    const { data, error } = await supabase
      .from('payment_config')
      .select('*')
      .single()

    if (error) {
      // Si no existe configuración, retornar configuración por defecto
      if (error.code === 'PGRST116') {
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
    // Verificar si ya existe una configuración
    const { data: existing, error: fetchError } = await supabase
      .from('payment_config')
      .select('id')
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    let result

    if (existing) {
      // Actualizar configuración existente
      result = await supabase
        .from('payment_config')
        .update({
          config: config,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // Crear nueva configuración
      result = await supabase
        .from('payment_config')
        .insert([{
          config: config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
    }

    if (result.error) {
      throw result.error
    }

    return true
  } catch (error) {
    console.error('Error al guardar configuración de pago:', error)
    return false
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
