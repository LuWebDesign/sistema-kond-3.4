import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'

export default function InternalOrders() {
  const [pedidos, setPedidos] = useState([])
  const [productosBase, setProductosBase] = useState([])
  const [pedidosCatalogo, setPedidosCatalogo] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterPayment, setFilterPayment] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const PAGE_SIZE = 10

  useEffect(() => {
    // Cargar datos del localStorage
    const loadedPedidos = JSON.parse(localStorage.getItem('pedidos') || '[]')
    const loadedProductos = JSON.parse(localStorage.getItem('productosBase') || '[]')
    const loadedCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
    
    setPedidos(loadedPedidos)
    setProductosBase(loadedProductos)
    setPedidosCatalogo(loadedCatalogo)
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0)
  }

  const escapeHtml = (text) => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0)
  }

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
  }

  const filteredPedidos = pedidos.filter(pedido => {
    // Filtro por estado
    if (filterStatus !== 'todos' && pedido.estado !== filterStatus) {
      return false
    }

    // Filtro por pago
    if (filterPayment !== 'todos' && pedido.estadoPago !== filterPayment) {
      return false
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const clienteNombre = typeof pedido.cliente === 'string' 
        ? pedido.cliente 
        : (pedido.cliente?.nombre ? `${pedido.cliente.nombre} ${pedido.cliente.apellido || ''}` : pedido.cliente || '')
      
      const searchIn = [
        pedido.id?.toString(),
        clienteNombre,
        pedido.telefono,
        pedido.email || pedido.cliente?.email
      ].filter(Boolean).join(' ').toLowerCase()

      if (!searchIn.includes(searchTerm.toLowerCase())) {
        return false
      }
    }

    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredPedidos.length / PAGE_SIZE))
  const paginatedPedidos = filteredPedidos.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const estadoLabels = {
    'pendiente': '⏳ Pendiente',
    'confirmado': '✅ Confirmado',
    'en_produccion': '🔧 En Producción',
    'listo': '📦 Listo para entrega',
    'entregado': '🎉 Entregado'
  }

  const pagoLabels = {
    'sin_seña': 'Sin seña',
    'seña_pagada': 'Seña pagada',
    'pagado_total': 'Pagado total'
  }

  const openDetailModal = (pedido) => {
    setSelectedPedido(pedido)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPedido(null)
  }

  const updatePedido = useCallback(() => {
    if (!selectedPedido) return

    const estado = document.getElementById('detailEstadoSelect')?.value || selectedPedido.estado
    const estadoPago = document.getElementById('detailEstadoPagoSelect')?.value || selectedPedido.estadoPago
    let montoRecibido = parseFloat(document.getElementById('detailMontoRecibido')?.value) || 0
    const fechaConfirmada = document.getElementById('detailFechaConfirmada')?.value || selectedPedido.fecha

    const totalPedido = Number(selectedPedido.total || selectedPedido.pedidoTotal || selectedPedido.precioTotal || 0)

    if (estadoPago === 'pagado_total') {
      montoRecibido = totalPedido
    }

    const updatedPedidos = pedidos.map(p => 
      String(p.id) === String(selectedPedido.id) 
        ? { ...p, estado, estadoPago, montoRecibido, fechaConfirmada }
        : p
    )

    setPedidos(updatedPedidos)
    localStorage.setItem('pedidos', JSON.stringify(updatedPedidos))
    
    closeModal()
  }, [selectedPedido, pedidos])

  const deletePedido = useCallback(() => {
    if (!selectedPedido) return
    if (!confirm('¿Eliminar este pedido?')) return

    const updatedPedidos = pedidos.filter(p => String(p.id) !== String(selectedPedido.id))
    setPedidos(updatedPedidos)
    localStorage.setItem('pedidos', JSON.stringify(updatedPedidos))
    
    closeModal()
  }, [selectedPedido, pedidos])

  const renderPedidoCard = (pedido) => {
    // Buscar pedido catálogo vinculado
    const linkedCatalog = pedidosCatalogo.find(pc => 
      Array.isArray(pc.pedidosInternosIds) && 
      pc.pedidosInternosIds.some(id => String(id) === String(pedido.id))
    )

    const clienteNombre = typeof pedido.cliente === 'string' 
      ? pedido.cliente 
      : (pedido.cliente?.nombre ? `${pedido.cliente.nombre}${pedido.cliente.apellido ? ' ' + pedido.cliente.apellido : ''}` : (pedido.cliente || 'Cliente interno'))

    // Productos preview
    let productosPreview = ''
    let productosCount = 0
    
    if (linkedCatalog) {
      productosCount = linkedCatalog.productos?.length || 0
      productosPreview = (linkedCatalog.productos || []).slice(0, 3).map(prod => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${prod.cantidad}x ${prod.nombre}</span>
          <span>${formatCurrency(prod.subtotal)}</span>
        </div>`).join('')
      
      if ((linkedCatalog.productos || []).length > 3) {
        productosPreview += `<div style="color: #0984e3; font-size: 0.9rem;">+${linkedCatalog.productos.length - 3} productos más</div>`
      }
    } else {
      const prodBase = productosBase.find(pr => String(pr.id) === String(pedido.productoId)) || {}
      productosCount = 1
      productosPreview = `
        <div style="display: flex; justify-content: space-between;">
          <span>${pedido.cantidad || 1}x ${prodBase.nombre || pedido.nombre || 'Producto'}</span>
          <span>${formatCurrency((prodBase.precioUnitario || prodBase.precio || pedido.precio || 0) * (pedido.cantidad || 1))}</span>
        </div>`
    }

    const fechaCreacion = pedido.fechaCreacion 
      ? new Date(pedido.fechaCreacion).toLocaleDateString('es-AR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        }) 
      : (pedido.fecha || '')

    const estadoClass = pedido.estado || (linkedCatalog ? linkedCatalog.estado : 'pendiente')
    const estadoLabel = estadoLabels[estadoClass] || (pedido.estado || 'pendiente')
    const pagoClass = pedido.estadoPago || (linkedCatalog ? linkedCatalog.estadoPago : 'sin_seña')
    const pagoLabel = pagoLabels[pagoClass] || pagoClass

    const totalVal = Number(pedido.total || pedido.pedidoTotal || pedido.precioTotal || ((linkedCatalog && linkedCatalog.total) ? linkedCatalog.total : 0))

    // Calcular seña y restante
    const recibidoVal = pedido.montoRecibido !== undefined && pedido.montoRecibido !== null 
      ? Number(pedido.montoRecibido) 
      : (pedido.estadoPago === 'seña_pagada' ? (Number(totalVal || 0) * 0.5) : 0)
    const recibidoEstimado = pedido.montoRecibido === undefined || pedido.montoRecibido === null ? (pedido.estadoPago === 'seña_pagada') : false
    const restanteVal = Math.max(0, (Number(totalVal || 0) - recibidoVal))

    return (
      <div 
        key={pedido.id}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={() => openDetailModal(pedido)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)' }}>
              Pedido #{pedido.id}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {fechaCreacion}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: getStatusColor(estadoClass),
              color: 'white'
            }}>
              {estadoLabel}
            </span>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: getPaymentColor(pagoClass),
              color: 'white'
            }}>
              {pagoLabel}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--text-color)' }}>
            Cliente: {clienteNombre}
          </div>
          {pedido.telefono && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              📞 {pedido.telefono}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 500, marginBottom: '8px', color: 'var(--text-color)' }}>
            📦 {productosCount} {productosCount === 1 ? 'producto' : 'productos'}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <div dangerouslySetInnerHTML={{ __html: productosPreview }} />
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '8px',
          padding: '12px',
          background: 'var(--bg-primary)',
          borderRadius: '6px',
          fontSize: '0.9rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Seña</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
              {formatCurrency(recibidoVal)}
              {recibidoEstimado && <span style={{ color: '#999', fontSize: '0.8rem', marginLeft: '4px' }}>(est.)</span>}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Restante</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{formatCurrency(restanteVal)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Total</div>
            <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{formatCurrency(totalVal)}</div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      'pendiente': '#f39c12',
      'confirmado': '#27ae60',
      'en_produccion': '#3498db',
      'listo': '#9b59b6',
      'entregado': '#2ecc71'
    }
    return colors[status] || '#95a5a6'
  }

  const getPaymentColor = (payment) => {
    const colors = {
      'sin_seña': '#e74c3c',
      'seña_pagada': '#f39c12',
      'pagado_total': '#27ae60'
    }
    return colors[payment] || '#95a5a6'
  }

  const renderDetailModal = () => {
    if (!selectedPedido) return null

    // Obtener productos del pedido
    const rawItems = []
    if (Array.isArray(selectedPedido.productos) && selectedPedido.productos.length) {
      selectedPedido.productos.forEach(p => rawItems.push({
        productoId: p.productId || p.id || null,
        nombre: p.nombre,
        cantidad: p.cantidad || 1,
        precioUnitario: p.precioUnitario || p.precio || (p.subtotal || 0) / (p.cantidad || 1),
        medidas: p.medidas || p.medidasProducto || null,
        tiempoUnitario: p.tiempoUnitario || p.tiempo || null
      }))
    } else if (selectedPedido.productoId || selectedPedido.producto) {
      const pid = selectedPedido.productoId || selectedPedido.producto
      const prodBase = productosBase.find(p => String(p.id) === String(pid)) || {}
      const cantidadSingle = selectedPedido.cantidad || 1
      
      let precioUnitarioSingle = 0
      if (selectedPedido.precioUnitario || selectedPedido.precio) {
        precioUnitarioSingle = Number(selectedPedido.precioUnitario || selectedPedido.precio || 0)
      } else if (selectedPedido.pedidoTotal || selectedPedido.precioTotal) {
        precioUnitarioSingle = (Number(selectedPedido.pedidoTotal || selectedPedido.precioTotal) || 0) / (cantidadSingle || 1)
      } else if (prodBase.precioUnitario || prodBase.precio) {
        precioUnitarioSingle = Number(prodBase.precioUnitario || prodBase.precio || 0)
      }
      
      rawItems.push({
        productoId: pid,
        nombre: prodBase.nombre || selectedPedido.nombre || 'Producto',
        cantidad: cantidadSingle,
        precioUnitario: precioUnitarioSingle,
        medidas: prodBase.medidas || selectedPedido.medidas || null,
        tiempoUnitario: prodBase.tiempoUnitario || selectedPedido.tiempoUnitario || null
      })
    }

    return (
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
          background: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-color)' }}>
              Detalle Pedido #{selectedPedido.id}
            </h2>
            <button
              onClick={closeModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0',
                width: '30px',
                height: '30px'
              }}
            >
              ×
            </button>
          </div>

          {/* Información del cliente */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-color)', marginBottom: '12px' }}>Cliente</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div>
                <strong>Nombre:</strong> {
                  typeof selectedPedido.cliente === 'string' 
                    ? selectedPedido.cliente 
                    : (selectedPedido.cliente?.nombre ? `${selectedPedido.cliente.nombre} ${selectedPedido.cliente.apellido || ''}` : selectedPedido.cliente || '')
                }
              </div>
              {selectedPedido.telefono && <div><strong>Teléfono:</strong> {selectedPedido.telefono}</div>}
              {(selectedPedido.email || selectedPedido.cliente?.email) && 
                <div><strong>Email:</strong> {selectedPedido.email || selectedPedido.cliente?.email}</div>
              }
              {(selectedPedido.direccion || selectedPedido.cliente?.direccion) && 
                <div><strong>Dirección:</strong> {selectedPedido.direccion || selectedPedido.cliente?.direccion}</div>
              }
            </div>
          </div>

          {/* Productos */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-color)', marginBottom: '12px' }}>Productos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rawItems.map((item, index) => {
                const tiempoTotalStr = item.tiempoUnitario ? 
                  `${item.tiempoUnitario} × ${item.cantidad} = ${minutesToTime(timeToMinutes(item.tiempoUnitario) * item.cantidad)}` :
                  ''

                return (
                  <div key={index} style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>{item.nombre}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <span>📦 Cantidad: {item.cantidad}</span>
                      <span>💰 Precio unit: {formatCurrency(item.precioUnitario)}</span>
                      {item.medidas && <span>📏 Medidas: {item.medidas}</span>}
                      {tiempoTotalStr && <span>⏱️ Tiempo: {tiempoTotalStr}</span>}
                    </div>
                    <div style={{ marginTop: '6px', fontWeight: 600, color: 'var(--primary-color)' }}>
                      Subtotal: {formatCurrency(item.precioUnitario * item.cantidad)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Formulario de edición */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Estado</label>
              <select
                id="detailEstadoSelect"
                defaultValue={selectedPedido.estado || 'pendiente'}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: 'var(--bg-primary)'
                }}
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="en_produccion">🔧 En Producción</option>
                <option value="listo">📦 Listo para entrega</option>
                <option value="entregado">🎉 Entregado</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Estado de Pago</label>
              <select
                id="detailEstadoPagoSelect"
                defaultValue={selectedPedido.estadoPago || 'sin_seña'}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: 'var(--bg-primary)'
                }}
              >
                <option value="sin_seña">Sin seña</option>
                <option value="seña_pagada">Seña pagada</option>
                <option value="pagado_total">Pagado total</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Monto Recibido</label>
              <input
                type="number"
                id="detailMontoRecibido"
                defaultValue={selectedPedido.montoRecibido || 0}
                step="0.01"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: 'var(--bg-primary)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Fecha Confirmada</label>
              <input
                type="date"
                id="detailFechaConfirmada"
                defaultValue={selectedPedido.fechaConfirmada || selectedPedido.fecha || ''}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: 'var(--bg-primary)'
                }}
              />
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={deletePedido}
              style={{
                padding: '10px 20px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Eliminar
            </button>
            <button
              onClick={closeModal}
              style={{
                padding: '10px 20px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={updatePedido}
              style={{
                padding: '10px 20px',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout title="Pedidos Internos - Sistema KOND">
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, marginBottom: '8px', color: 'var(--text-color)' }}>
            📋 Pedidos Internos
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Administra todos los pedidos internos del sistema
          </p>
        </div>

        {/* Filtros */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: 'var(--text-color)' }}>
                Buscar
              </label>
              <input
                type="text"
                placeholder="ID, cliente, teléfono..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-color)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: 'var(--text-color)' }}>
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-color)'
                }}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">⏳ Pendiente</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="en_produccion">🔧 En Producción</option>
                <option value="listo">📦 Listo para entrega</option>
                <option value="entregado">🎉 Entregado</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: 'var(--text-color)' }}>
                Estado de Pago
              </label>
              <select
                value={filterPayment}
                onChange={(e) => {
                  setFilterPayment(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-color)'
                }}
              >
                <option value="todos">Todos los pagos</option>
                <option value="sin_seña">Sin seña</option>
                <option value="seña_pagada">Seña pagada</option>
                <option value="pagado_total">Pagado total</option>
              </select>
            </div>
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
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📊</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{filteredPedidos.length}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total</div>
          </div>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>⏳</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
              {filteredPedidos.filter(p => p.estado === 'pendiente').length}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pendientes</div>
          </div>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>🔧</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
              {filteredPedidos.filter(p => p.estado === 'en_produccion').length}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>En Producción</div>
          </div>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>💰</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
              {formatCurrency(
                filteredPedidos.reduce((sum, p) => sum + (Number(p.total || p.pedidoTotal || p.precioTotal || 0)), 0)
              )}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Valor Total</div>
          </div>
        </div>

        {/* Lista de pedidos */}
        {filteredPedidos.length === 0 ? (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-color)' }}>No hay pedidos internos</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {searchTerm || filterStatus !== 'todos' || filterPayment !== 'todos' 
                ? 'No se encontraron pedidos que coincidan con los filtros aplicados'
                : 'Aún no hay pedidos internos registrados en el sistema'
              }
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {paginatedPedidos.map(renderPedidoCard)}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  style={{
                    padding: '8px 16px',
                    background: currentPage <= 1 ? 'var(--bg-secondary)' : 'var(--primary-color)',
                    color: currentPage <= 1 ? 'var(--text-muted)' : 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Anterior
                </button>
                <span style={{ color: 'var(--text-color)' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: '8px 16px',
                    background: currentPage >= totalPages ? 'var(--bg-secondary)' : 'var(--primary-color)',
                    color: currentPage >= totalPages ? 'var(--text-muted)' : 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal de detalle */}
        {showModal && renderDetailModal()}
      </div>
    </Layout>
  )
}