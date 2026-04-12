import Layout from '../components/Layout'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import { useState, useEffect } from 'react'
import styles from '../styles/pedidos-catalogo.module.css'
import { registrarMovimiento } from '../utils/finanzasUtils'

export default function PedidosCatalogo() {
  // Estados
  const [pedidosCatalogo, setPedidosCatalogo] = useState([])
  const [productosBase, setProductosBase] = useState([])
  const [activeSubtab, setActiveSubtab] = useState('pendientes')
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAssignDate, setSelectedAssignDate] = useState(null)
  
  // Filtros pendientes
  const [filters, setFilters] = useState({
    search: '',
    estado: 'all',
    estadoPago: 'all'
  })
  
  // Filtros entregados
  const [deliveredFilters, setDeliveredFilters] = useState({
    search: '',
    estadoPago: 'all',
    fecha: ''
  })
  
  // Estadísticas
  const [stats, setStats] = useState({
    totalPendientes: 0,
    pendientesEsteMes: 0,
    totalEntregados: 0,
    entregadosEsteMes: 0,
    totalEntregado: 0
  })

  // Cargar datos desde localStorage
  useEffect(() => {
    loadData()
  }, [])

  // Recalcular estadísticas cuando cambien los pedidos
  useEffect(() => {
    calculateStats()
  }, [pedidosCatalogo])

  const loadData = () => {
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      const productos = JSON.parse(localStorage.getItem('productosBase')) || []
      // Normalizar pedidos al cargarlos para evitar inconsistencias entre legacy y Next
      const normalized = (pedidos || []).map(normalizePedido)
      setPedidosCatalogo(normalized)
      setProductosBase(productos)
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  const calculateStats = () => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    const pendientes = pedidosCatalogo.filter(p => p.estado !== 'entregado')
    const entregados = pedidosCatalogo.filter(p => p.estado === 'entregado')

    const pendientesEsteMes = pendientes.filter(p => {
      const date = new Date(p.fechaCreacion)
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear
    })

    const entregadosEsteMes = entregados.filter(p => {
      const date = new Date(p.fechaCreacion)
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear
    })

    const totalEntregado = entregados.reduce((sum, p) => sum + (p.total || 0), 0)

    setStats({
      totalPendientes: pendientes.length,
      pendientesEsteMes: pendientesEsteMes.length,
      totalEntregados: entregados.length,
      entregadosEsteMes: entregadosEsteMes.length,
      totalEntregado
    })
  }

  // Normalizar estado de pago a valores canónicos
  function normalizeEstadoPago(val) {
    if (!val && val !== 0) return 'sin_seña'
    const s = String(val || '').trim()
    if (s === 'pagado' || s === 'pagado_total') return 'pagado_total'
    if (s === 'seña_pagada' || s === 'sena_pagada' || s === 'seña') return 'seña_pagada'
    if (s === 'sin_seña' || s === '') return 'sin_seña'
    return s
  }

  // Normalizar campo de pedido (montos y estadoPago)
  function normalizePedido(p) {
    if (!p) return p
    const clone = { ...p }
    // montoRecibido puede venir en distintas propiedades
    const monto = Number(p.montoRecibido ?? p.senaMonto ?? p['señaMonto'] ?? 0)
    clone.montoRecibido = isNaN(monto) ? 0 : monto
    clone.estadoPago = normalizeEstadoPago(p.estadoPago)
    // asegurar cliente con nombre/apellido
    if (!clone.cliente) clone.cliente = { nombre: '', apellido: '' }
    else {
      clone.cliente.nombre = clone.cliente.nombre || ''
      clone.cliente.apellido = clone.cliente.apellido || ''
    }
    return clone
  }

  // Filtrar pedidos pendientes
  const filteredPendientes = pedidosCatalogo
    .filter(p => p.estado !== 'entregado')
    .filter(p => {
      let matches = true

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        matches = matches && (
          p.id.toString().includes(searchTerm) ||
          (p.cliente?.nombre && p.cliente.nombre.toLowerCase().includes(searchTerm)) ||
          (p.cliente?.apellido && p.cliente.apellido.toLowerCase().includes(searchTerm)) ||
          (p.cliente?.telefono && p.cliente.telefono.includes(searchTerm))
        )
      }

      if (filters.estado !== 'all') {
        matches = matches && p.estado === filters.estado
      }

      if (filters.estadoPago !== 'all') {
        matches = matches && p.estadoPago === filters.estadoPago
      }

      return matches
    })

  // Filtrar pedidos entregados
  const filteredEntregados = pedidosCatalogo
    .filter(p => p.estado === 'entregado')
    .filter(p => {
      let matches = true

      if (deliveredFilters.search) {
        const searchTerm = deliveredFilters.search.toLowerCase()
        matches = matches && (
          p.id.toString().includes(searchTerm) ||
          (p.cliente?.nombre && p.cliente.nombre.toLowerCase().includes(searchTerm)) ||
          (p.cliente?.apellido && p.cliente.apellido.toLowerCase().includes(searchTerm)) ||
          (p.cliente?.telefono && p.cliente.telefono.includes(searchTerm))
        )
      }

      if (deliveredFilters.estadoPago !== 'all') {
        matches = matches && p.estadoPago === deliveredFilters.estadoPago
      }

      if (deliveredFilters.fecha) {
        const orderDate = new Date(p.fechaCreacion).toISOString().split('T')[0]
        matches = matches && orderDate === deliveredFilters.fecha
      }

      return matches
    })

  // Funciones auxiliares
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusEmoji = (status) => {
    const emojis = {
      'pendiente': '⏳',
      'confirmado': '✅',
      'en_produccion': '🔧',
      'listo': '📦',
      'entregado': '🎉'
    }
    return emojis[status] || '📋'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pendiente': 'Pendiente confirmación',
      'confirmado': 'Confirmado',
      'en_produccion': 'En Producción',
      'listo': 'Listo para entrega',
      'entregado': 'Entregado'
    }
    return labels[status] || status
  }

  const getPaymentLabel = (status) => {
    const labels = {
      'sin_seña': 'Sin seña',
      'seña_pagada': 'Seña pagada (50%)',
      'pagado_total': 'Pagado total'
    }
    return labels[status] || status
  }

  const formatFechaEntrega = (pedido) => {
    if (pedido.fechaConfirmadaEntrega) {
      const fecha = new Date(pedido.fechaConfirmadaEntrega + 'T00:00:00')
      return fecha.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })
    }
    return 'Sin confirmar'
  }

  const formatFechaProduccion = (pedido) => {
    if (pedido.fechaProduccion) {
      const fecha = new Date(pedido.fechaProduccion + 'T00:00:00')
      return fecha.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })
    }
    return 'Sin asignar'
  }

  const getProductThumbnail = (pedido) => {
    if (!pedido.productos || pedido.productos.length === 0) return null
    
    const firstProduct = pedido.productos[0]
    const productBase = productosBase.find(p => p.id === firstProduct.productId)
    
    return productBase?.imagen || null
  }

  const handleCardClick = (pedido) => {
    setSelectedPedido(pedido)
    setShowDetailModal(true)
  }

  const handleCloseModal = () => {
    setShowDetailModal(false)
    setSelectedPedido(null)
  }

  const handleSaveChanges = () => {
    if (!selectedPedido) return

    const index = pedidosCatalogo.findIndex(p => p.id === selectedPedido.id)
    if (index !== -1) {
      const pedidoAnterior = pedidosCatalogo[index]
      const previoEstadoPago = pedidoAnterior.estadoPago || 'sin_seña'
      const previoMontoRecibido = Number(pedidoAnterior.montoRecibido || 0)
      const nuevoEstadoPago = selectedPedido.estadoPago || 'sin_seña'
      const nuevoMontoRecibido = Number(selectedPedido.montoRecibido || 0)
      const totalPedido = Number(selectedPedido.total || 0)
      
      // Si el admin marcó pagado_total, forzamos montoRecibido = total
      if (nuevoEstadoPago === 'pagado_total') {
        selectedPedido.montoRecibido = totalPedido
      }
      
      const updatedPedidos = [...pedidosCatalogo]
      updatedPedidos[index] = selectedPedido
      
      setPedidosCatalogo(updatedPedidos)
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidos))
      try {
        localStorage.setItem('pedidosCatalogo_updated', new Date().toISOString())
      } catch (e) { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { pedidoId: selectedPedido.id } })) } catch(e) {}
      
      // LÓGICA FINANCIERA: Registrar movimientos según cambios de estado de pago
      if (previoEstadoPago !== nuevoEstadoPago) {
        const fechaMovimiento = new Date().toISOString().slice(0, 10)
        const clienteName = `${selectedPedido.cliente.nombre || ''} ${selectedPedido.cliente.apellido || ''}`.trim()
        
        // 1. Si cambió de "sin_seña" a "seña_pagada" → registrar la seña
        if (previoEstadoPago === 'sin_seña' && nuevoEstadoPago === 'seña_pagada') {
          const montoSena = Math.max(0, nuevoMontoRecibido - previoMontoRecibido)
          if (montoSena > 0) {
            registrarMovimiento({
              tipo: 'ingreso',
              monto: montoSena,
              categoria: 'Señas',
              descripcion: `Seña pedido #${selectedPedido.id}`,
              fecha: fechaMovimiento,
              clienteName,
              pedidoId: selectedPedido.id,
              metodoPago: selectedPedido.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo',
              idempotencyKey: `pedido:${selectedPedido.id}:sena:${fechaMovimiento}:${montoSena}`
            })
          }
        }
        
        // 2. Si cambió de "sin_seña" directamente a "pagado_total" → registrar el monto completo
        else if (previoEstadoPago === 'sin_seña' && nuevoEstadoPago === 'pagado_total') {
          const montoCompleto = Math.max(0, nuevoMontoRecibido - previoMontoRecibido)
          if (montoCompleto > 0) {
            registrarMovimiento({
              tipo: 'ingreso',
              monto: montoCompleto,
              categoria: 'Ventas',
              descripcion: `Pago completo pedido #${selectedPedido.id}`,
              fecha: fechaMovimiento,
              clienteName,
              pedidoId: selectedPedido.id,
              metodoPago: selectedPedido.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo',
              idempotencyKey: `pedido:${selectedPedido.id}:venta:${fechaMovimiento}:${montoCompleto}`
            })
          }
        }
        
        // 3. Si cambió de "seña_pagada" a "pagado_total" → registrar solo el restante
        else if (previoEstadoPago === 'seña_pagada' && nuevoEstadoPago === 'pagado_total') {
          const montoRestante = Math.max(0, nuevoMontoRecibido - previoMontoRecibido)
          if (montoRestante > 0) {
            registrarMovimiento({
              tipo: 'ingreso',
              monto: montoRestante,
              categoria: 'Ventas',
              descripcion: `Pago restante pedido #${selectedPedido.id}`,
              fecha: fechaMovimiento,
              clienteName,
              pedidoId: selectedPedido.id,
              metodoPago: selectedPedido.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo',
              idempotencyKey: `pedido:${selectedPedido.id}:restante:${fechaMovimiento}:${montoRestante}`
            })
          }
        }
      }
      // 4. Si el monto recibido aumentó mientras se mantiene el mismo estado de pago
      else if (nuevoMontoRecibido > previoMontoRecibido && previoEstadoPago === 'seña_pagada' && nuevoEstadoPago === 'seña_pagada') {
        const incrementoSena = nuevoMontoRecibido - previoMontoRecibido
        if (incrementoSena > 0) {
          const fechaMovimiento = new Date().toISOString().slice(0, 10)
          const clienteName = `${selectedPedido.cliente.nombre || ''} ${selectedPedido.cliente.apellido || ''}`.trim()
          
          registrarMovimiento({
            tipo: 'ingreso',
            monto: incrementoSena,
            categoria: 'Señas',
            descripcion: `Seña adicional pedido #${selectedPedido.id}`,
            fecha: fechaMovimiento,
            clienteName,
            pedidoId: selectedPedido.id,
            metodoPago: selectedPedido.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo',
            idempotencyKey: `pedido:${selectedPedido.id}:sena_adicional:${fechaMovimiento}:${incrementoSena}`
          })
        }
      }
      
      alert('Cambios guardados correctamente')
      handleCloseModal()
    }
  }

  const openAssignModal = (pedido) => {
    setSelectedPedido(pedido)
    setSelectedAssignDate(null)
    setShowAssignModal(true)
  }

  const closeAssignModal = () => {
    setShowAssignModal(false)
  }

  const buildCalendarCartFromPedido = (pedido) => {
    if (!pedido || !Array.isArray(pedido.productos)) return []
    return pedido.productos.map(item => ({
      name: item.nombre,
      measures: item.medidas || '',
      price: item.precioUnitario || (Number(item.subtotal || 0) / Math.max(1, Number(item.cantidad || 1))),
      quantity: Number(item.cantidad || 1),
      tiempoUnitario: item.tiempoUnitario || '00:00:00'
    }))
  }

  const confirmAssign = () => {
    if (!selectedPedido || !selectedAssignDate) return

    try {
      const pedidosInternos = JSON.parse(localStorage.getItem('pedidos') || '[]')

      // Transformar productos a formato de pedidos internos
      const internalProducts = (selectedPedido.productos || []).map(p => ({
        id: p.productId || p.idProducto || p.id, // compatibilidad
        cantidad: p.cantidad || 1
      }))

      const newInternalOrder = {
        id: Date.now(),
        source: 'catalogo',
        catalogOrderId: selectedPedido.id,
        cliente: selectedPedido.cliente || {},
        productos: internalProducts,
        fechaEntrega: selectedAssignDate,
        estado: 'confirmado',
        creadoEn: new Date().toISOString()
      }

      pedidosInternos.push(newInternalOrder)
      localStorage.setItem('pedidos', JSON.stringify(pedidosInternos))

      // Actualizar pedido de catálogo con la fecha confirmada
      const updatedPedidosCatalogo = (pedidosCatalogo || []).map(p =>
        p.id === selectedPedido.id
          ? { ...p, fechaConfirmadaEntrega: selectedAssignDate, estado: p.estado === 'pendiente' ? 'confirmado' : p.estado }
          : p
      )
      setPedidosCatalogo(updatedPedidosCatalogo)
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidosCatalogo))

      try { window.dispatchEvent(new CustomEvent('pedidos:updated', { detail: { type: 'create', order: newInternalOrder } })) } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'assigned', orderId: selectedPedido.id, fecha: selectedAssignDate } })) } catch (e) {}

      setShowAssignModal(false)
    } catch (e) {
      console.error('Error asignando pedido:', e)
      alert('Ocurrió un error al asignar el pedido. Intenta nuevamente.')
    }
  }

  const handleDelete = () => {
    if (!selectedPedido) return
    
    if (!confirm(`¿Estás seguro de eliminar el pedido #${selectedPedido.id}?`)) {
      return
    }

    const updatedPedidos = pedidosCatalogo.filter(p => p.id !== selectedPedido.id)
    setPedidosCatalogo(updatedPedidos)
    localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidos))
    
    handleCloseModal()
  }



  const handleAsignarCalendario = () => {
    if (!selectedPedido) return

    if (selectedPedido.asignadoAlCalendario) {
      alert('Este pedido ya fue asignado al calendario anteriormente')
      return
    }

    const fechaProduccion = selectedPedido.fechaProduccion || ''
    const fechaEntrega = selectedPedido.fechaConfirmadaEntrega || ''

    if (!fechaProduccion && !fechaEntrega) {
      alert('Debe asignar al menos una fecha (producción o entrega) antes de enviar al calendario')
      return
    }

    // Actualizar pedido
    const updatedPedido = {
      ...selectedPedido,
      asignadoAlCalendario: true,
      estado: 'en_produccion',
      fechaProduccionCalendario: fechaProduccion || null,
      fechaEntregaCalendario: fechaEntrega || null
    }

    const index = pedidosCatalogo.findIndex(p => p.id === selectedPedido.id)
    if (index !== -1) {
      const updatedPedidos = [...pedidosCatalogo]
      updatedPedidos[index] = updatedPedido
      
      setPedidosCatalogo(updatedPedidos)
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidos))
      
      setSelectedPedido(updatedPedido)
      alert('Pedido asignado al calendario correctamente')
    }
  }

  const handleContactWhatsApp = () => {
    if (!selectedPedido) return
    
    const cliente = selectedPedido.cliente
    const telefono = cliente.telefono.replace(/\D/g, '')
    
    let mensaje = `Hola ${cliente.nombre}! Te contacto sobre tu pedido #${selectedPedido.id}:\n\n`
    
    selectedPedido.productos.forEach(prod => {
      mensaje += `• ${prod.cantidad}x ${prod.nombre}\n`
    })
    
    mensaje += `\nTotal: ${formatCurrency(selectedPedido.total)}`
    
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  const handleContactEmail = () => {
    if (!selectedPedido || !selectedPedido.cliente.email) {
      alert('El cliente no proporcionó email')
      return
    }
    
    const cliente = selectedPedido.cliente
    const subject = `Pedido #${selectedPedido.id} - Sistema KOND`
    
    let body = `Hola ${cliente.nombre},\n\nTe contacto sobre tu pedido #${selectedPedido.id}:\n\n`
    
    selectedPedido.productos.forEach(prod => {
      body += `• ${prod.cantidad}x ${prod.nombre} - ${formatCurrency(prod.subtotal)}\n`
    })
    
    body += `\nTotal: ${formatCurrency(selectedPedido.total)}\n\n`
    body += `Saludos,\nSistema KOND`
    
    const mailto = `mailto:${cliente.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  return (
    <Layout title="Pedidos Catálogo - Sistema KOND">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>🛒 Pedidos Catálogo</h1>
          <p className={styles.subtitle}>Gestión de pedidos del catálogo público</p>
        </div>

        {/* Estadísticas */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalPendientes}</div>
            <div className={styles.statLabel}>Pendientes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.pendientesEsteMes}</div>
            <div className={styles.statLabel}>Este Mes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalEntregados}</div>
            <div className={styles.statLabel}>Entregados</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.entregadosEsteMes}</div>
            <div className={styles.statLabel}>Entregados (Mes)</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatCurrency(stats.totalEntregado)}</div>
            <div className={styles.statLabel}>Total Entregado</div>
          </div>
        </div>

        {/* Sub-pestañas */}
        <div className={styles.subtabs}>
          <button
            onClick={() => setActiveSubtab('pendientes')}
            className={`${styles.subtab} ${activeSubtab === 'pendientes' ? styles.active : ''}`}
          >
            <span>⏳</span>
            <span>Pedidos Pendientes</span>
            <span className={styles.badge}>{filteredPendientes.length}</span>
          </button>
          
          <button
            onClick={() => setActiveSubtab('entregados')}
            className={`${styles.subtab} ${activeSubtab === 'entregados' ? styles.active : ''}`}
          >
            <span>🎉</span>
            <span>Pedidos Entregados</span>
            <span className={styles.badge}>{filteredEntregados.length}</span>
          </button>
        </div>

        {/* Contenido Pendientes */}
        {activeSubtab === 'pendientes' && (
          <div className={styles.content}>
            {/* Filtros */}
            <div className={styles.filters}>
              <input
                type="text"
                placeholder="🔍 Buscar por ID, cliente o teléfono..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className={styles.searchInput}
              />
              
              <select
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                className={styles.select}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">⏳ Pendiente</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="en_produccion">🔧 En Producción</option>
                <option value="listo">📦 Listo</option>
              </select>
              
              <select
                value={filters.estadoPago}
                onChange={(e) => setFilters({ ...filters, estadoPago: e.target.value })}
                className={styles.select}
              >
                <option value="all">Todos los pagos</option>
                <option value="sin_seña">Sin Seña</option>
                <option value="seña_pagada">Seña Pagada</option>
                <option value="pagado_total">Pagado Total</option>
              </select>
            </div>

            {/* Lista de pedidos */}
            {filteredPendientes.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <h3>No hay pedidos pendientes</h3>
                <p>Los pedidos pendientes aparecerán aquí</p>
              </div>
            ) : (
              <div className={styles.pedidosGrid}>
                {filteredPendientes.map(pedido => {
                  const thumbnail = getProductThumbnail(pedido)
                  const seña = pedido.estadoPago === 'seña_pagada' 
                    ? (pedido.montoRecibido || pedido.total * 0.5)
                    : 0
                  const restante = pedido.total - seña

                  return (
                    <div
                      key={pedido.id}
                      className={styles.pedidoCard}
                      onClick={() => handleCardClick(pedido)}
                    >
                      {/* Columna izquierda: ID y thumbnail */}
                      <div className={styles.pedidoLeft}>
                        <div className={styles.pedidoId}>
                          <strong>#{pedido.id}</strong>
                          <span className={styles.fechaCreacion}>
                            {formatDate(pedido.fechaCreacion)}
                          </span>
                        </div>
                        <div className={styles.pedidoThumb}>
                          {thumbnail ? (
                            <img src={thumbnail} alt="Producto" />
                          ) : (
                            <span className={styles.placeholder}>📦</span>
                          )}
                        </div>
                      </div>

                      {/* Columna central: Info principal */}
                      <div className={styles.pedidoMain}>
                        <div className={styles.pedidoTopline}>
                          <div className={styles.clienteInfo}>
                            <div className={styles.clienteNombre}>
                              👤 {pedido.cliente.nombre} {pedido.cliente.apellido || ''}
                            </div>
                            <div className={styles.clienteContactLine}>
                              📱 {pedido.cliente.telefono}
                            </div>
                          </div>
                        </div>

                        <div className={styles.pedidoBadges}>
                          <span className={`${styles.statusBadge} ${styles[pedido.estado]}`}>
                            {getStatusEmoji(pedido.estado)} {getStatusLabel(pedido.estado)}
                          </span>
                          <span className={`${styles.pagoBadge} ${styles[pedido.estadoPago]}`}>
                            {getPaymentLabel(pedido.estadoPago)}
                          </span>
                        </div>

                        <div className={styles.productosPreview}>
                          📦 {pedido.productos.length} producto{pedido.productos.length > 1 ? 's' : ''}
                        </div>

                        {/* Resumen financiero */}
                        {pedido.estadoPago === 'seña_pagada' && (
                          <div className={styles.resumenFinanciero}>
                            <span>💵 Seña: {formatCurrency(seña)}</span>
                            <span>•</span>
                            <span>💰 Restante: {formatCurrency(restante)}</span>
                          </div>
                        )}

                        {/* Información de fechas */}
                        <div className={styles.fechasInfo}>
                          <span>🚚 Entrega: {formatFechaEntrega(pedido)}</span>
                          <span>•</span>
                          <span>🏭 Producción: {formatFechaProduccion(pedido)}</span>
                        </div>
                      </div>

                      {/* Columna derecha: Total */}
                      <div className={styles.pedidoRight}>
                        <div className={styles.totalBox}>
                          <div className={styles.pedidoTotal}>
                            {formatCurrency(pedido.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Contenido Entregados */}
        {activeSubtab === 'entregados' && (
          <div className={styles.content}>
            {/* Filtros */}
            <div className={styles.filters}>
              <input
                type="text"
                placeholder="🔍 Buscar por ID, cliente o teléfono..."
                value={deliveredFilters.search}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, search: e.target.value })}
                className={styles.searchInput}
              />
              
              <select
                value={deliveredFilters.estadoPago}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, estadoPago: e.target.value })}
                className={styles.select}
              >
                <option value="all">Todos los pagos</option>
                <option value="sin_seña">Sin Seña</option>
                <option value="seña_pagada">Seña Pagada</option>
                <option value="pagado_total">Pagado Total</option>
              </select>
              
              <input
                type="date"
                value={deliveredFilters.fecha}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, fecha: e.target.value })}
                className={styles.dateInput}
              />
            </div>

            {/* Lista de pedidos */}
            {filteredEntregados.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎉</div>
                <h3>No hay pedidos entregados</h3>
                <p>Los pedidos entregados aparecerán aquí</p>
              </div>
            ) : (
              <div className={styles.pedidosGrid}>
                {filteredEntregados.map(pedido => {
                  const thumbnail = getProductThumbnail(pedido)

                  return (
                    <div
                      key={pedido.id}
                      className={`${styles.pedidoCard} ${styles.entregado}`}
                      onClick={() => handleCardClick(pedido)}
                    >
                      {/* Similar estructura pero con estilo entregado */}
                      <div className={styles.pedidoLeft}>
                        <div className={styles.pedidoId}>
                          <strong>#{pedido.id}</strong>
                          <span className={styles.fechaCreacion}>
                            {formatDate(pedido.fechaCreacion)}
                          </span>
                        </div>
                        <div className={styles.pedidoThumb}>
                          {thumbnail ? (
                            <img src={thumbnail} alt="Producto" />
                          ) : (
                            <span className={styles.placeholder}>📦</span>
                          )}
                        </div>
                      </div>

                      <div className={styles.pedidoMain}>
                        <div className={styles.pedidoTopline}>
                          <div className={styles.clienteInfo}>
                            <div className={styles.clienteNombre}>
                              👤 {pedido.cliente.nombre} {pedido.cliente.apellido || ''}
                            </div>
                            <div className={styles.clienteContactLine}>
                              📱 {pedido.cliente.telefono}
                            </div>
                          </div>
                        </div>

                        <div className={styles.pedidoBadges}>
                          <span className={`${styles.statusBadge} ${styles.entregado}`}>
                            🎉 Entregado
                          </span>
                          <span className={`${styles.pagoBadge} ${styles[pedido.estadoPago]}`}>
                            {getPaymentLabel(pedido.estadoPago)}
                          </span>
                        </div>

                        <div className={styles.productosPreview}>
                          📦 {pedido.productos.length} producto{pedido.productos.length > 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className={styles.pedidoRight}>
                        <div className={styles.totalBox}>
                          <div className={styles.pedidoTotal}>
                            {formatCurrency(pedido.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal de Detalle */}
        {showDetailModal && selectedPedido && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Pedido #{selectedPedido.id}</h2>
                <button onClick={handleCloseModal} className={styles.closeBtn}>✕</button>
              </div>

              <div className={styles.modalBody}>
                {/* Información del Cliente */}
                <div className={styles.section}>
                  <h3>👤 Información del Cliente</h3>
                  <div className={styles.infoGrid}>
                    <div>
                      <strong>Nombre:</strong>
                      <p>{selectedPedido.cliente.nombre} {selectedPedido.cliente.apellido || ''}</p>
                    </div>
                    <div>
                      <strong>Teléfono:</strong>
                      <p>{selectedPedido.cliente.telefono}</p>
                    </div>
                    <div>
                      <strong>Email:</strong>
                      <p>{selectedPedido.cliente.email || 'No proporcionado'}</p>
                    </div>
                    <div>
                      <strong>Dirección:</strong>
                      <p>{selectedPedido.cliente.direccion || 'No proporcionada'}</p>
                    </div>
                  </div>

                  <div className={styles.contactActions}>
                    <button onClick={handleContactWhatsApp} className={styles.btnWhatsApp}>
                      📱 WhatsApp
                    </button>
                    <button onClick={handleContactEmail} className={styles.btnEmail}>
                      📧 Email
                    </button>
                  </div>
                </div>

                {/* Estado del Pedido */}
                <div className={styles.section}>
                  <h3>📊 Estado del Pedido</h3>
                  <div className={styles.infoGrid}>
                    <div>
                      <strong>Estado:</strong>
                      <select
                        value={selectedPedido.estado}
                        onChange={(e) => setSelectedPedido({ ...selectedPedido, estado: e.target.value })}
                        className={styles.formSelect}
                      >
                        <option value="pendiente">⏳ Pendiente confirmación</option>
                        <option value="confirmado">✅ Confirmado</option>
                        <option value="en_produccion">🔧 En Producción</option>
                        <option value="listo">📦 Listo para entrega</option>
                        <option value="entregado">🎉 Entregado</option>
                      </select>
                    </div>
                    <div>
                      <strong>Estado de Pago:</strong>
                      <select
                        value={selectedPedido.estadoPago}
                        onChange={(e) => {
                          const newEstado = e.target.value;
                          const total = Number(selectedPedido.total || 0);
                          let newMonto = selectedPedido.montoRecibido || 0;
                          if (newEstado === 'seña_pagada' && newMonto === 0) {
                            newMonto = Math.round(total * 0.5);
                          } else if (newEstado === 'pagado_total') {
                            newMonto = total;
                          }
                          setSelectedPedido({ ...selectedPedido, estadoPago: newEstado, montoRecibido: newMonto });
                        }}
                        className={styles.formSelect}
                      >
                        <option value="sin_seña">Sin seña</option>
                        <option value="seña_pagada">Seña pagada</option>
                        <option value="pagado_total">Pagado total</option>
                      </select>
                    </div>
                    <div>
                      <strong>Fecha Solicitada:</strong>
                      <p>{formatDate(selectedPedido.fechaSolicitudEntrega)}</p>
                    </div>
                    <div>
                      <strong>Fecha Confirmada:</strong>
                      <input
                        type="date"
                        value={selectedPedido.fechaConfirmadaEntrega || ''}
                        onChange={(e) => setSelectedPedido({ ...selectedPedido, fechaConfirmadaEntrega: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                    <div>
                      <strong>Fecha de Producción:</strong>
                      <input
                        type="date"
                        value={selectedPedido.fechaProduccion || ''}
                        onChange={(e) => setSelectedPedido({ ...selectedPedido, fechaProduccion: e.target.value })}
                        className={styles.formInput}
                      />
                    </div>
                    <div>
                      <strong>Monto Recibido:</strong>
                      <input
                        type="number"
                        value={selectedPedido.montoRecibido || 0}
                        onChange={(e) => setSelectedPedido({ ...selectedPedido, montoRecibido: parseFloat(e.target.value) || 0 })}
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  {selectedPedido.estado === 'confirmado' && !selectedPedido.asignadoAlCalendario && (
                    <button onClick={handleAsignarCalendario} className={styles.btnCalendar}>
                      📅 Asignar al Calendario
                    </button>
                  )}
                  
                  {selectedPedido.asignadoAlCalendario && (
                    <div className={styles.alertSuccess}>
                      ✅ Este pedido ya fue asignado al calendario
                    </div>
                  )}
                </div>

                {/* Productos */}
                <div className={styles.section}>
                  <h3>📦 Productos del Pedido</h3>
                  <div className={styles.productosList}>
                    {selectedPedido.productos.map((prod, idx) => (
                      <div key={idx} className={styles.productoItem}>
                        <div className={styles.productoInfo}>
                          <div className={styles.productoNombre}>{prod.nombre}</div>
                          <div className={styles.productoSpecs}>
                            <span>📏 {prod.medidas || 'Sin medidas'}</span>
                            <span>📦 Cantidad: {prod.cantidad}</span>
                            <span>💰 Precio unit: {formatCurrency(prod.precioUnitario)}</span>
                          </div>
                        </div>
                        <div className={styles.productoPrecio}>
                          {formatCurrency(prod.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen Financiero */}
                <div className={styles.section}>
                  <h3>💰 Resumen Financiero</h3>
                  <div className={styles.resumenTable}>
                    <div className={styles.resumenRow}>
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedPedido.subtotal)}</span>
                    </div>
                    {selectedPedido.descuento > 0 && (
                      <div className={styles.resumenRow}>
                        <span>Descuento:</span>
                        <span>-{formatCurrency(selectedPedido.descuento)}</span>
                      </div>
                    )}
                    <div className={`${styles.resumenRow} ${styles.total}`}>
                      <span>Total:</span>
                      <span>{formatCurrency(selectedPedido.total)}</span>
                    </div>
                    {selectedPedido.estadoPago === 'seña_pagada' && (
                      <>
                        <div className={styles.resumenRow}>
                          <span>Seña Pagada:</span>
                          <span>{formatCurrency(selectedPedido.montoRecibido || selectedPedido.total * 0.5)}</span>
                        </div>
                        <div className={`${styles.resumenRow} ${styles.restante}`}>
                          <span>Restante:</span>
                          <span>{formatCurrency(selectedPedido.total - (selectedPedido.montoRecibido || selectedPedido.total * 0.5))}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Comprobante */}
                {selectedPedido.comprobante && (
                  <div className={styles.section}>
                    <h3>📄 Comprobante de Pago</h3>
                    <img src={selectedPedido.comprobante} alt="Comprobante" className={styles.comprobanteImg} />
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button onClick={handleDelete} className={styles.btnDelete}>
                  🗑️ Eliminar
                </button>
                <button onClick={handleSaveChanges} className={styles.btnSave}>
                  ✅ Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal Asignar Pedido */}
        {showAssignModal && selectedPedido && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{ maxWidth: '940px' }}>
              <div className={styles.modalHeader}>
                <h2>Asignar Pedido #{selectedPedido.id}</h2>
                <button onClick={closeAssignModal} className={styles.closeBtn}>×</button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
                  <div>
                    <AvailabilityCalendar
                      cart={buildCalendarCartFromPedido(selectedPedido)}
                      selectedDate={selectedAssignDate}
                      onDateSelect={setSelectedAssignDate}
                    />
                  </div>
                  <div>
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0' }}>Resumen</h4>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <div>Cliente: {selectedPedido.cliente?.nombre} {selectedPedido.cliente?.apellido}</div>
                        <div>Items: {selectedPedido.productos?.length || 0}</div>
                        <div>Total: {formatCurrency(selectedPedido.total || 0)}</div>
                        <div style={{ marginTop: '8px' }}>Fecha seleccionada: {selectedAssignDate || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.btnSecondary} onClick={closeAssignModal}>Cancelar</button>
                <button className={styles.btnPrimary} disabled={!selectedAssignDate} onClick={confirmAssign}>Confirmar asignación</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
