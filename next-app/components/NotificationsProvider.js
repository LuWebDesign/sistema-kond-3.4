import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as deleteNotificationFromDB,
  getUnreadCount
} from '../utils/supabaseNotifications'
import { listenNotifications, unsubscribeNotifications } from '../utils/listenNotifications'
import { supabase } from '../utils/supabaseClient'

const NotificationsContext = createContext()

// Componente proveedor para el sistema de notificaciones
export const NotificationsProvider = ({ children, targetUser = 'admin', userId = null }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const realtimeChannelRef = useRef(null)

  // Cargar notificaciones desde Supabase
  const loadNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return

    setIsLoading(true)
    setError(null)

    try {
      const [notificationsData, unreadCountData] = await Promise.all([
        getNotifications(targetUser, userId),
        getUnreadCount(targetUser, userId)
      ])

      setNotifications(notificationsData)
      setUnreadCount(unreadCountData)
    } catch (error) {
      console.error('Error loading notifications:', error)
      setError(error.message)

      // Fallback a localStorage si Supabase falla
      try {
        const stored = localStorage.getItem('notifications')
        const list = stored ? JSON.parse(stored) : []
        setNotifications(list)
        setUnreadCount(list.filter(n => !n.read).length)
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError)
        setNotifications([])
        setUnreadCount(0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [targetUser, userId])

  // Añadir nueva notificación
  const addNotification = useCallback(async ({
    title,
    body,
    type = 'info',
    meta = {},
    read = false
  }) => {
    try {
      const newNotification = await createNotification({
        title: title || 'Notificación',
        body: body || '',
        type,
        meta: {
          tipo: type,
          ...meta
        },
        targetUser
      })

      // Recargar notificaciones para mantener sincronización
      await loadNotifications()

      return newNotification
    } catch (error) {
      console.error('Error creando notificación:', error)

      // Fallback a localStorage si Supabase falla
      const fallbackNotification = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: title || 'Notificación',
        body: body || '',
        type,
        date: new Date().toISOString().slice(0, 10),
        read: !!read,
        meta: {
          tipo: type,
          ...meta
        }
      }

      const updatedList = [fallbackNotification, ...notifications].slice(0, 300)
      setNotifications(updatedList)
      setUnreadCount(updatedList.filter(n => !n.read).length)

      // Guardar en localStorage como respaldo
      try {
        localStorage.setItem('notifications', JSON.stringify(updatedList))
        localStorage.setItem('notifications_updated', new Date().toISOString())
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError)
      }

      return fallbackNotification
    }
  }, [notifications, targetUser, loadNotifications])

  // Marcar notificación como leída
  const markAsRead = useCallback(async (id) => {
    try {
      const success = await markNotificationAsRead(id)
      if (success) {
        // Actualizar estado local inmediatamente
        const updatedList = notifications.map(n =>
          String(n.id) === String(id) ? { ...n, read: true } : n
        )
        setNotifications(updatedList)
        setUnreadCount(updatedList.filter(n => !n.read).length)
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)

      // Fallback local
      const updatedList = notifications.map(n =>
        String(n.id) === String(id) ? { ...n, read: true } : n
      )
      setNotifications(updatedList)
      setUnreadCount(updatedList.filter(n => !n.read).length)
    }
  }, [notifications])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    try {
      const success = await markAllNotificationsAsRead(targetUser, userId)
      if (success) {
        // Actualizar estado local
        const updatedList = notifications.map(n => ({ ...n, read: true }))
        setNotifications(updatedList)
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error)

      // Fallback local
      const updatedList = notifications.map(n => ({ ...n, read: true }))
      setNotifications(updatedList)
      setUnreadCount(0)
    }
  }, [notifications, targetUser, userId])

  // Eliminar notificación
  const deleteNotification = useCallback(async (id) => {
    try {
      const success = await deleteNotificationFromDB(id)
      if (success) {
        // Actualizar estado local
        const updatedList = notifications.filter(n => String(n.id) !== String(id))
        setNotifications(updatedList)
        setUnreadCount(updatedList.filter(n => !n.read).length)
      }
    } catch (error) {
      console.error('Error eliminando notificación:', error)

      // Fallback local
      const updatedList = notifications.filter(n => String(n.id) !== String(id))
      setNotifications(updatedList)
      setUnreadCount(updatedList.filter(n => !n.read).length)
    }
  }, [notifications])

  // Limpiar todas las notificaciones
  const clearAll = useCallback(async () => {
    try {
      // Para limpiar todas, marcamos todas como leídas y luego las eliminamos
      // Nota: En una implementación real, podríamos tener un endpoint para eliminar todas
      const deletePromises = notifications.map(n => deleteNotificationFromDB(n.id))
      await Promise.all(deletePromises)

      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error limpiando todas las notificaciones:', error)

      // Fallback local
      setNotifications([])
      setUnreadCount(0)
    }
  }, [notifications])

  // Toggle del panel
  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Efectos
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Configurar listener de Realtime para notificaciones en tiempo real
  // Sólo crear la suscripción cuando exista una sesión activa (evita logs/errores en entornos públicos)
  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const setup = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.warn('⚠️ No hay sesión activa — se omite la suscripción Realtime de notificaciones')
          return
        }

        if (!mounted) return

        const channel = listenNotifications({
          targetUser,
          userId,
          onInsert: (newNotification) => {
            setNotifications(prev => [newNotification, ...prev])
            if (!newNotification.read) setUnreadCount(prev => prev + 1)
            window.dispatchEvent(new CustomEvent('notifications:new', { detail: newNotification }))
          },
          onUpdate: (updatedNotification) => {
            setNotifications(prev => 
              prev.map(n => String(n.id) === String(updatedNotification.id) ? updatedNotification : n)
            )
            setNotifications(prev => {
              const newCount = prev.filter(n => !n.read).length
              setUnreadCount(newCount)
              return prev
            })
          },
          onDelete: (deletedNotification) => {
            setNotifications(prev => prev.filter(n => String(n.id) !== String(deletedNotification.id)))
            setNotifications(prev => {
              const newCount = prev.filter(n => !n.read).length
              setUnreadCount(newCount)
              return prev
            })
          },
          onError: (error) => {
            console.error('❌ [Provider] Error en Realtime:', error)
            setError(error.message)
          }
        })

        realtimeChannelRef.current = channel
      } catch (err) {
        console.error('Error comprobando sesión antes de crear Realtime listener:', err)
      }
    }

    setup()

    return () => {
      mounted = false
      if (realtimeChannelRef.current) {
        unsubscribeNotifications(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [targetUser, userId])

  // Escuchar eventos de notificaciones (mantener para compatibilidad)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleNotificationUpdate = () => {
      loadNotifications()
    }

    window.addEventListener('notifications:updated', handleNotificationUpdate)

    return () => {
      window.removeEventListener('notifications:updated', handleNotificationUpdate)
    }
  }, [loadNotifications])

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      const panel = document.getElementById('notifications-panel')
      const button = document.getElementById('notifications-button')

      if (panel && button && !panel.contains(e.target) && !button.contains(e.target)) {
        closePanel()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen, closePanel])

  const value = {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    togglePanel,
    closePanel,
    reloadNotifications: loadNotifications
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

// Hook para usar el contexto
export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  // Retornar null en lugar de lanzar error para páginas públicas sin provider
  if (!context) {
    return null
  }
  return context
}

export default NotificationsProvider