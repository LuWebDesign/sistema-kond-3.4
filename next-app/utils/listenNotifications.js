// ============================================
// SUPABASE REALTIME - LISTENER DE NOTIFICACIONES
// Sistema de escucha en tiempo real para notificaciones
// ============================================

import { supabase } from './supabaseClient'

/**
 * Configurar listener de Realtime para notificaciones
 * Escucha INSERT en la tabla 'notifications' y ejecuta callback
 * 
 * @param {Object} options - Opciones de configuraciÃ³n
 * @param {string} options.targetUser - Usuario objetivo: 'admin' o 'user'
 * @param {string} options.userId - ID del usuario (opcional, para filtrar notificaciones de user)
 * @param {Function} options.onInsert - Callback cuando se inserta una notificaciÃ³n
 * @param {Function} options.onUpdate - Callback cuando se actualiza una notificaciÃ³n
 * @param {Function} options.onDelete - Callback cuando se elimina una notificaciÃ³n
 * @param {Function} options.onError - Callback para manejar errores
 * @returns {Object} Canal de Supabase (para poder cancelar la suscripciÃ³n)
 * 
 * @example
 * const channel = listenNotifications({
 *   targetUser: 'admin',
 *   onInsert: (notification) => {
 *     console.log('Nueva notificaciÃ³n:', notification)
 *     // Actualizar estado, mostrar toast, etc.
 *   }
 * })
 * 
 * // Para cancelar la suscripciÃ³n:
 * channel.unsubscribe()
 */
