// ============================================
// SUPABASE REALTIME - LISTENER DE NOTIFICACIONES
// Sistema de escucha en tiempo real para notificaciones
// ============================================

import { supabase } from './supabaseClient'

/**
 * Configurar listener de Realtime para notificaciones
 * Escucha INSERT en la tabla 'notifications' y ejecuta callback
 * 
 * @param {Object} options - Opciones de configuración
 * @param {string} options.targetUser - Usuario objetivo: 'admin' o 'user'
 * @param {string} options.userId - ID del usuario (opcional, para filtrar notificaciones de user)
 * @param {Function} options.onInsert - Callback cuando se inserta una notificación
 * @param {Function} options.onUpdate - Callback cuando se actualiza una notificación
 * @param {Function} options.onDelete - Callback cuando se elimina una notificación
 * @param {Function} options.onError - Callback para manejar errores
 * @returns {Object} Canal de Supabase (para poder cancelar la suscripción)
 * 
 * @example
 * const channel = listenNotifications({
 *   targetUser: 'admin',
 *   onInsert: (notification) => {
 *     console.log('Nueva notificación:', notification)
 *     // Actualizar estado, mostrar toast, etc.
 *   }
 * })
 * 
 * // Para cancelar la suscripción:
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
    console.warn('⚠️ Supabase no está inicializado. Realtime no funcionará.')
    return null
  }

  // Nombre único del canal para evitar conflictos
  const channelName = `notifications:${targetUser}${userId ? `:${userId}` : ''}`

  // Crear canal de Realtime
  const channel = supabase
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

        // Ejecutar callback de inserción
        if (onInsert && typeof onInsert === 'function') {
          try {
            onInsert(payload.new)
          } catch (error) {
            console.error('❌ [Realtime] Error en callback onInsert:', error)
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

        // Ejecutar callback de actualización
        if (onUpdate && typeof onUpdate === 'function') {
          try {
            onUpdate(payload.new, payload.old)
          } catch (error) {
            console.error('❌ [Realtime] Error en callback onUpdate:', error)
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

        // Ejecutar callback de eliminación
        if (onDelete && typeof onDelete === 'function') {
          try {
            onDelete(payload.old)
          } catch (error) {
            console.error('❌ [Realtime] Error en callback onDelete:', error)
            if (onError) onError(error)
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        if (onError) onError(new Error('Canal de Realtime falló'))
      }
    })

  // Retornar el canal para permitir cancelar la suscripción
  return channel
}

/**
 * Cancelar suscripción a notificaciones
 * @param {Object} channel - Canal retornado por listenNotifications
 * @returns {Promise<void>}
 */
export async function unsubscribeNotifications(channel) {
  if (!channel) return

  try {
    await supabase.removeChannel(channel)
  } catch (error) {
    console.error('Error al cancelar suscripción:', error)
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
 * 
 * @example
 * useEffect(() => {
 *   const { cleanup } = setupRealtimeForAdmin((notification) => {
 *     console.log('Nueva notificación:', notification)
 *   })
 *   
 *   return cleanup
 * }, [])
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

export default listenNotifications
