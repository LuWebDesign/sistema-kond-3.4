import Layout from '../components/Layout'
import { useState, useEffect } from 'react'
import { useOrders } from '../hooks/useCatalog'
import { formatCurrency, formatDate } from '../utils/catalogUtils'

export default function Orders() {
  const { orders, updateOrderStatus, updateOrderPaymentStatus } = useOrders()
  const [filteredOrders, setFilteredOrders] = useState([])
  const [filters, setFilters] = useState({
    status: 'all',
    payment: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...orders]

    // Filtrar por estado
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.estado === filters.status)
    }

    // Filtrar por método de pago
    if (filters.payment !== 'all') {
      filtered = filtered.filter(order => order.metodoPago === filters.payment)
    }

    // Filtrar por fecha
    if (filters.dateFrom) {
      filtered = filtered.filter(order => 
        new Date(order.fechaCreacion) >= new Date(filters.dateFrom)
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order => 
        new Date(order.fechaCreacion) <= new Date(filters.dateTo + 'T23:59:59')
      )
    }

    // Filtrar por búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(order => 
        order.id.toString().includes(searchTerm) ||
        order.cliente.nombre.toLowerCase().includes(searchTerm) ||
        order.cliente.email.toLowerCase().includes(searchTerm) ||
        (order.cliente.telefono && order.cliente.telefono.includes(searchTerm))
      )
    }

    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))

    setFilteredOrders(filtered)
  }, [orders, filters])

  // Manejar cambios en filtros
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Obtener color del estado
  const getStatusColor = (status) => {
    const colors = {
      'pendiente': '#f59e0b',
      'confirmado': '#3b82f6',
      'en_preparacion': '#8b5cf6',
      'listo': '#10b981',
      'entregado': '#059669',
      'cancelado': '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  // Obtener color del método de pago
  const getPaymentColor = (method) => {
    const colors = {
      'transferencia': '#3b82f6',
      'whatsapp': '#10b981',
      'retiro': '#f59e0b'
    }
    return colors[method] || '#6b7280'
  }

  // Obtener emoji del estado
  const getStatusEmoji = (status) => {
    const emojis = {
      'pendiente': '⏳',
      'confirmado': '✅',
      'en_preparacion': '🔨',
      'listo': '📦',
      'entregado': '🎉',
      'cancelado': '❌'
    }
    return emojis[status] || '📋'
  }

  // Mostrar detalles del pedido
  const showOrderDetails = (order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  // Actualizar estado del pedido
  const handleStatusUpdate = (orderId, newStatus) => {
    updateOrderStatus(orderId, newStatus)
  }

  // Actualizar estado de pago del pedido
  const handlePaymentStatusUpdate = (orderId, newPaymentStatus) => {
    updateOrderPaymentStatus(orderId, newPaymentStatus)
  }

  // Función para descargar comprobante
  const downloadComprobante = (order) => {
    if (!order.comprobante) return

    const data = order.comprobante
    
    // Si es un Data URL (base64)
    if (data.startsWith('data:')) {
      try {
        const mime = data.split(';')[0].split(':')[1]
        const base64Data = data.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: mime })
        const url = URL.createObjectURL(blob)
        
        const ext = (() => {
          if (mime === 'application/pdf') return '.pdf'
          if (mime === 'image/png') return '.png'
          if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg'
          return ''
        })()
        
        const link = document.createElement('a')
        link.href = url
        link.download = `comprobante-pedido-${order.id}${ext}`
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1500)
        return
      } catch (err) {
        console.error('Error al procesar comprobante base64', err)
      }
    }

    // Fallback: si es una URL normal
    const link = document.createElement('a')
    link.href = data
    const guessedExt = (() => {
      try {
        const p = data.split('?')[0].split('#')[0]
        const seg = p.split('.')
        return seg.length > 1 ? '.' + seg.pop() : '.jpg'
      } catch (e) {
        return '.jpg'
      }
    })()
    link.download = `comprobante-pedido-${order.id}${guessedExt}`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  // Función para obtener color del estado de pago
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'sin_seña': return '#e74c3c'
      case 'seña_pagada': return '#f39c12'
      case 'pagado': return '#27ae60'
      default: return '#95a5a6'
    }
  }

  return (
    <Layout title="Gestión de Pedidos - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--orders-color)'
          }}>
            📦 Gestión de Pedidos
          </h1>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <span style={{
              padding: '8px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              📊 {filteredOrders.length} pedidos
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <OrdersStats orders={orders} filteredOrders={filteredOrders} />

        {/* Filtros */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            🔍 Filtros
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {/* Búsqueda */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Buscar
              </label>
              <input
                type="text"
                placeholder="ID, nombre, email, teléfono..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Estado */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="en_preparacion">En Preparación</option>
                <option value="listo">Listo</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Método de pago */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Método de Pago
              </label>
              <select
                value={filters.payment}
                onChange={(e) => handleFilterChange('payment', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos los métodos</option>
                <option value="transferencia">Transferencia</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="retiro">Retiro en Local</option>
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Limpiar filtros */}
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button
                onClick={() => setFilters({
                  status: 'all',
                  payment: 'all',
                  dateFrom: '',
                  dateTo: '',
                  search: ''
                })}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        {filteredOrders.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📭</div>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              No hay pedidos
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem'
            }}>
              {orders.length === 0 
                ? 'Aún no hay pedidos en el sistema.'
                : 'No hay pedidos que coincidan con los filtros aplicados.'
              }
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            {filteredOrders.map(order => (
              <div
                key={order.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)'
                  e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.background = 'var(--bg-card)'
                }}
                onClick={() => showOrderDetails(order)}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: '16px',
                  alignItems: 'center'
                }}>
                  {/* ID y Estado */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}>
                      #{order.id}
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: getStatusColor(order.estado) + '20',
                      border: `1px solid ${getStatusColor(order.estado)}40`,
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: getStatusColor(order.estado),
                      width: 'fit-content'
                    }}>
                      <span>{getStatusEmoji(order.estado)}</span>
                      {order.estado?.replace('_', ' ').toUpperCase() || 'PENDIENTE'}
                    </div>
                  </div>

                  {/* Información del Cliente */}
                  <div>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px'
                    }}>
                      {order.cliente.nombre} {order.cliente.apellido || ''}
                    </h4>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      marginBottom: '2px'
                    }}>
                      📧 {order.cliente.email}
                    </p>
                    {order.cliente.telefono && (
                      <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                      }}>
                        📱 {order.cliente.telefono}
                      </p>
                    )}
                  </div>

                  {/* Información del Pedido */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: 'var(--accent-secondary)',
                      marginBottom: '4px'
                    }}>
                      {formatCurrency(order.total)}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      justifyContent: 'flex-end',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: getPaymentColor(order.metodoPago) + '20',
                        color: getPaymentColor(order.metodoPago),
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }}>
                        {order.metodoPago === 'transferencia' ? '💳 Transferencia' :
                         order.metodoPago === 'whatsapp' ? '💬 WhatsApp' : 
                         '🏪 Retiro'}
                      </span>
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}>
                      {formatDate(order.fechaCreacion)}
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <select
                      value={order.estado || 'pendiente'}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleStatusUpdate(order.id, e.target.value)
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
                      <option value="confirmado">Confirmado</option>
                      <option value="en_preparacion">En Preparación</option>
                      <option value="listo">Listo</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    
                    <select
                      value={order.estadoPago || 'sin_seña'}
                      onChange={(e) => {
                        e.stopPropagation()
                        handlePaymentStatusUpdate(order.id, e.target.value)
                      }}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        background: getPaymentStatusColor(order.estadoPago),
                        color: 'white',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="sin_seña">Sin Seña</option>
                      <option value="seña_pagada">Seña Pagada</option>
                      <option value="pagado">Pagado</option>
                    </select>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        showOrderDetails(order)
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      👁️ Ver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Detalles del Pedido */}
        {showOrderModal && selectedOrder && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              {/* Header del Modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <h2 style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)'
                }}>
                  📦 Pedido #{selectedOrder.id}
                </h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  ❌
                </button>
              </div>

              {/* Información del Cliente */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}>
                  👤 Cliente
                </h3>
                <div style={{
                  background: 'var(--bg-section)',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <p><strong>Nombre:</strong> {selectedOrder.cliente?.nombre} {selectedOrder.cliente?.apellido || ''}</p>
                  <p><strong>Email:</strong> {selectedOrder.cliente?.email}</p>
                  {selectedOrder.cliente?.telefono && (
                    <p><strong>Teléfono:</strong> {selectedOrder.cliente.telefono}</p>
                  )}
                  {selectedOrder.cliente?.direccion && (
                    <p><strong>Dirección:</strong> {selectedOrder.cliente.direccion}</p>
                  )}
                </div>
              </div>

              {/* Items del Pedido */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}>
                  🛍️ Productos ({selectedOrder.items?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedOrder.items || []).map((item, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'var(--bg-section)',
                        padding: '12px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        {item.measures && (
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Medidas: {item.measures}
                          </p>
                        )}
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {formatCurrency(item.price)} c/u
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comprobante */}
              {selectedOrder.comprobante && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '12px'
                  }}>
                    📄 Comprobante de Pago
                  </h3>
                  <div style={{
                    background: 'var(--bg-section)',
                    padding: '16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Comprobante adjunto disponible
                      </p>
                    </div>
                    <button
                      onClick={() => downloadComprobante(selectedOrder)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-secondary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500
                      }}
                    >
                      Descargar
                    </button>
                  </div>
                </div>
              )}

              {selectedOrder._comprobanteOmitted && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    padding: '12px',
                    borderRadius: '8px',
                    color: '#856404'
                  }}>
                    ⚠️ El comprobante de este pedido se omitió por limitaciones de almacenamiento
                  </div>
                </div>
              )}

              {/* Resumen del Pedido */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}>
                  💰 Resumen
                </h3>
                <div style={{
                  background: 'var(--bg-section)',
                  padding: '16px',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--accent-secondary)'
                  }}>
                    <span>Total:</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <p><strong>Método de Pago:</strong> {
                      selectedOrder.metodoPago === 'transferencia' ? 'Transferencia Bancaria' :
                      selectedOrder.metodoPago === 'whatsapp' ? 'Pago por WhatsApp' : 
                      'Retiro en Local'
                    }</p>
                    <p><strong>Fecha del Pedido:</strong> {formatDate(selectedOrder.fechaCreacion)}</p>
                    {selectedOrder.fechaSolicitudEntrega && (
                      <p><strong>Entrega Solicitada:</strong> {formatDate(selectedOrder.fechaSolicitudEntrega)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowOrderModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Cerrar
                </button>
                
                <select
                  value={selectedOrder.estadoPago || 'sin_seña'}
                  onChange={(e) => {
                    updateOrderPaymentStatus(selectedOrder.id, e.target.value)
                    setSelectedOrder({
                      ...selectedOrder,
                      estadoPago: e.target.value
                    })
                  }}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  <option value="sin_seña">Sin Seña</option>
                  <option value="seña_pagada">Seña Pagada</option>
                  <option value="pagado">Pagado Total</option>
                </select>
                
                <select
                  value={selectedOrder.estado || 'pendiente'}
                  onChange={(e) => {
                    handleStatusUpdate(selectedOrder.id, e.target.value)
                    setSelectedOrder({
                      ...selectedOrder,
                      estado: e.target.value
                    })
                  }}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="en_preparacion">En Preparación</option>
                  <option value="listo">Listo</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

// Componente de estadísticas de pedidos
function OrdersStats({ orders, filteredOrders }) {
  // Calcular estadísticas
  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.estado === 'pendiente').length
  const confirmedOrders = orders.filter(o => o.estado === 'confirmado').length
  const inProgressOrders = orders.filter(o => o.estado === 'en_preparacion').length
  const readyOrders = orders.filter(o => o.estado === 'listo').length
  const deliveredOrders = orders.filter(o => o.estado === 'entregado').length

  // Calcular montos
  const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0)
  const pendingAmount = orders.filter(o => o.estado !== 'entregado' && o.estado !== 'cancelado')
    .reduce((sum, order) => sum + (order.total || 0), 0)
  const deliveredAmount = orders.filter(o => o.estado === 'entregado')
    .reduce((sum, order) => sum + (order.total || 0), 0)

  // Pedidos de este mes
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const thisMonthOrders = orders.filter(order => {
    const orderDate = new Date(order.fechaCreacion)
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
  }).length

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px'
    }}>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '16px'
      }}>
        📊 Estadísticas de Pedidos
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Pedidos por Estado */}
        <div style={{
          background: 'var(--bg-section)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '12px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}>
            Estados
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>⏳ Pendientes:</span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>{pendingOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>✅ Confirmados:</span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>{confirmedOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>🔨 En Preparación:</span>
              <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{inProgressOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>📦 Listos:</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{readyOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>🎉 Entregados:</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>{deliveredOrders}</span>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div style={{
          background: 'var(--bg-section)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '12px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}>
            Resumen
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total pedidos:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Este mes:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{thisMonthOrders}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mostrando:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{filteredOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Montos */}
        <div style={{
          background: 'var(--bg-section)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)', 
            marginBottom: '12px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}>
            Montos
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total general:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pendiente:</span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                {formatCurrency(pendingAmount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Entregado:</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>
                {formatCurrency(deliveredAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}