import Layout from '../components/Layout'
import withAdminAuth from '../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { useInternalOrders } from '../hooks/useCatalog'
import { formatCurrency, formatDate } from '../utils/catalogUtils'

function Pedidos() {
  // Estados para pestañas principales
  const [activeTab, setActiveTab] = useState('internos')
  
  // Hooks para datos
  const { orders: internalOrders, updateOrderStatus: updateInternalStatus } = useInternalOrders()
  
  // Estados para filtros de pedidos internos
  const [internalFilters, setInternalFilters] = useState({
    search: '',
    status: 'all'
  })
  
  // Estados para modales
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Filtrar pedidos internos
  const filteredInternalOrders = internalOrders.filter(order => {
    let matches = true
    
    if (internalFilters.search) {
      const searchTerm = internalFilters.search.toLowerCase()
      const clienteText = typeof order.cliente === 'string' 
        ? order.cliente 
        : (order.cliente?.nombre ? `${order.cliente.nombre} ${order.cliente.apellido || ''}` : '')
      
      matches = matches && (
        order.id.toString().includes(searchTerm) ||
        (clienteText && clienteText.toLowerCase().includes(searchTerm)) ||
        (order.producto && order.producto.toLowerCase().includes(searchTerm))
      )
    }
    
    if (internalFilters.status !== 'all') {
      matches = matches && order.estado === internalFilters.status
    }
    
    return matches
  })
  
  // Función para obtener emoji del estado
  const getStatusEmoji = (status) => {
    const emojis = {
      'pendiente': '⏳',
      'confirmado': '✅',
      'en_preparacion': '🔧',
      'en_produccion': '🔧',
      'listo': '📦',
      'entregado': '🎉',
      'cancelado': '❌',
      'completado': '🎉',
      'en_proceso': '🔧'
    }
    return emojis[status] || '📋'
  }
  
  // Mostrar detalles del pedido
  const showOrderDetails = (order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }
  
  // Actualizar estado del pedido
  const handleStatusUpdate = (orderId, newStatus, isInternal = false) => {
    if (isInternal) {
      updateInternalStatus(orderId, newStatus)
    } else {
      updateOrderStatus(orderId, newStatus)
    }
  }

  return (
    <Layout title="Gestión de Pedidos - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--orders-color)',
            marginBottom: '8px'
          }}>
            📦 Gestión de Pedidos
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1rem'
          }}>
            Administra pedidos internos y de clientes
          </p>
        </div>

        {/* Pestañas principales */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px'
        }}>
          <button
            onClick={() => setActiveTab('internos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: activeTab === 'internos' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'internos' ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <span>🏭</span>
            <span>Pedidos Internos</span>
            <span style={{
              background: activeTab === 'internos' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
              color: activeTab === 'internos' ? 'white' : 'var(--text-primary)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {filteredInternalOrders.length}
            </span>
          </button>
        </div>

        {/* Contenido de Pedidos Internos */}
        {activeTab === 'internos' && (
          <div>
            {/* Filtros para pedidos internos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
              background: 'var(--bg-card)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <input
                type="text"
                placeholder="Buscar pedidos internos..."
                value={internalFilters.search}
                onChange={(e) => setInternalFilters({
                  ...internalFilters,
                  search: e.target.value
                })}
                style={{
                  padding: '12px 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
              
              <select
                value={internalFilters.status}
                onChange={(e) => setInternalFilters({
                  ...internalFilters,
                  status: e.target.value
                })}
                style={{
                  padding: '12px 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">⏳ Pendiente</option>
                <option value="en_proceso">🔧 En Proceso</option>
                <option value="completado">🎉 Completado</option>
              </select>
            </div>

            {/* Lista de pedidos internos */}
            {filteredInternalOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏭</div>
                <h3 style={{ marginBottom: '8px' }}>No hay pedidos internos</h3>
                <p>Aquí aparecerán los pedidos creados desde el panel interno.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {filteredInternalOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => showOrderDetails(order)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ':hover': {
                        borderColor: 'var(--accent-blue)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          marginBottom: '4px'
                        }}>
                          {getStatusEmoji(order.estado)} Pedido #{order.id}
                        </div>
                        <div style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem'
                        }}>
                          {typeof order.cliente === 'string' 
                            ? order.cliente 
                            : (order.cliente?.nombre ? `${order.cliente.nombre} ${order.cliente.apellido || ''}` : 'Cliente interno')
                          }
                        </div>
                        <div style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.8rem'
                        }}>
                          {formatDate(order.fecha)}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <select
                          value={order.estado || 'pendiente'}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleStatusUpdate(order.id, e.target.value, true)
                          }}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En Proceso</option>
                          <option value="completado">Completado</option>
                        </select>
                      </div>
                    </div>

                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-section)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontWeight: 600,
                        marginBottom: '4px'
                      }}>
                        {order.producto}
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)'
                      }}>
                        Cantidad: {order.cantidad}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  )
}

export default withAdminAuth(Pedidos)