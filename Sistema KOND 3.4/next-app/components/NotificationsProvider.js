import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationsContext = createContext()

// Componente proveedor para el sistema de notificaciones
export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Cargar notificaciones del localStorage
  const loadNotifications = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('notifications')
      const list = stored ? JSON.parse(stored) : []
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.read).length)
    } catch (error) {
      console.error('Error loading notifications:', error)
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])

  // Guardar notificaciones en localStorage
  const saveNotifications = useCallback((list) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('notifications', JSON.stringify(list))
      localStorage.setItem('notifications_updated', new Date().toISOString())
      
      // Disparar evento personalizado
      window.dispatchEvent(new CustomEvent('notifications:updated'))
    } catch (error) {
      console.error('Error saving notifications:', error)
    }
  }, [])

  // Añadir nueva notificación
  const addNotification = useCallback(({ 
    title, 
    body, 
    type = 'info',
    meta = {},
    read = false 
  }) => {
    const newNotification = {
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

    const updatedList = [newNotification, ...notifications].slice(0, 300)
    setNotifications(updatedList)
    setUnreadCount(updatedList.filter(n => !n.read).length)
    saveNotifications(updatedList)

    return newNotification
  }, [notifications, saveNotifications])

  // Marcar notificación como leída
  const markAsRead = useCallback((id) => {
    const updatedList = notifications.map(n => 
      String(n.id) === String(id) ? { ...n, read: true } : n
    )
    setNotifications(updatedList)
    setUnreadCount(updatedList.filter(n => !n.read).length)
    saveNotifications(updatedList)
  }, [notifications, saveNotifications])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    const updatedList = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updatedList)
    setUnreadCount(0)
    saveNotifications(updatedList)
  }, [notifications, saveNotifications])

  // Eliminar notificación
  const deleteNotification = useCallback((id) => {
    const updatedList = notifications.filter(n => String(n.id) !== String(id))
    setNotifications(updatedList)
    setUnreadCount(updatedList.filter(n => !n.read).length)
    saveNotifications(updatedList)
  }, [notifications, saveNotifications])

  // Limpiar todas las notificaciones
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    saveNotifications([])
  }, [saveNotifications])

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

  // Escuchar eventos de notificaciones
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleNotificationUpdate = () => {
      loadNotifications()
    }

    const handleStorage = (e) => {
      if (e.key === 'notifications_updated') {
        loadNotifications()
      }
    }

    window.addEventListener('notifications:updated', handleNotificationUpdate)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('notifications:updated', handleNotificationUpdate)
      window.removeEventListener('storage', handleStorage)
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
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    togglePanel,
    closePanel
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
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

export default NotificationsProvider