import Layout from '../components/Layout'
import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/catalogUtils'
import { getAllProductos, mapProductoToFrontend } from '../utils/supabaseProductos'
import { getAllPedidosInternos } from '../utils/supabasePedidosInternos'
import { getAllPedidosCatalogo } from '../utils/supabasePedidos'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [catalogOrders, setCatalogOrders] = useState([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  })

  // Cargar datos
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    const [prodResult, pedidosResult, catalogoResult] = await Promise.all([
      getAllProductos(),
      getAllPedidosInternos(),
      getAllPedidosCatalogo()
    ])

    const productosBase = prodResult.data ? prodResult.data.map(mapProductoToFrontend) : []
    const pedidos = pedidosResult.data || []
    const pedidosCatalogo = catalogoResult.data || []

    setProducts(productosBase)
    setOrders(pedidos)
    setCatalogOrders(pedidosCatalogo)

    const totalProducts = productosBase.filter(p => p.active).length
    const totalOrders = pedidos.length + pedidosCatalogo.length
    const totalRevenue = pedidosCatalogo.reduce((sum, order) => sum + (order.total || 0), 0)
    const pendingOrders = pedidosCatalogo.filter(order =>
      order.estado_pago === 'sin_seña' || order.estado_pago === 'seña_pagada'
    ).length

    setStats({ totalProducts, totalOrders, totalRevenue, pendingOrders })
  }

  // Obtener pedidos recientes
  const getRecentOrders = () => {
    return catalogOrders
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      .slice(0, 5)
  }

  // Obtener productos con bajo stock
  const getLowStockProducts = () => {
    return products
      .filter(p => p.tipo === 'Stock' && (p.stockActual || 0) < 5)
      .slice(0, 5)
  }

  return (
    <Layout title="Dashboard - Sistema KOND">
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '8px'
          }}>
            📊 Dashboard Administrativo
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Panel de control y métricas del sistema
          </p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <StatsCard
            title="Productos Activos"
            value={stats.totalProducts}
            icon="📦"
            color="#3b82f6"
          />
          <StatsCard
            title="Total Pedidos"
            value={stats.totalOrders}
            icon="📋"
            color="#10b981"
          />
          <StatsCard
            title="Ingresos Totales"
            value={formatCurrency(stats.totalRevenue)}
            icon="💰"
            color="#f59e0b"
            isAmount
          />
          <StatsCard
            title="Pedidos Pendientes"
            value={stats.pendingOrders}
            icon="⏳"
            color="#ef4444"
          />
        </div>

        {/* Secciones principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {/* Pedidos recientes */}
          <DashboardSection title="📋 Pedidos Recientes" href="/orders">
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

          {/* Productos con bajo stock */}
          <DashboardSection title="⚠️ Stock Bajo" href="/catalog">
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

          {/* Acciones rápidas */}
          <DashboardSection title="⚡ Acciones Rápidas">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              <QuickActionButton
                href="/catalog"
                icon="📦"
                title="Ver Catálogo"
                subtitle="Gestionar productos"
              />
              <QuickActionButton
                href="/orders"
                icon="📋"
                title="Ver Pedidos"
                subtitle="Gestionar órdenes"
              />
              <QuickActionButton
                href="/marketing"
                icon="🎯"
                title="Marketing"
                subtitle="Promociones"
              />
              <QuickActionButton
                href="/tracking"
                icon="📍"
                title="Tracking"
                subtitle="Seguimiento"
              />
            </div>
          </DashboardSection>

          {/* Estado del sistema */}
          <DashboardSection title="🔧 Estado del Sistema">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <SystemStatusItem
                label="Base de datos"
                status="operational"
                value="Funcionando"
              />
              <SystemStatusItem
                label="Productos cargados"
                status="operational"
                value={`${stats.totalProducts} productos`}
              />
              <SystemStatusItem
                label="Último backup"
                status="warning"
                value="Hace 2 días"
              />
              <SystemStatusItem
                label="Espacio de almacenamiento"
                status="operational"
                value="85% disponible"
              />
            </div>
          </DashboardSection>
        </div>
      </div>
    </Layout>
  )
}

// Componente de tarjeta de estadística
function StatsCard({ title, value, icon, color, isAmount = false }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        fontSize: '2rem',
        background: `${color}20`,
        padding: '12px',
        borderRadius: '8px',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px',
          fontWeight: 500
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: isAmount ? '1.3rem' : '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0
        }}>
          {value}
        </p>
      </div>
    </div>
  )
}

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
          <a
            href={href}
            style={{
              color: 'var(--accent-blue)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Ver todo →
          </a>
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
          background: getStatusColor(order.estadoPago) + '20',
          color: getStatusColor(order.estadoPago),
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 500
        }}>
          {getStatusText(order.estadoPago)}
        </span>
      </div>
      <div style={{
        color: 'var(--text-secondary)',
        fontSize: '0.8rem',
        marginBottom: '4px'
      }}>
        {order.cliente?.nombre} • {order.metodoPago}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          color: 'var(--text-secondary)',
          fontSize: '0.8rem'
        }}>
          {order.items?.length || 0} productos
        </span>
        <span style={{
          fontWeight: 600,
          color: 'var(--accent-blue)',
          fontSize: '0.9rem'
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
function QuickActionButton({ href, icon, title, subtitle }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'var(--text-primary)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
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
    </a>
  )
}

// Componente de estado del sistema
function SystemStatusItem({ label, status, value }) {
  const getStatusColor = () => {
    switch (status) {
      case 'operational': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'error': return '#ef4444'
      default: return 'var(--text-secondary)'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'operational': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return '⚪'
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>{getStatusIcon()}</span>
        <span style={{
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          {label}
        </span>
      </div>
      <span style={{
        color: getStatusColor(),
        fontSize: '0.8rem',
        fontWeight: 500
      }}>
        {value}
      </span>
    </div>
  )
}