export function listenNotifications({
  targetUser = 'admin',
  userId = null,
  onInsert = null,
  onUpdate = null,
  onDelete = null,
  onError = null
}) {
  if (!supabase) {
    console.warn('âš ï¸ Supabase no estÃ¡ inicializado. Realtime no funcionarÃ¡.')
    return null
  }
  // Nombre Ãºnico del canal para evitar conflictos
  const channelName = `notifications:${targetUser}${userId ? `:${userId}` : ''}`

  // Intentar obtener la sesiÃ³n de forma asÃ­ncrona; crear el canal real solo si hay sesiÃ³n.
  // Para mantener compatibilidad con callers que esperan un canal síncrono, devolvemos
  // un `proxy`/`fakeChannel` inmediato que delega en el canal real cuando estÃ© disponible.

  let realChannel = null
  const sessionPromise = supabase.auth.getSession()
    .then(({ data: { session } }) => {
      if (!session) {
        console.warn('âš ï¸ No hay sesiÃ³n activa. Realtime no se suscribirá (evita reconexiones).')
        return null
      }

      // Crear canal real ahora que hay sesiÃ³n
      realChannel = supabase
        .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `target_user=eq.${targetUser}`
      },
      (payload) => {
        // Filtrar por userId si es necesario
        if (targetUser === 'user' && userId) {
          const notificationUserId = payload.new.meta?.userId
          if (notificationUserId !== userId) {
            return
          }
        }

        // Ejecutar callback de inserciÃ³n
        if (onInsert && typeof onInsert === 'function') {
          try {
            onInsert(payload.new)
          } catch (error) {
            console.error('âŒ [Realtime] Error en callback onInsert:', error)
            if (onError) onError(error)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `target_user=eq.${targetUser}`
      },
      (payload) => {
        // Filtrar por userId si es necesario
        if (targetUser === 'user' && userId) {
          const notificationUserId = payload.new.meta?.userId
          if (notificationUserId !== userId) {
            return
          }
        }

        // Ejecutar callback de actualizaciÃ³n
        if (onUpdate && typeof onUpdate === 'function') {
          try {
            onUpdate(payload.new, payload.old)
          } catch (error) {
            console.error('âŒ [Realtime] Error en callback onUpdate:', error)
            if (onError) onError(error)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `target_user=eq.${targetUser}`
      },
      (payload) => {
        // Filtrar por userId si es necesario
        if (targetUser === 'user' && userId) {
          const notificationUserId = payload.old.meta?.userId
          if (notificationUserId !== userId) {
            return
          }
        }

        // Ejecutar callback de eliminaciÃ³n
        if (onDelete && typeof onDelete === 'function') {
          try {
            onDelete(payload.old)
          } catch (error) {
            console.error('âŒ [Realtime] Error en callback onDelete:', error)
            if (onError) onError(error)
          }
        }
      }
    )
      .subscribe((status, err) => {
      console.log(`ðŸ“¡ [Realtime] Estado del canal "${channelName}":`, status, err ? `(Error: ${err})` : '')

        // Mantener contador de intentos de reconexión por canal
        if (!channel._reconnectAttempts) channel._reconnectAttempts = 0

        if (status === 'SUBSCRIBED') {
          console.log('âœ… [Realtime] Canal suscrito exitosamente')
          // Resetear intentos al suscribirse correctamente
          channel._reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR') {
        const errorMessage = err?.message || err?.toString() || 'Error desconocido'
        const errorDetails = err ? JSON.stringify(err, null, 2) : 'Sin detalles'
        const isNetworkErr = isNetworkError(err)
        
        // Usar logging avanzado
        logRealtimeError('CHANNEL_ERROR', err || new Error('Error desconocido'), {
          channel: channelName,
          isNetworkError: isNetworkErr,
          errorDetails
        })
        
        if (onError) {
          onError(new Error(`Canal de Realtime fallÃ³: ${errorMessage}`))
        }
        
        // Calcular delay de reconexiÃ³n basado en el tipo de error
        // Incrementar contador de intentos y calcular backoff
        channel._reconnectAttempts = (channel._reconnectAttempts || 0) + 1
        const reconnectDelay = calculateReconnectDelay(err, channel._reconnectAttempts)
        console.log(`ðŸ”„ [Realtime] Intentando reconectar en ${reconnectDelay/1000}s... (intento ${channel._reconnectAttempts})`)

        // Intentar reconectar llamando a subscribe() respectando backoff
        if (channel._reconnectTimer) clearTimeout(channel._reconnectTimer)
        channel._reconnectTimer = setTimeout(() => {
          console.log('ðŸ”„ [Realtime] Intentando reconectar despuÃ©s de error...')
          try {
            channel.subscribe()
          } catch (reconnectError) {
            logRealtimeError('RECONNECT_FAILED', reconnectError, { originalError: err })
          }
        }, reconnectDelay)
      } else if (status === 'TIMED_OUT') {
        console.warn('â° [Realtime] Canal timeout - intentando reconectar...')
        
        channel._reconnectAttempts = (channel._reconnectAttempts || 0) + 1
        const reconnectDelay = calculateReconnectDelay(new Error('timeout'), channel._reconnectAttempts)
        console.log(`ðŸ”„ [Realtime] Intentando reconectar despuÃ©s de timeout en ${reconnectDelay/1000}s... (intento ${channel._reconnectAttempts})`)

        if (channel._reconnectTimer) clearTimeout(channel._reconnectTimer)
        channel._reconnectTimer = setTimeout(() => {
          console.log('ðŸ”„ [Realtime] Intentando reconectar...')
          try {
            channel.subscribe()
          } catch (reconnectError) {
            console.error('âŒ [Realtime] Error al reconectar despuÃ©s de timeout:', reconnectError)
          }
        }, reconnectDelay)
      } else if (status === 'CLOSED') {
        console.log('ðŸ”Œ [Realtime] Canal cerrado')

        // Programar reconexiÃ³n ante cierre inesperado
        channel._reconnectAttempts = (channel._reconnectAttempts || 0) + 1
        const reconnectDelay = calculateReconnectDelay(new Error('closed'), channel._reconnectAttempts)
        console.log(`ðŸ”„ [Realtime] Canal cerrado. Intentando reconectar en ${reconnectDelay/1000}s... (intento ${channel._reconnectAttempts})`)

        if (channel._reconnectTimer) clearTimeout(channel._reconnectTimer)
        channel._reconnectTimer = setTimeout(() => {
          try {
            // Si el canal fue removido, recrearlo
            const existing = supabase.getChannels().find(ch => ch.topic === channel.topic)
            if (!existing) {
              console.log('ðŸ”„ [Realtime] Canal no existe, recreando...')
              // Intentar recrear suscripción llamando a listenNotifications de nuevo
              try {
                // Nota: esto retornará un nuevo canal; el caller podría guardar la referencia
                listenNotifications({ targetUser, userId, onInsert, onUpdate, onDelete, onError })
              } catch (recreateError) {
                logRealtimeError('RECREATE_FAILED', recreateError, { channel: channelName })
              }
            } else {
              console.log('ðŸ”„ [Realtime] Re-suscribiendo al canal existente...')
              existing.subscribe()
            }
          } catch (reconnectError) {
            logRealtimeError('RECONNECT_AFTER_CLOSED_FAILED', reconnectError, { channel: channelName })
          }
        }, reconnectDelay)
      } else if (status === 'JOINING') {
        console.log('ðŸ”— [Realtime] UniÃ©ndose al canal...')
      } else if (status === 'LEAVING') {
        console.log('ðŸ‘‹ [Realtime] Saliendo del canal...')
      } else {
        console.warn(`âš ï¸ [Realtime] Estado desconocido: ${status}`, err)
      }
    })
      .catch(err => {
        console.error('Error creando canal Realtime:', err)
      })

  // Proxy / fake channel que devolvemos inmediatamente
  const fakeChannel = {
    topic: `realtime:${channelName}`,
    state: 'closed',
    _reconnectAttempts: 0,
    async unsubscribe() {
      try {
        // Esperar a que se resuelva la promesa de sesión/canal
        await sessionPromise
        if (realChannel && typeof realChannel.unsubscribe === 'function') {
          await realChannel.unsubscribe()
        }
      } catch (e) {
        // noop
      }
    },
    async subscribe() {
      await sessionPromise
      if (realChannel && typeof realChannel.subscribe === 'function') {
        try {
          await realChannel.subscribe()
        } catch (e) {
          console.error('Error al subscribir el canal real desde proxy:', e)
        }
      }
    }
  }

  // Reconectar cuando vuelve la conexiÃ³n de red: delegar al realChannel si existe
  if (typeof window !== 'undefined') {
    const onlineHandler = async () => {
      try {
        await sessionPromise
        if (realChannel && realChannel.state !== 'joined') {
          console.log('ðŸ”„ [Realtime] Navegador online - intentando reconectar canal...')
          if (realChannel._reconnectTimer) clearTimeout(realChannel._reconnectTimer)
          realChannel._reconnectAttempts = 0
          realChannel.subscribe()
        }
      } catch (err) {
        console.error('âŒ [Realtime] Error al reconectar en online event:', err)
      }
    }

    window.addEventListener('online', onlineHandler)
    // Guardar handler para permitir limpieza si se remueve el canal
    fakeChannel._onlineHandler = onlineHandler
  }

  // Retornar el fakeChannel (compatible con callers que esperan un objeto canal)
  return fakeChannel
}

/**
 * Cancelar suscripciÃ³n a notificaciones Realtime
 * @param {Object} channel - Canal de Supabase a cancelar
 * @returns {Promise<void>}
 */
export async function unsubscribeNotifications(channel) {
  if (!channel) return

  try {
    // Limpiar timers y handlers asociados al canal
    try {
      if (channel._reconnectTimer) {
        clearTimeout(channel._reconnectTimer)
        channel._reconnectTimer = null
      }
      if (typeof window !== 'undefined' && channel._onlineHandler) {
        window.removeEventListener('online', channel._onlineHandler)
        channel._onlineHandler = null
      }
    } catch (cleanupError) {
      console.warn('Error limpiando datos del canal antes de removerlo:', cleanupError)
    }

    // Primero intentar unsubscribir formalmente, luego remover de supabase internals
    try {
      if (typeof channel.unsubscribe === 'function') await channel.unsubscribe()
    } catch (uErr) {
      // No crítico: continuar con removeChannel
      console.warn('Error al llamar channel.unsubscribe():', uErr)
    }

    await supabase.removeChannel(channel)
    console.log('âœ… [Realtime] SuscripciÃ³n cancelada exitosamente')
  } catch (error) {
    console.error('âŒ [Realtime] Error al cancelar suscripciÃ³n:', error)
  }
}

/**
 * Diagnosticar problemas de conexiÃ³n Realtime
 * @returns {Object} InformaciÃ³n de diagnÃ³stico
 */
export function diagnoseRealtimeConnection() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    supabaseAvailable: !!supabase,
    channels: [],
    networkStatus: 'unknown',
    authStatus: 'unknown'
  }

  try {
    // Verificar estado de red bÃ¡sico
    diagnostics.networkStatus = navigator.onLine ? 'online' : 'offline'
    
    if (supabase) {
      // Verificar canales activos
      const channels = supabase.getChannels()
      diagnostics.channels = channels.map(ch => ({
        name: ch.topic,
        state: ch.state,
        joined: ch.state === 'joined'
      }))
      
      // Verificar autenticaciÃ³n
      supabase.auth.getSession().then(({ data: { session } }) => {
        diagnostics.authStatus = session ? 'authenticated' : 'not_authenticated'
      }).catch(() => {
        diagnostics.authStatus = 'auth_error'
      })
    }
  } catch (error) {
    diagnostics.error = error.message
  }

  console.log('ðŸ” [Realtime] DiagnÃ³stico de conexiÃ³n:', diagnostics)
  return diagnostics
}

/**
 * Manejar errores de red especÃ­ficamente
 * @param {Error} error - Error original
 * @returns {boolean} true si es un error de red
 */
function isNetworkError(error) {
  if (!error) return false
  
  const networkErrorPatterns = [
    'network',
    'connection',
    'timeout',
    'offline',
    'unreachable',
    'failed to fetch',
    'net::',
    'websocket'
  ]
  
  const errorString = (error.message || error.toString() || '').toLowerCase()
  return networkErrorPatterns.some(pattern => errorString.includes(pattern))
}

/**
 * Calcular delay de reconexiÃ³n basado en el tipo de error
 * @param {Error} error - Error que causÃ³ la desconexiÃ³n
 * @param {number} attempt - NÃºmero de intento (para backoff exponencial)
 * @returns {number} Delay en milisegundos
 */
function calculateReconnectDelay(error, attempt = 1) {
  const baseDelay = 5000 // 5 segundos base
  
  if (isNetworkError(error)) {
    // Para errores de red, usar backoff exponencial mÃ¡s agresivo
    return Math.min(baseDelay * Math.pow(2, attempt), 60000) // MÃ¡ximo 1 minuto
  } else {
    // Para otros errores, reconexiÃ³n mÃ¡s rÃ¡pida
    return Math.min(baseDelay * attempt, 30000) // MÃ¡ximo 30 segundos
  }
}

/**
 * FunciÃ³n de utilidad para logging avanzado de errores
 * @param {string} context - Contexto donde ocurre el error
 * @param {Error} error - Error a loggear
 * @param {Object} extraData - Datos adicionales para el log
 */
export function logRealtimeError(context, error, extraData = {}) {
  const errorInfo = {
    context,
    timestamp: new Date().toISOString(),
    error: {
      message: error?.message || 'Sin mensaje',
      stack: error?.stack,
      name: error?.name
    },
    diagnostics: diagnoseRealtimeConnection(),
    ...extraData
  }
  
  console.error(`âŒ [Realtime:${context}] Error detallado:`, errorInfo)
  
  // En desarrollo, tambiÃ©n mostrar en consola como tabla
  if (process.env.NODE_ENV === 'development') {
    console.table({
      'Contexto': context,
      'Mensaje': error?.message || 'N/A',
      'Tipo': error?.name || 'Unknown',
      'Timestamp': errorInfo.timestamp
    })
  }
}

/**
 * Verificar estado de conexión de Realtime
 * @returns {boolean} true si está conectado
 */
export function isRealtimeConnected() {
  if (!supabase) return false
  
  try {
    // Verificar si hay canales activos
    const channels = supabase.getChannels()
    return channels.some(channel => channel.state === 'joined')
  } catch (error) {
    console.error('Error verificando conexión Realtime:', error)
    return false
  }
}

/**
 * Forzar reconexión de Realtime con diagnóstico
 * @param {Object} channel - Canal existente
 * @returns {Object} Nuevo canal o el mismo si ya está conectado
 */
export function reconnectRealtime(channel) {
  if (!channel) return null
  
  try {
    // Ejecutar diagnóstico antes de reconectar
    const diagnostics = diagnoseRealtimeConnection()
    
    // Si el canal ya está unido, no hacer nada
    if (channel.state === 'joined') {
      console.log('✅ [Realtime] Canal ya está conectado')
      return channel
    }
    
    console.log('🔄 [Realtime] Forzando reconexión...')
    
    // Desuscribir y volver a suscribir
    channel.unsubscribe()
    setTimeout(() => {
      try {
        channel.subscribe()
      } catch (subscribeError) {
        console.error('❌ [Realtime] Error al suscribir después de reconexión forzada:', subscribeError)
      }
    }, 1000)
    
    return channel
  } catch (error) {
    console.error('Error reconectando Realtime:', error)
    return null
  }
}

/**
 * Helper para manejar reconexión automática
 * Útil cuando la conexión se pierde (usuario pierde internet, etc.)
 * 
 * @param {Function} setupFunction - Función que configura el listener
 * @param {number} retryInterval - Intervalo de reintento en ms (default: 5000)
 * @returns {Object} Objeto con función cleanup
 */
export function setupRealtimeWithReconnect(setupFunction, retryInterval = 5000) {
  let channel = null
  let reconnectTimer = null

  const connect = () => {
    try {
      channel = setupFunction()
    } catch (error) {
      scheduleReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      connect()
    }, retryInterval)
  }

  // Conectar inicialmente
  connect()

  // Retornar función de limpieza
  return {
    cleanup: async () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (channel) await unsubscribeNotifications(channel)
    }
  }
}

