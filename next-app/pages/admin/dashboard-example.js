// ============================================
// EJEMPLO DE INTEGRACIÓN - DASHBOARD ADMIN
// Cómo usar el sistema de notificaciones en tiempo real
// ============================================

import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { NotificationsButton, NotificationsPanel } from '../../components/NotificationsSystem'
import { useNotifications } from '../../components/NotificationsProvider'
import { useToast } from '../../hooks/useToast'
import { useState, useEffect } from 'react'

function AdminDashboard() {
  const notificationsContext = useNotifications()
  const { notifications, unreadCount, isLoading } = notificationsContext || { notifications: [], unreadCount: 0, isLoading: false }
  const toast = useToast()
  
  const [stats, setStats] = useState({
    pedidosPendientes: 0,
    pedidosEntregados: 0,
    ventasHoy: 0,
    productosBajoStock: 0
  })

  // Cargar estadísticas del dashboard
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // Aquí cargarías las estadísticas reales desde Supabase
    // Este es solo un ejemplo
    setStats({
      pedidosPendientes: 5,
      pedidosEntregados: 12,
      ventasHoy: 45000,
      productosBajoStock: 3
    })
  }

  // Ejemplo: Crear notificación de prueba
  const handleTestNotification = () => {
    toast.success(
      'Notificación de prueba',
      'Esta es una notificación de prueba del sistema en tiempo real'
    )
  }

  return (
    <Layout title="Dashboard - KOND">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Dashboard Administrativo</h1>
          <button 
            onClick={handleTestNotification}
            style={styles.testButton}
          >
            🧪 Probar Notificación
          </button>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <StatCard
            title="Pedidos Pendientes"
            value={stats.pedidosPendientes}
            icon="📦"
            color="#3b82f6"
          />
          <StatCard
            title="Pedidos Entregados"
            value={stats.pedidosEntregados}
            icon="✅"
            color="#10b981"
          />
          <StatCard
            title="Ventas Hoy"
            value={`$${stats.ventasHoy.toLocaleString()}`}
            icon="💰"
            color="#f59e0b"
          />
          <StatCard
            title="Productos Bajo Stock"
            value={stats.productosBajoStock}
            icon="⚠️"
            color="#ef4444"
          />
        </div>

        {/* Notificaciones Recientes */}
        <div style={styles.notificationsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              Notificaciones Recientes
              {unreadCount > 0 && (
                <span style={styles.badge}>{unreadCount}</span>
              )}
            </h2>
          </div>

          {isLoading ? (
            <div style={styles.loading}>Cargando notificaciones...</div>
          ) : notifications.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🔔</div>
              <p style={styles.emptyText}>No hay notificaciones</p>
            </div>
          ) : (
            <div style={styles.notificationsList}>
              {notifications.slice(0, 5).map(notification => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div style={styles.quickActions}>
          <h2 style={styles.sectionTitle}>Acciones Rápidas</h2>
          <div style={styles.actionsGrid}>
            <ActionButton
              label="Nuevo Pedido"
              icon="➕"
              href="/admin/orders/new"
            />
            <ActionButton
              label="Ver Calendario"
              icon="📅"
              href="/admin/calendar"
            />
            <ActionButton
              label="Gestionar Productos"
              icon="🏷️"
              href="/admin/products"
            />
            <ActionButton
              label="Finanzas"
              icon="💵"
              href="/admin/finanzas"
            />
          </div>
        </div>
      </div>

      {/* Panel de notificaciones (se muestra al hacer clic en el botón del Layout) */}
      <NotificationsPanel target="admin" />
    </Layout>
  )
}

// Componente de tarjeta de estadística
function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statContent}>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statTitle}>{title}</div>
      </div>
    </div>
  )
}

// Componente de item de notificación
function NotificationItem({ notification }) {
  const getIcon = (type) => {
    switch (type) {
      case 'pedido_nuevo': return '🛒'
      case 'pedido_entregado': return '✅'
      case 'finanzas': return '💰'
      case 'producto': return '🏷️'
      case 'success': return '✨'
      case 'error': return '❌'
      default: return '🔔'
    }
  }

  return (
    <div style={{
      ...styles.notificationItem,
      background: notification.read ? 'var(--bg-secondary)' : 'var(--bg-card)',
      border: notification.read ? '1px solid var(--border-color)' : '1px solid var(--accent-blue)'
    }}>
      <div style={styles.notificationIcon}>
        {getIcon(notification.meta?.tipo || notification.type)}
      </div>
      <div style={styles.notificationContent}>
        <div style={{
          ...styles.notificationTitle,
          fontWeight: notification.read ? '500' : '600'
        }}>
          {notification.title}
        </div>
        <div style={styles.notificationBody}>
          {notification.body}
        </div>
        <div style={styles.notificationTime}>
          {new Date(notification.created_at).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
      {!notification.read && (
        <div style={styles.unreadDot} />
      )}
    </div>
  )
}

// Componente de botón de acción rápida
function ActionButton({ label, icon, href }) {
  return (
    <a href={href} style={styles.actionButton}>
      <div style={styles.actionIcon}>{icon}</div>
      <div style={styles.actionLabel}>{label}</div>
    </a>
  )
}

// Estilos
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  testButton: {
    background: 'var(--accent-blue)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'var(--bg-card)',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s ease'
  },
  statIcon: {
    fontSize: '2.5rem'
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  },
  statTitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  notificationsSection: {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: 'var(--shadow-sm)'
  },
  sectionHeader: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  badge: {
    background: '#ef4444',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '999px',
    minWidth: '24px',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-secondary)'
  },
  empty: {
    textAlign: 'center',
    padding: '40px'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '12px'
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    position: 'relative',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  notificationIcon: {
    fontSize: '1.5rem',
    minWidth: '32px',
    textAlign: 'center'
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    marginBottom: '4px'
  },
  notificationBody: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: '1.4',
    marginBottom: '6px'
  },
  notificationTime: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem'
  },
  unreadDot: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '8px',
    height: '8px',
    background: '#3b82f6',
    borderRadius: '50%'
  },
  quickActions: {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '20px'
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  actionIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px'
  },
  actionLabel: {
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'center'
  }
}

export default withAdminAuth(AdminDashboard)
