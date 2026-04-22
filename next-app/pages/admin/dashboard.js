import Layout from '../../components/Layout'
import { withAdminAuth } from '../../utils/adminAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '../../utils/catalogUtils'
import { getAllPedidosInternos } from '../../utils/supabasePedidosInternos'
import AnalyticsCard from '../../components/AnalyticsCard'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../lib/queryKeys'
import { getAllProductos } from '../../utils/supabaseProducts'
import { getAllPedidosCatalogo } from '../../utils/supabasePedidos'

const REFETCH_INTERVAL = 5 * 60 * 1000 // 5 min

function Dashboard() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // React Query — polling every 5 min, never cached (staleTime: 0 for real-time data)
  const {
    data: productosResult,
    isFetching: fetchingProductos,
  } = useQuery({
    queryKey: QUERY_KEYS.productos.list(),
    queryFn: getAllProductos,
    staleTime: STALE_TIMES.productos_admin,
    refetchInterval: REFETCH_INTERVAL,
  })

  const {
    data: catalogoResult,
    isFetching: fetchingCatalogo,
  } = useQuery({
    queryKey: QUERY_KEYS.pedidos.catalogo(),
    queryFn: getAllPedidosCatalogo,
    staleTime: STALE_TIMES.pedidos,
    refetchInterval: REFETCH_INTERVAL,
  })

  const {
    data: pedidosInternosResult,
    isFetching: fetchingInternos,
  } = useQuery({
    queryKey: ['pedidos', 'internos'],
    queryFn: getAllPedidosInternos,
    staleTime: STALE_TIMES.pedidos,
    refetchInterval: REFETCH_INTERVAL,
  })

  const loading = fetchingProductos || fetchingCatalogo || fetchingInternos

  // Derive data arrays from query results
  const productos = productosResult?.data || []
  const pedidosCatalogo = catalogoResult?.data || []
  const pedidosInternos = pedidosInternosResult?.data || []

  // Calcular estadísticas
  const totalProducts = productos.filter(p => p.active !== false && p.publicado).length
  const totalOrders = pedidosInternos.length + pedidosCatalogo.length

  const totalRevenue = pedidosCatalogo.reduce((sum, order) => sum + (order.total || 0), 0)

  const deliveredOrders = pedidosCatalogo.filter(order => order.estado === 'entregado')
  const totalDeliveredAmount = deliveredOrders.reduce((sum, order) => sum + (order.total || 0), 0)

  const pendingOrdersFiltered = pedidosCatalogo.filter(order => order.estado_pago === 'sin_seña')
  const pendingOrders = pendingOrdersFiltered.length
  const pendingOrdersAmount = pendingOrdersFiltered.reduce((sum, order) => sum + (order.total || 0), 0)

  const deliveredPendingPayment = pedidosCatalogo.filter(order =>
    order.estado === 'entregado' && order.estado_pago !== 'pagado'
  )
  const deliveredPendingAmount = deliveredPendingPayment.reduce((sum, order) => sum + (order.total || 0), 0)

  const completedOrders = pedidosCatalogo.filter(order =>
    order.estado_pago === 'pagado' || order.estado === 'entregado'
  ).length

  const lowStockProducts = productos.filter(p =>
    p.tipo === 'Stock' && (p.stock || 0) < 5
  ).length

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonthOrdersList = pedidosCatalogo.filter(order => {
    const orderDate = new Date(order.fecha_creacion || order.created_at)
    return orderDate >= firstDayOfMonth
  })

  // Ingresos del mes: sumar montos efectivamente recibidos cuando existan
  // - Si `monto_recibido` está presente, usarlo (registro de pago parcial/completo)
  // - Si estado 'pagado', sumar `total`
  // - Si estado 'seña_pagada' y no hay `monto_recibido`, sumar 50% como fallback
  const thisMonthRevenue = thisMonthOrdersList.reduce((sum, order) => {
    const montoRecibido = order.monto_recibido != null ? Number(order.monto_recibido) : null
    if (montoRecibido !== null) return sum + montoRecibido
    if (order.estado_pago === 'pagado') return sum + Number(order.total || 0)
    if (order.estado_pago === 'seña_pagada') {
      // fallback: asumir seña del 50% si no hay registro explícito
      return sum + Number(order.total || 0) * 0.5
    }
    return sum
  }, 0)

  const thisMonthDelivered = thisMonthOrdersList
    .filter(order => order.estado === 'entregado')
    .reduce((sum, order) => sum + (order.total || 0), 0)

  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const lastMonthOrders = pedidosCatalogo.filter(order => {
    const orderDate = new Date(order.fecha_creacion || order.created_at)
    return orderDate >= firstDayOfLastMonth && orderDate <= lastDayOfLastMonth
  })

  const lastMonthRevenue = lastMonthOrders
    .filter(order => order.estado_pago === 'seña_pagada' || order.estado_pago === 'pagado')
    .reduce((sum, order) => sum + (order.total || 0), 0)

  const ordersTrend = lastMonthOrders.length > 0
    ? ((thisMonthOrdersList.length - lastMonthOrders.length) / lastMonthOrders.length * 100)
    : thisMonthOrdersList.length > 0 ? 100 : 0

  const revenueTrend = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
    : thisMonthRevenue > 0 ? 100 : 0

  const stats = {
    totalProducts,
    totalOrders,
    totalRevenue,
    totalDeliveredAmount,
    pendingOrders,
    pendingOrdersAmount,
    deliveredPendingAmount,
    thisMonthRevenue,
    thisMonthDelivered,
    thisMonthOrders: thisMonthOrdersList.length,
    lowStockProducts,
    completedOrders,
  }

  const trends = {
    productsTrend: 0,
    ordersTrend: Math.round(ordersTrend),
    revenueTrend: Math.round(revenueTrend),
    pendingTrend: 0,
  }

  // Obtener pedidos recientes (últimos 5)
  const getRecentOrders = () => {
    return [...pedidosCatalogo]
      .sort((a, b) => new Date(b.fecha_creacion || b.created_at) - new Date(a.fecha_creacion || a.created_at))
      .slice(0, 5)
  }

  // Obtener productos con bajo stock
  const getLowStockProducts = () => {
    return productos
      .filter(p => p.tipo === 'Stock' && (p.stock || 0) < 5)
      .slice(0, 5)
  }

  // Formatear tendencia
  const formatTrend = (value) => {
    if (value === 0) return { text: '0%', color: 'var(--text-secondary)', icon: '—' }
    const isPositive = value > 0
    return {
      text: `${isPositive ? '+' : ''}${value}%`,
      color: isPositive ? '#10b981' : '#ef4444',
      icon: isPositive ? '↑' : '↓'
    }
  }

  if (!isMounted) return null

  return (
    <Layout title="Dashboard - Sistema KOND">
      <div style={{ padding: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px' 
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--person-color)',
              marginBottom: '8px'
            }}>
              📊 Dashboard Administrativo
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Métricas en tiempo real • Actualización automática cada 5 min
            </p>
          </div>
          
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-blue)',
              fontSize: '0.9rem'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--accent-blue)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Actualizando...
            </div>
          )}
        </div>

        {/* Tarjetas de estadísticas principales con tendencias */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <AnalyticsCard
            title="Productos Publicados"
            value={stats.totalProducts}
            icon="📦"
            color="#3b82f6"
            trend={formatTrend(trends.productsTrend)}
            subtitle="En catálogo"
            compact
          />
          <AnalyticsCard
            title="Pedidos Este Mes"
            value={stats.thisMonthOrders}
            icon="📋"
            color="#10b981"
            trend={formatTrend(trends.ordersTrend)}
            subtitle={`${stats.totalOrders} totales`}
            compact
          />
          <AnalyticsCard
            title="Ingresos del Mes"
            value={formatCurrency(stats.thisMonthRevenue)}
            icon="💰"
            color="#f59e0b"
            isAmount
            trend={formatTrend(trends.revenueTrend)}
            subtitle={`${formatCurrency(stats.thisMonthDelivered)} entregados este mes • ${formatCurrency(stats.totalRevenue)} totales`}
            compact
          />
          <AnalyticsCard
            title="Pedidos Pendientes"
            value={stats.pendingOrders}
            icon="⏳"
            color="#ef4444"
            trend={formatTrend(trends.pendingTrend)}
            subtitle={`${formatCurrency(stats.pendingOrdersAmount)} por confirmar${stats.deliveredPendingAmount > 0 ? ` • ${formatCurrency(stats.deliveredPendingAmount)} entregados` : ''}`}
            compact
          />
        </div>

        {/* Alerta de stock bajo */}
        {stats.lowStockProducts > 0 && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#92400e' }}>Atención: </strong>
              <span style={{ color: '#78350f' }}>
                {stats.lowStockProducts} producto{stats.lowStockProducts > 1 ? 's tienen' : ' tiene'} stock bajo
              </span>
            </div>
            <Link href="/admin/products" style={{
              background: '#f59e0b',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              Ver productos
            </Link>
          </div>
        )}

        {/* Secciones principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {/* Pedidos recientes */}
          <DashboardSection title="📋 Pedidos Recientes" href="/admin/orders">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getRecentOrders().length > 0 ? (
                getRecentOrders().map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  padding: '20px'
                }}>
                  No hay pedidos recientes
                </div>
              )}
            </div>
          </DashboardSection>

          {/* Acciones rápidas */}
          <DashboardSection title="⚡ Acciones Rápidas">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              <QuickActionButton
                href="/admin/calendar"
                icon="📅"
                title="Calendario"
                subtitle="Producción"
              />
              <QuickActionButton
                href="/admin/products"
                icon="⚙️"
                title="Productos"
                subtitle="Gestionar inventario"
              />
              <QuickActionButton
                href="/admin/orders"
                icon="📋"
                title="Pedidos"
                subtitle="Órdenes internas"
              />
              <QuickActionButton
                href="/admin/pedidos-catalogo"
                icon="🛒"
                title="Pedidos Catálogo"
                subtitle="Órdenes públicas"
              />
              <QuickActionButton
                href="/admin/database"
                icon="🎯"
                title="Marketing"
                subtitle="Promociones"
              />
              <QuickActionButton
                href="/admin/payment-config"
                icon="💳"
                title="Finalizar Compra"
                subtitle="Configuración de checkout"
              />
            </div>
          </DashboardSection>

          {/* Estado del sistema con datos reales */}
          <DashboardSection title="🔧 Estado del Sistema">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <SystemStatusItem
                label="Conexión Supabase"
                status={!loading ? "operational" : "loading"}
                value={!loading ? "Conectado" : "Verificando..."}
              />
              <SystemStatusItem
                label="Pedidos totales"
                status="operational"
                value={`${stats.totalOrders} registros`}
              />
              <SystemStatusItem
                label="Stock bajo"
                status={stats.lowStockProducts > 0 ? "warning" : "operational"}
                value={stats.lowStockProducts > 0 ? `${stats.lowStockProducts} productos` : "Sin alertas"}
              />
              <SystemStatusItem
                label="Pedidos pendientes"
                status={stats.pendingOrders > 5 ? "warning" : "operational"}
                value={stats.pendingOrders > 0 ? `${stats.pendingOrders} por revisar` : "Al día"}
              />
              <SystemStatusItem
                label="Sincronización"
                status="operational"
                value="Automática cada 5min"
              />
            </div>
          </DashboardSection>

          {/* Productos con bajo stock */}
          <DashboardSection title="⚠️ Stock Bajo" href="/admin/calendar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getLowStockProducts().length > 0 ? (
                getLowStockProducts().map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  padding: '20px'
                }}>
                  ✅ Todos los productos tienen stock suficiente
                </div>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>
    </Layout>
  )
}