/**
 * Hook simplificado para React (alternativa al hook completo)
 * Usar este si solo necesitas escuchar sin manejar estado complejo
 */
export function setupRealtimeForAdmin(onNewNotification) {
  return setupRealtimeWithReconnect(() => {
    return listenNotifications({
      targetUser: 'admin',
      onInsert: onNewNotification,
      onError: (error) => {
        console.error('Error en Realtime:', error)
      }
    })
  })
}

export function setupRealtimeForUser(userId, onNewNotification) {
  return setupRealtimeWithReconnect(() => {
    return listenNotifications({
      targetUser: 'user',
      userId,
      onInsert: onNewNotification,
      onError: (error) => {
        console.error('Error en Realtime:', error)
      }
    })
  })
}

/**
 * Resetear completamente la conexión Realtime
 * Útil cuando hay problemas persistentes
 * @param {Object} channel - Canal existente a resetear
 * @returns {Object} Nuevo canal
 */
export function resetRealtimeConnection(channel) {
  console.log('🔄 [Realtime] Reseteando conexión completamente...')
  
  try {
    // Ejecutar diagnóstico
    const diagnostics = diagnoseRealtimeConnection()
    
    // Cerrar canal existente si existe
    if (channel) {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
    
    // Limpiar todos los canales existentes
    const existingChannels = supabase.getChannels()
    existingChannels.forEach(ch => {
      try {
        supabase.removeChannel(ch)
      } catch (error) {
        console.warn('Error removiendo canal existente:', error)
      }
    })
    
    console.log('✅ [Realtime] Conexión reseteada. Los listeners necesitarán ser recreados.')
    
    return null // Indicar que se necesita crear un nuevo canal
  } catch (error) {
    console.error('❌ [Realtime] Error al resetear conexión:', error)
    return null
  }
}

// Función de utilidad para debugging desde consola del navegador
// Ejecutar en la consola:
// - diagnoseRealtime() - Para diagnóstico completo
// - resetRealtime() - Para resetear conexión
// - testRealtimeConnection() - Para verificar estado
if (typeof window !== "undefined") {
  window.diagnoseRealtime = diagnoseRealtimeConnection
  window.resetRealtime = () => resetRealtimeConnection(null)
  window.testRealtimeConnection = isRealtimeConnected
}

export default listenNotifications
