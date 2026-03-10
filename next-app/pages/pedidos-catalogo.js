import Layout from '../components/Layout'
import { useAdminOrders } from '../hooks/useAdmin'
import { useState, useEffect } from 'react'

export default function PedidosCatalogo() {
  const { 
    orders, 
    loading, 
    error, 
    updateOrderStatus, 
    getComprobanteSignedUrl, 
    refreshOrders 
  } = useAdminOrders()

  const [filteredOrders, setFilteredOrders] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    dateFrom: '',
    dateTo: ''
  })
  const [expandedOrders, setExpandedOrders] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 10

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...orders]

    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(order => 
        order.cliente?.nombre?.toLowerCase().includes(searchLower) ||
        order.cliente?.apellido?.toLowerCase().includes(searchLower) ||
        order.cliente?.email?.toLowerCase().includes(searchLower) ||
        order.cliente?.telefono?.includes(filters.search) ||
        order.id?.toString().includes(filters.search)
      )
    }

    // Filtro por estado de pago
    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(order => order.estado_pago === filters.paymentStatus)
    }

    // Filtro por método de pago
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.metodo_pago === filters.status)
    }

    // Filtro por fecha
    if (filters.dateFrom) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.fecha_creacion)
        const fromDate = new Date(filters.dateFrom)
        return orderDate >= fromDate
      })
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.fecha_creacion)
        const toDate = new Date(filters.dateTo + 'T23:59:59')
        return orderDate <= toDate
      })
    }

    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [orders, filters])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'sin_seña': '#dc3545',
      'seña_pagada': '#ffc107',
      'pagado': '#28a745'
    }
    return colors[status] || '#6c757d'
  }

  const getStatusText = (status) => {
    const texts = {
      'sin_seña': 'Sin Seña',
      'seña_pagada': 'Seña Pagada',
      'pagado': 'Pagado Completo'
    }
    return texts[status] || status
  }

  const getMethodText = (method) => {
    const texts = {
      'transferencia': '🏦 Transferencia',
      'whatsapp': '💬 WhatsApp',
      'retiro': '🏪 Retiro en Local'
    }
    return texts[method] || method
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, { estado_pago: newStatus })
    } catch (error) {
      console.error('Error updating order status:', error)
      alert(`Error al actualizar el estado: ${error.message}`)
    }
  }

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const handleViewComprobante = async (order) => {
    if (!order.comprobante_url && !order.comprobante) {
      alert('Este pedido no tiene comprobante adjunto.')
      return
    }

    try {
      let url = order.comprobante_url

      // Si es un path relativo, obtener signed URL
      if (url && !url.startsWith('http') && !url.startsWith('data:')) {
        url = await getComprobanteSignedUrl(url)
      }

      // Si no hay URL y hay comprobante (data URL), usar directamente
      if (!url && order.comprobante) {
        url = order.comprobante
      }

      if (url) {
        window.open(url, '_blank')
      } else {
        alert('No se pudo obtener el comprobante.')
      }
    } catch (error) {
      console.error('Error getting comprobante URL:', error)
      alert('Error al obtener el comprobante.')
    }
  }

  const exportOrders = () => {
    const csvContent = [
      // Headers
      ['ID', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'Método Pago', 'Estado Pago', 'Total', 'Items'].join(','),
      // Data
      ...filteredOrders.map(order => [
        order.id,
        formatDate(order.fecha_creacion),
        `"${order.cliente?.nombre || ''} ${order.cliente?.apellido || ''}"`.trim(),
        order.cliente?.email || '',
        order.cliente?.telefono || '',
        order.metodo_pago || '',
        getStatusText(order.estado_pago),
        order.total || 0,
        `"${order.items?.map(item => `${item.name} (${item.quantity})`).join('; ') || ''}"`
      ].join(','))
    ].join('\\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pedidos-catalogo-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Paginación
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  // Estadísticas
  const stats = {
    total: orders.length,
    sinSeña: orders.filter(o => o.estado_pago === 'sin_seña').length,
    señaPagada: orders.filter(o => o.estado_pago === 'seña_pagada').length,
    pagado: orders.filter(o => o.estado_pago === 'pagado').length,
    totalAmount: orders.reduce((sum, o) => sum + (o.total || 0), 0)
  }

  if (loading) {
    return (
      <Layout title="Pedidos de Catálogo - Sistema KOND">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="loading-spinner">Cargando pedidos...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Pedidos de Catálogo - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--primary-color)',
              marginBottom: '8px'
            }}>
              📋 Pedidos de Catálogo
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              margin: 0
            }}>
              {filteredOrders.length} de {orders.length} pedidos
            </p>
            {error && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                color: '#856404',
                padding: '8px 12px',
                borderRadius: '4px',
                marginTop: '8px',
                fontSize: '0.9rem'
              }}>
                ⚠️ {error} (usando datos locales como respaldo)
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={refreshOrders}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--secondary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔄 Actualizar
            </button>
            <button
              onClick={exportOrders}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              📊 Exportar CSV
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Total Pedidos
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc3545' }}>
              {stats.sinSeña}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Sin Seña
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffc107' }}>
              {stats.señaPagada}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Seña Pagada
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#28a745' }}>
              {stats.pagado}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Pagado
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success-color)' }}>
              {formatCurrency(stats.totalAmount)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Valor Total
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <input
            type="text"
            placeholder="🔍 Buscar por cliente, email, teléfono..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />

          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="sin_seña">Sin Seña</option>
            <option value="seña_pagada">Seña Pagada</option>
            <option value="pagado">Pagado Completo</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">Todos los métodos</option>
            <option value="transferencia">Transferencia</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="retiro">Retiro en Local</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Lista de pedidos */}
        <div style={{ marginBottom: '24px' }}>
          {paginatedOrders.map(order => (
            <div
              key={order.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                marginBottom: '16px',
                boxShadow: 'var(--card-shadow)'
              }}
            >
              {/* Header del pedido */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}>
                    Pedido #{order.id}
                  </h3>
                  <p style={{
                    margin: '0',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {formatDate(order.fecha_creacion)} • {getMethodText(order.metodo_pago)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: getStatusColor(order.estado_pago),
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}>
                    {getStatusText(order.estado_pago)}
                  </span>

                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: 'var(--success-color)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    {formatCurrency(order.total)}
                  </span>

                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    {expandedOrders.has(order.id) ? '🔼 Menos' : '🔽 Más'}
                  </button>
                </div>
              </div>

              {/* Información del cliente */}
              <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
                    👤 Cliente
                  </h4>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>
                    <strong>{order.cliente?.nombre || 'N/A'} {order.cliente?.apellido || ''}</strong>
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    📧 {order.cliente?.email || 'N/A'}
                  </p>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    📱 {order.cliente?.telefono || 'N/A'}
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
                    🛍️ Items ({order.items?.length || 0})
                  </h4>
                  <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                    {order.items?.map((item, index) => (
                      <p key={index} style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>
                        • {item.name} ({item.quantity}x) - {formatCurrency(item.price * item.quantity)}
                      </p>
                    )) || <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sin items</p>}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>
                    ⚙️ Acciones
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      value={order.estado_pago}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="sin_seña">Sin Seña</option>
                      <option value="seña_pagada">Seña Pagada</option>
                      <option value="pagado">Pagado Completo</option>
                    </select>

                    {(order.comprobante_url || order.comprobante) && (
                      <button
                        onClick={() => handleViewComprobante(order)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'var(--accent-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        📷 Ver Comprobante
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Información expandida */}
              {expandedOrders.has(order.id) && (
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                        📅 Fechas
                      </h5>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem' }}>
                        <strong>Creado:</strong> {formatDate(order.fecha_creacion)}
                      </p>
                      {order.fecha_solicitud_entrega && (
                        <p style={{ margin: '0', fontSize: '0.8rem' }}>
                          <strong>Entrega solicitada:</strong> {new Date(order.fecha_solicitud_entrega).toLocaleDateString('es-AR')}
                        </p>
                      )}
                    </div>

                    {order.cliente?.direccion && (
                      <div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                          📍 Dirección
                        </h5>
                        <p style={{ margin: '0', fontSize: '0.8rem' }}>
                          {order.cliente.direccion}
                        </p>
                      </div>
                    )}

                    <div>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                        💳 Información de Pago
                      </h5>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem' }}>
                        <strong>Método:</strong> {getMethodText(order.metodo_pago)}
                      </p>
                      <p style={{ margin: '0', fontSize: '0.8rem' }}>
                        <strong>Estado:</strong> {getStatusText(order.estado_pago)}
                      </p>
                      {order._comprobanteOmitted && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#dc3545' }}>
                          ⚠️ Comprobante omitido por límite de almacenamiento
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sin pedidos */}
        {filteredOrders.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
            <h3>No se encontraron pedidos</h3>
            <p>Intenta ajustar los filtros o espera a que lleguen nuevos pedidos.</p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: currentPage === 1 ? '#ccc' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ⬅️ Anterior
            </button>
            
            <span style={{
              padding: '8px 16px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)'
            }}>
              Página {currentPage} de {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                backgroundColor: currentPage === totalPages ? '#ccc' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Siguiente ➡️
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}