// Componente de tarjeta de estadística con tendencias
// StatsCard extracted to components/AnalyticsCard.js

// Componente de sección del dashboard
function DashboardSection({ title, children, href }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0
        }}>
          {title}
        </h2>
        {href && (
          <Link href={href} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Ver todo →
          </Link>
        )}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

// Componente de tarjeta de pedido
function OrderCard({ order }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'sin_seña': return '#f59e0b'
      case 'seña_pagada': return '#3b82f6'
      case 'pagado': return '#10b981'
      default: return 'var(--text-secondary)'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'sin_seña': return 'Sin seña'
      case 'seña_pagada': return 'Seña pagada'
      case 'pagado': return 'Pagado'
      default: return 'Desconocido'
    }
  }

  // Formatear fecha desde Supabase
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  return (
    <div style={{
      padding: '12px',
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      cursor: 'pointer',
      transition: 'border-color 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          #{order.id}
        </span>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-secondary)'
        }}>
          {formatDate(order.fecha_creacion || order.created_at)}
        </span>
      </div>
      <div style={{
        marginBottom: '8px'
      }}>
        <span style={{
          background: getStatusColor(order.estado_pago || order.estadoPago) + '20',
          color: getStatusColor(order.estado_pago || order.estadoPago),
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          {getStatusText(order.estado_pago || order.estadoPago)}
        </span>
      </div>
      <div style={{
        color: 'var(--text-secondary)',
        fontSize: '0.8rem',
        marginBottom: '8px'
      }}>
        {typeof order.cliente === 'object' ? order.cliente?.nombre : order.cliente || 'Sin nombre'} • {order.metodo_pago || order.metodoPago || 'Sin método'}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          color: 'var(--text-secondary)',
          fontSize: '0.75rem'
        }}>
          {Array.isArray(order.items) ? order.items.length : 0} producto{Array.isArray(order.items) && order.items.length !== 1 ? 's' : ''}
        </span>
        <span style={{
          fontWeight: 700,
          color: 'var(--accent-blue)',
          fontSize: '0.95rem'
        }}>
          {formatCurrency(order.total || 0)}
        </span>
      </div>
    </div>
  )
}

