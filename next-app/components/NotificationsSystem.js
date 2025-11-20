import React from 'react'
import { useRouter } from 'next/router'
import { useNotifications } from './NotificationsProvider'

// Componente del botón de notificaciones con badge
export const NotificationsButton = ({ className = '', target = undefined }) => {
  const { notifications, togglePanel } = useNotifications()

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter(n => !n.read && (!target || n.meta?.target === target)).length
    : 0

  return (
    <button
      id="notifications-button"
      onClick={togglePanel}
      className={`notifications-btn ${className}`}
      title="Notificaciones"
      aria-haspopup="true"
      style={{
        position: 'relative',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        fontSize: '1.2rem',
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        minWidth: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      🔔
      {unreadCount > 0 && (
        <span
          className="notifications-badge"
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ef4444',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: '600',
            padding: '2px 6px',
            borderRadius: '999px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

// Componente del panel de notificaciones
export const NotificationsPanel = ({ target = undefined }) => {
  const { 
    notifications, 
    isOpen, 
    markAsRead, 
    deleteNotification,
    markAllAsRead,
    clearAll,
    closePanel
  } = useNotifications()
  const router = useRouter()

  if (!isOpen) return null

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'carrito': return '🛒'
      case 'pedido_nuevo': 
      case 'pedido_entregado': 
      case 'pedido_asignado': return '📦'
      case 'finanzas': return '💰'
      case 'producto': return '🏷️'
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      default: return '🔔'
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#3b82f6'
      default: return '#64748b'
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Cerrar el panel antes de navegar
    closePanel()
    
    // Navegar al pedido si es una notificación de pedido
    if (notification.meta?.pedidoId || notification.meta?.orderId) {
      const pedidoId = notification.meta.pedidoId || notification.meta.orderId
      router.push(`/admin/orders/detalle-pedido/${pedidoId}`)
    }
  }

  return (
    <div
      id="notifications-panel"
      style={{
        position: 'fixed',
        top: '70px',
        right: '12px',
        width: '400px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '80vh',
        background: 'var(--bg-card)',
        border: '2px solid var(--accent-blue)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 9999,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
          Notificaciones
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                Marcar todas
              </button>
              <button
                onClick={clearAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-red)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxHeight: 'calc(70vh - 70px)',
        overflowY: 'auto',
        padding: '8px'
      }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🔔</div>
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(target 
                ? notifications.filter(n => n.meta?.target === target) 
                : notifications
              ).slice(0, 20).map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  background: notification.read ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  border: notification.read ? '1px solid var(--border-color)' : '1px solid var(--accent-blue)40',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    fontSize: '1.5rem',
                    minWidth: '32px',
                    textAlign: 'center'
                  }}>
                    {getNotificationIcon(notification.meta?.tipo || notification.type)}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: notification.read ? '500' : '600',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      marginBottom: '4px'
                    }}>
                      {notification.title}
                    </div>
                    
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      lineHeight: '1.3',
                      marginBottom: '8px'
                    }}>
                      {notification.body}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem'
                      }}>
                        {notification.date}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-red)',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          lineHeight: 1
                        }}
                        title="Eliminar notificación"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                
                {!notification.read && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    background: getNotificationColor(notification.meta?.tipo || notification.type),
                    borderRadius: '50%'
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { useNotifications } from './NotificationsProvider'