// Componente de tarjeta de producto
function ProductCard({ product }) {
  return (
    <div style={{
      padding: '12px',
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
      }}>
        <span style={{
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          {product.nombre}
        </span>
        <span style={{
          background: '#ef444420',
          color: '#ef4444',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 500
        }}>
          Stock: {product.stockActual || 0}
        </span>
      </div>
      <div style={{
        color: 'var(--text-secondary)',
        fontSize: '0.8rem'
      }}>
        {product.categoria} • {product.medidas}
      </div>
    </div>
  )
}

// Componente de botón de acción rápida
function QuickActionButton({ href, onClick, icon, title, subtitle, isButton }) {
  const content = (
    <>
      <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: 600,
        marginBottom: '2px'
      }}>
        {title}
      </div>
      <div style={{
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)'
      }}>
        {subtitle}
      </div>
    </>
  )

  const commonStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  }

  const handleMouseEnter = (e) => {
    e.currentTarget.style.background = 'var(--bg-hover)'
    e.currentTarget.style.transform = 'translateY(-2px)'
  }

  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = 'var(--bg-secondary)'
    e.currentTarget.style.transform = 'translateY(0)'
  }

  if (isButton || onClick) {
    return (
      <button
        onClick={onClick}
        style={commonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      href={href}
      style={commonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
    </Link>
  )
}

// Componente de estado del sistema
function SystemStatusItem({ label, status, value }) {
  const getStatusColor = () => {
    switch (status) {
      case 'operational': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'error': return '#ef4444'
      case 'loading': return '#3b82f6'
      default: return 'var(--text-secondary)'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'operational': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'loading': return '🔄'
      default: return '⚪'
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      border: `1px solid ${status === 'warning' ? '#fbbf2420' : status === 'error' ? '#ef444420' : 'var(--border-color)'}`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '1.1rem' }}>{getStatusIcon()}</span>
        <span style={{
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          {label}
        </span>
      </div>
      <span style={{
        color: getStatusColor(),
        fontSize: '0.8rem',
        fontWeight: 600
      }}>
        {value}
      </span>
    </div>
  )
}

export default withAdminAuth(Dashboard)
