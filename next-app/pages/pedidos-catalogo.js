import Layout from '../components/Layout'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import PedidoCard from '../components/PedidoCard'
import ConfirmModal from '../components/ConfirmModal'
import { useState, useEffect } from 'react'
import styles from '../styles/pedidos-catalogo.module.css'
import { registrarMovimiento } from '../utils/finanzasUtils'
import { formatCurrency, createToast } from '../utils/catalogUtils'

function OrdersStats({ orders, filteredOrders }) {
  // Calcular estadísticas
  const totalOrders = filteredOrders.length
  const pendingOrders = filteredOrders.filter(o => o.estado === 'pendiente').length
  const confirmedOrders = filteredOrders.filter(o => o.estado === 'confirmado').length
  const inProgressOrders = filteredOrders.filter(o => o.estado === 'en_preparacion' || o.estado === 'en_produccion').length
  const readyOrders = filteredOrders.filter(o => o.estado === 'listo').length
  const deliveredOrders = filteredOrders.filter(o => o.estado === 'entregado').length

  // Calcular montos
  const totalAmount = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  const pendingAmount = filteredOrders.filter(o => o.estado !== 'entregado' && o.estado !== 'cancelado')
    .reduce((sum, order) => sum + (order.total || 0), 0)
  const deliveredAmount = filteredOrders.filter(o => o.estado === 'entregado')
    .reduce((sum, order) => sum + (order.total || 0), 0)

  // Pedidos de este mes
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const thisMonthOrders = filteredOrders.filter(order => {
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

export default function PedidosCatalogo() {
  // Estados
  const [pedidosCatalogo, setPedidosCatalogo] = useState([])
  const [productosBase, setProductosBase] = useState([])
  const [materiales, setMateriales] = useState([])
  const [activeSubtab, setActiveSubtab] = useState('pendientes')
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAssignDate, setSelectedAssignDate] = useState(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // Filtros pendientes
  const [filters, setFilters] = useState({
    search: '',
    estado: 'all',
    estadoPago: 'all',
    metodoPago: 'all',
    dateFrom: '',
    dateTo: ''
  })
  
  // Filtros entregados
  const [deliveredFilters, setDeliveredFilters] = useState({
    search: '',
    estadoPago: 'all',
    metodoPago: 'all',
    fecha: '',
    dateFrom: '',
    dateTo: ''
  })
  
  // Paginación
  const [currentPagePendientes, setCurrentPagePendientes] = useState(1)
  const [currentPageEntregados, setCurrentPageEntregados] = useState(1)
  const itemsPerPage = 6
  
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
      const mats = JSON.parse(localStorage.getItem('materiales')) || []
      // Normalizar pedidos al cargarlos para evitar inconsistencias entre legacy y Next
      const normalized = (pedidos || []).map(normalizePedido)
      setPedidosCatalogo(normalized)
      setProductosBase(productos)
      setMateriales(mats)
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
  }

  // Cuando el admin cambia la fecha de producción desde la tarjeta, persistir el cambio
  const handleChangeFechaProduccion = (e) => {
    if (!selectedPedido) return
    const valor = e.target.value || ''
    // Validar que la fecha de producción no esté en el pasado (hoy está permitido)
    if (valor) {
      const hoy = new Date()
      hoy.setHours(0,0,0,0)
      const fechaProd = new Date(valor + 'T00:00:00')
      if (fechaProd < hoy) {
        showValidationError('La fecha de producción no puede ser en el pasado')
        return
      }
    }

    // Validar que la fecha de producción no sea posterior a la fecha de entrega
    if (valor && selectedPedido.fechaConfirmadaEntrega) {
      const fechaProd = new Date(valor + 'T00:00:00')
      const fechaEntrega = new Date(selectedPedido.fechaConfirmadaEntrega + 'T00:00:00')
      if (fechaProd > fechaEntrega) {
        showValidationError('La fecha de producción no puede ser posterior a la fecha de entrega confirmada')
        return
      }
    }

    // Actualizar selectedPedido localmente
    const updatedPedido = { ...selectedPedido, fechaProduccion: valor }

    // Si hay una fecha y el pedido está confirmado, asignarlo automáticamente al calendario
    // IMPORTANTE: no cambiar el estado a 'en_produccion' aquí — debe permanecer 'confirmado'
    if (valor && updatedPedido.estado === 'confirmado') {
      updatedPedido.asignadoAlCalendario = true
      updatedPedido.fechaProduccionCalendario = valor
    }

    // Actualizar lista global pedidosCatalogo
    const index = pedidosCatalogo.findIndex(p => p.id === updatedPedido.id)
    if (index !== -1) {
      const updatedPedidos = [...pedidosCatalogo]
      updatedPedidos[index] = updatedPedido
      setPedidosCatalogo(updatedPedidos)
      persistAndEmit(updatedPedidos, updatedPedido.id, 'fechaProduccionChanged', valor)
      setSelectedPedido(updatedPedido)
    } else {
      // Si por alguna razón no está en el array, solo actualizar el seleccionado
      setSelectedPedido(updatedPedido)
    }
  }

  // Cuando el admin cambia la fecha confirmada de entrega, persistir el cambio
  const handleChangeFechaConfirmada = (e) => {
    if (!selectedPedido) return
    const valor = e.target.value || ''

    // Validar que la fecha confirmada no esté en el pasado
    if (valor) {
      const hoy = new Date()
      hoy.setHours(0,0,0,0)
      const fechaEntregaCheq = new Date(valor + 'T00:00:00')
      if (fechaEntregaCheq < hoy) {
        createToast('La fecha de entrega no puede ser en el pasado', 'error')
        return
      }
    }

    // Validar que la fecha de entrega no sea anterior a la fecha de producción
    if (valor && selectedPedido.fechaProduccion) {
      const fechaEntrega = new Date(valor + 'T00:00:00')
      const fechaProd = new Date(selectedPedido.fechaProduccion + 'T00:00:00')
      if (fechaEntrega < fechaProd) {
        createToast('La fecha de entrega no puede ser anterior a la fecha de producción', 'error')
        return
      }
    }

    const updatedPedido = { ...selectedPedido, fechaConfirmadaEntrega: valor }

    // Si hay una fecha de entrega y el pedido está confirmado, asignarlo al calendario
    // IMPORTANTE: no cambiar el estado a 'en_produccion' aquí — debe permanecer 'confirmado'
    if (valor && updatedPedido.estado === 'confirmado') {
      updatedPedido.asignadoAlCalendario = true
      updatedPedido.fechaEntregaCalendario = valor
    }

    const index = pedidosCatalogo.findIndex(p => p.id === updatedPedido.id)
    if (index !== -1) {
      const updatedPedidos = [...pedidosCatalogo]
      updatedPedidos[index] = updatedPedido
      setPedidosCatalogo(updatedPedidos)
      persistAndEmit(updatedPedidos, updatedPedido.id, 'fechaEntregaChanged', valor)
      setSelectedPedido(updatedPedido)
    } else {
      setSelectedPedido(updatedPedido)
    }
  }

  // Cuando el admin cambia el estado del pedido desde el modal, aplicar reglas de asignación dinámicas
  const handleChangeEstado = (newStatus) => {
    if (!selectedPedido) return

    const updatedPedido = { ...selectedPedido }

    if (newStatus === 'pendiente') {
      // Si se vuelve a pendiente, quitar asignación al calendario
      updatedPedido.estado = 'pendiente'
      updatedPedido.asignadoAlCalendario = false
      delete updatedPedido.fechaProduccionCalendario
      delete updatedPedido.fechaEntregaCalendario
    } else if (newStatus === 'confirmado') {
      // Marcar confirmado y, si ya hay fechas, asignar al calendario automáticamente
      updatedPedido.estado = 'confirmado'
      const fechaProd = updatedPedido.fechaProduccion || updatedPedido.fechaProduccionCalendario || null
      const fechaEnt = updatedPedido.fechaConfirmadaEntrega || updatedPedido.fechaEntregaCalendario || null
      if (fechaProd || fechaEnt) {
        updatedPedido.asignadoAlCalendario = true
        // Mantener estado en 'confirmado'. La transición a 'en_produccion' debe ocurrir el día indicado.
        if (fechaProd) updatedPedido.fechaProduccionCalendario = fechaProd
        if (fechaEnt) updatedPedido.fechaEntregaCalendario = fechaEnt
      } else {
        // Sin fechas, mantenemos confirmado pero no asignado
        updatedPedido.asignadoAlCalendario = false
      }
    } else {
      // Otros estados: aplicar directamente
      updatedPedido.estado = newStatus
      // Si se pasa a pendiente explicito, limpiar asignaciones
      if (newStatus === 'pendiente') {
        updatedPedido.asignadoAlCalendario = false
      }
    }

    // Actualizar en el array global y persistir
    const index = pedidosCatalogo.findIndex(p => p.id === updatedPedido.id)
    if (index !== -1) {
      const updatedPedidos = [...pedidosCatalogo]
      updatedPedidos[index] = updatedPedido
      setPedidosCatalogo(updatedPedidos)
      persistAndEmit(updatedPedidos, updatedPedido.id, 'update-status')
      setSelectedPedido(updatedPedido)
    } else {
      setSelectedPedido(updatedPedido)
    }
  }

  // Helper para persistir pedidosCatalogo y emitir un evento homogéneo
  function persistAndEmit(updatedPedidosArray, pedidoId, tipo = 'update', fecha = null) {
    try {
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidosArray))
    } catch (err) {
      console.warn('No se pudo persistir pedidosCatalogo en localStorage:', err)
    }

    try {
      const detail = { orderId: pedidoId, type: tipo }
      if (fecha) detail.fecha = fecha
      detail.timestamp = new Date().toISOString()
      window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail }))
    } catch (err) {
      // noop
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
    // Normalizar items/productos
    if (p.items && !p.productos) clone.productos = p.items
    if (!clone.productos) clone.productos = []
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

      if (filters.metodoPago !== 'all') {
        matches = matches && p.metodoPago === filters.metodoPago
      }

      if (filters.dateFrom) {
        matches = matches && new Date(p.fechaCreacion) >= new Date(filters.dateFrom)
      }

      if (filters.dateTo) {
        matches = matches && new Date(p.fechaCreacion) <= new Date(filters.dateTo + 'T23:59:59')
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

      if (deliveredFilters.metodoPago !== 'all') {
        matches = matches && p.metodoPago === deliveredFilters.metodoPago
      }

      if (deliveredFilters.fecha) {
        const orderDate = new Date(p.fechaCreacion).toISOString().split('T')[0]
        matches = matches && orderDate === deliveredFilters.fecha
      }

      if (deliveredFilters.dateFrom) {
        matches = matches && new Date(p.fechaCreacion) >= new Date(deliveredFilters.dateFrom)
      }

      if (deliveredFilters.dateTo) {
        matches = matches && new Date(p.fechaCreacion) <= new Date(deliveredFilters.dateTo + 'T23:59:59')
      }

      return matches
    })

  // Resetear paginación cuando cambien filtros
  useEffect(() => {
    setCurrentPagePendientes(1)
  }, [filters])

  useEffect(() => {
    setCurrentPageEntregados(1)
  }, [deliveredFilters])

  // Cerrar modal con ESC
  useEffect(() => {
    if (showDetailModal) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setShowDetailModal(false)
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDetailModal])

  // Calcular paginación para pendientes
  const totalPagesPendientes = Math.ceil(filteredPendientes.length / itemsPerPage)
  const startIndexPendientes = (currentPagePendientes - 1) * itemsPerPage
  const endIndexPendientes = startIndexPendientes + itemsPerPage
  const currentPendientes = filteredPendientes.slice(startIndexPendientes, endIndexPendientes)

  // Calcular paginación para entregados
  const totalPagesEntregados = Math.ceil(filteredEntregados.length / itemsPerPage)
  const startIndexEntregados = (currentPageEntregados - 1) * itemsPerPage
  const endIndexEntregados = startIndexEntregados + itemsPerPage
  const currentEntregados = filteredEntregados.slice(startIndexEntregados, endIndexEntregados)

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
      'en_preparacion': '🔧',
      'en_produccion': '🔧',
      'listo': '📦',
      'entregado': '🎉',
      'cancelado': '❌'
    }
    return emojis[status] || '📋'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pendiente': 'Pendiente confirmación',
      'confirmado': 'Confirmado',
      'en_preparacion': 'En preparación',
      'en_produccion': 'En Producción',
      'listo': 'Listo para entrega',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
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
      const { parseDateYMD } = require('../utils/catalogUtils')
      const fecha = parseDateYMD(pedido.fechaConfirmadaEntrega) || new Date(pedido.fechaConfirmadaEntrega + 'T00:00:00')
      return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
    return 'Sin confirmar'
  }

  const updateOrderStatus = (orderId, newStatus) => {
    try {
      // Encontrar el pedido original para aplicar reglas de asignación
      const updatedPedidos = pedidosCatalogo.map(p => {
        if (p.id !== orderId) return p

        // Base del pedido actualizado
        const base = { ...p }

        // Si se marca como confirmado
        if (newStatus === 'confirmado') {
          base.estado = 'confirmado'

          // Si ya tiene fechas solicitadas, asignarlo al calendario automáticamente
          const fechaProd = base.fechaProduccion || base.fechaProduccionCalendario || null
          const fechaEntrega = base.fechaConfirmadaEntrega || base.fechaEntregaCalendario || null

          if (fechaProd || fechaEntrega) {
            base.asignadoAlCalendario = true
            // Mantener el estado como 'confirmado'. La transición a 'en_produccion' se realiza en la fecha.
            if (fechaProd) base.fechaProduccionCalendario = fechaProd
            if (fechaEntrega) base.fechaEntregaCalendario = fechaEntrega
          }
        }

        // Si se marca como pendiente, limpiar asignaciones para forzar reasignación posterior
        else if (newStatus === 'pendiente') {
          base.estado = 'pendiente'
          base.asignadoAlCalendario = false
          delete base.fechaProduccionCalendario
          delete base.fechaEntregaCalendario
        } else {
          // Otros estados: simplemente aplicar
          base.estado = newStatus
        }

        return base
      })

      setPedidosCatalogo(updatedPedidos)
      persistAndEmit(updatedPedidos, orderId, 'update-status')
      return { success: true }
    } catch (error) {
      console.error('Error updating order status:', error)
      return { success: false, error }
    }
  }

  const updateOrderPaymentStatus = (orderId, newPaymentStatus) => {
    try {
      const updatedPedidos = pedidosCatalogo.map(p => 
        p.id === orderId ? { ...p, estadoPago: newPaymentStatus } : p
      )
      setPedidosCatalogo(updatedPedidos)
      persistAndEmit(updatedPedidos, orderId, 'update-payment')
      return { success: true }
    } catch (error) {
      console.error('Error updating payment status:', error)
      return { success: false, error }
    }
  }

  // Función para descargar comprobante
  const downloadComprobante = (pedido) => {
    if (!pedido.comprobante) return

    const data = pedido.comprobante
    
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
        link.download = `comprobante-pedido-${pedido.id}${ext}`
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
    link.download = `comprobante-pedido-${pedido.id}${guessedExt}`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const formatFechaProduccion = (pedido) => {
    if (pedido.fechaProduccion) {
  const { parseDateYMD } = require('../utils/catalogUtils')
  const fecha = parseDateYMD(pedido.fechaProduccion) || new Date(pedido.fechaProduccion + 'T00:00:00')
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
    const productBase = productosBase.find(p => p.id === firstProduct.productId || p.id === firstProduct.idProducto)
    
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
      persistAndEmit(updatedPedidos, selectedPedido.id, 'save-changes')
      
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
      
      setShowConfirmModal(true)
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
    setSelectedAssignDate(null)
  }

  const showValidationError = (message) => {
    setValidationMessage(message)
    setShowValidationModal(true)
  }

  const closeValidationModal = () => {
    setShowValidationModal(false)
    setValidationMessage('')
  }

  const buildCalendarCartFromPedido = (pedido) => {
    if (!pedido || !Array.isArray(pedido.productos)) return []
    return pedido.productos.map(item => {
      const productData = getProductData(item)
      return {
        name: item.nombre,
        measures: item.medidas || '',
        price: item.precioUnitario || (Number(item.subtotal || 0) / Math.max(1, Number(item.cantidad || 1))),
        quantity: Number(item.cantidad || 1),
        tiempoUnitario: productData.tiempoUnitario || item.tiempoUnitario || '00:00:00',
        precioPorMinuto: productData.precioPorMinuto || 0
      }
    })
  }

  const confirmAssign = () => {
    if (!selectedPedido || !selectedAssignDate) return

    // Validar que la fecha seleccionada no sea en el pasado (hoy permitido)
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    const fechaSeleccionada = new Date(selectedAssignDate + 'T00:00:00')
    if (fechaSeleccionada < hoy) {
      createToast('No se puede asignar una fecha en el pasado', 'error')
      return
    }

    // Validar que la fecha de entrega no sea anterior a la fecha de producción
    if (selectedPedido.fechaProduccion) {
      const fechaEntrega = fechaSeleccionada
      const fechaProd = new Date(selectedPedido.fechaProduccion + 'T00:00:00')
      if (fechaEntrega < fechaProd) {
        createToast('La fecha de entrega no puede ser anterior a la fecha de producción', 'error')
        return
      }
    }

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

    // Validar que ninguna de las fechas esté en el pasado (hoy permitido)
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    if (fechaProduccion) {
      const fp = new Date(fechaProduccion + 'T00:00:00')
      if (fp < hoy) {
        createToast('La fecha de producción no puede ser en el pasado', 'error')
        return
      }
    }
    if (fechaEntrega) {
      const fe = new Date(fechaEntrega + 'T00:00:00')
      if (fe < hoy) {
        createToast('La fecha de entrega no puede ser en el pasado', 'error')
        return
      }
    }

    if (!fechaProduccion && !fechaEntrega) {
      alert('Debe asignar al menos una fecha (producción o entrega) antes de enviar al calendario')
      return
    }

    // Validar que la fecha de producción no sea posterior a la fecha de entrega
    if (fechaProduccion && fechaEntrega) {
      const fechaProd = new Date(fechaProduccion + 'T00:00:00')
      const fechaEnt = new Date(fechaEntrega + 'T00:00:00')
      if (fechaProd > fechaEnt) {
        createToast('La fecha de producción no puede ser posterior a la fecha de entrega', 'error')
        return
      }
    }

    // Actualizar pedido: marcar asignado al calendario y mantener/ajustar estado a 'confirmado'
    const updatedPedido = {
      ...selectedPedido,
      asignadoAlCalendario: true,
      // Si estaba pendiente, lo ponemos en 'confirmado'; si ya tenía otro estado lo dejamos como está.
      estado: selectedPedido.estado === 'pendiente' ? 'confirmado' : selectedPedido.estado,
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

  // Función para obtener datos del producto desde productosBase
  const getProductData = (prod) => {
    // Si el producto ya tiene los datos, usarlos
    if (prod.tiempoUnitario && prod.precioPorMinuto) {
      return {
        tiempoUnitario: prod.tiempoUnitario,
        precioPorMinuto: prod.precioPorMinuto
      }
    }

    // Buscar en productosBase por productId o nombre
    const productoBase = productosBase.find(p => 
      p.id === prod.productId || 
      p.id === prod.idProducto ||
      p.nombre?.toLowerCase() === prod.nombre?.toLowerCase()
    )

    if (productoBase) {
      return {
        tiempoUnitario: productoBase.tiempoUnitario || '00:00:00',
        precioPorMinuto: productoBase.precioPorMinuto || 0,
        material: productoBase.material || null,
        espesor: productoBase.espesor || null
      }
    }

    // Valores por defecto
    return {
      tiempoUnitario: '00:00:00',
      precioPorMinuto: 0,
      material: null,
      espesor: null
    }
  }

  // Función para obtener información completa del material
  const getMaterialInfo = (materialName) => {
    if (!materialName) return null
    return materiales.find(m => m.nombre === materialName)
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
        <OrdersStats orders={pedidosCatalogo} filteredOrders={activeSubtab === 'pendientes' ? filteredPendientes : filteredEntregados} />

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
                <option value="en_preparacion">🔧 En Preparación</option>
                <option value="listo">📦 Listo</option>
                <option value="entregado">🎉 Entregado</option>
                <option value="cancelado">❌ Cancelado</option>
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

              <select
                value={filters.metodoPago}
                onChange={(e) => setFilters({ ...filters, metodoPago: e.target.value })}
                className={styles.select}
              >
                <option value="all">Todos los métodos</option>
                <option value="transferencia">💳 Transferencia</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="retiro">🏪 Retiro</option>
              </select>

              <input
                type="date"
                placeholder="Fecha desde"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className={styles.dateInput}
              />

              <input
                type="date"
                placeholder="Fecha hasta"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className={styles.dateInput}
              />
            </div>

            {/* Lista de pedidos */}
            {currentPendientes.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <h3>No hay pedidos pendientes</h3>
                <p>Los pedidos pendientes aparecerán aquí</p>
              </div>
            ) : (
              <>
                <div className={styles.pedidosGrid}>
                  {currentPendientes.map(pedido => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onClick={handleCardClick}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      getStatusEmoji={getStatusEmoji}
                      getStatusLabel={getStatusLabel}
                      getPaymentLabel={getPaymentLabel}
                      getProductThumbnail={getProductThumbnail}
                      formatFechaEntrega={formatFechaEntrega}
                      formatFechaProduccion={formatFechaProduccion}
                    />
                  ))}
                </div>

                {/* Paginación */}
                {totalPagesPendientes > 1 && (
                  <div className={styles.pagination}>
                    {currentPagePendientes > 1 && (
                      <button
                        onClick={() => setCurrentPagePendientes(prev => Math.max(prev - 1, 1))}
                        className={styles.pageBtn}
                      >
                        ← Anterior
                      </button>
                    )}

                    <div className={styles.pageNumbers}>
                      {Array.from({ length: totalPagesPendientes }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPagePendientes(page)}
                          className={`${styles.pageNumber} ${currentPagePendientes === page ? styles.active : ''}`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    {currentPagePendientes < totalPagesPendientes && (
                      <button
                        onClick={() => setCurrentPagePendientes(prev => Math.min(prev + 1, totalPagesPendientes))}
                        className={styles.pageBtn}
                      >
                        Siguiente →
                      </button>
                    )}
                  </div>
                )}

                <div className={styles.pageInfo}>
                  Mostrando {startIndexPendientes + 1}-{Math.min(endIndexPendientes, filteredPendientes.length)} de {filteredPendientes.length} pedidos
                </div>
              </>
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

              <select
                value={deliveredFilters.metodoPago}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, metodoPago: e.target.value })}
                className={styles.select}
              >
                <option value="all">Todos los métodos</option>
                <option value="transferencia">💳 Transferencia</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="retiro">🏪 Retiro</option>
              </select>

              <input
                type="date"
                value={deliveredFilters.fecha}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, fecha: e.target.value })}
                className={styles.dateInput}
                placeholder="Fecha específica"
              />

              <input
                type="date"
                placeholder="Fecha desde"
                value={deliveredFilters.dateFrom}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, dateFrom: e.target.value })}
                className={styles.dateInput}
              />

              <input
                type="date"
                placeholder="Fecha hasta"
                value={deliveredFilters.dateTo}
                onChange={(e) => setDeliveredFilters({ ...deliveredFilters, dateTo: e.target.value })}
                className={styles.dateInput}
              />
            </div>

            {/* Lista de pedidos */}
            {currentEntregados.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎉</div>
                <h3>No hay pedidos entregados</h3>
                <p>Los pedidos entregados aparecerán aquí</p>
              </div>
            ) : (
              <>
                <div className={styles.pedidosGrid}>
                  {currentEntregados.map(pedido => {
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
                              <span className={styles.placeholder}>
                                {pedido.productos && pedido.productos.length > 0 ? pedido.productos[0].nombre || '📦' : '📦'}
                              </span>
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

              {/* Paginación */}
              {totalPagesEntregados > 1 && (
                <div className={styles.pagination}>
                  {currentPageEntregados > 1 && (
                    <button
                      onClick={() => setCurrentPageEntregados(prev => Math.max(prev - 1, 1))}
                      className={styles.pageBtn}
                    >
                      ← Anterior
                    </button>
                  )}

                  <div className={styles.pageNumbers}>
                    {Array.from({ length: totalPagesEntregados }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPageEntregados(page)}
                        className={`${styles.pageNumber} ${currentPageEntregados === page ? styles.active : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {currentPageEntregados < totalPagesEntregados && (
                    <button
                      onClick={() => setCurrentPageEntregados(prev => Math.min(prev + 1, totalPagesEntregados))}
                      className={styles.pageBtn}
                    >
                      Siguiente →
                    </button>
                  )}
                </div>
              )}

              <div className={styles.pageInfo}>
                Mostrando {startIndexEntregados + 1}-{Math.min(endIndexEntregados, filteredEntregados.length)} de {filteredEntregados.length} pedidos
              </div>
            </>
            )}
          </div>
        )}

        {/* Modal de Detalle - Diseño Minimalista */}
        {showDetailModal && selectedPedido && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.modalContentNew} onClick={(e) => e.stopPropagation()}>
              {/* Header Minimalista */}
              <div className={styles.modalHeaderNew}>
                <div className={styles.headerTop}>
                  <div className={styles.pedidoId}>#{selectedPedido.id}</div>
                  <button onClick={handleCloseModal} className={styles.closeBtnNew}>×</button>
                </div>
                <div className={styles.headerInfo}>
                  <div className={styles.clienteMain}>
                    <span className={styles.clienteNombre}>
                      {selectedPedido.cliente.nombre} {selectedPedido.cliente.apellido || ''}
                    </span>
                    <span className={styles.clienteContacto}>
                      {selectedPedido.cliente.telefono} · {selectedPedido.cliente.email || 'Sin email'}
                    </span>
                  </div>
                  <div className={styles.contactActions}>
                    <button onClick={handleContactWhatsApp} className={styles.btnWhatsApp} title="WhatsApp">
                      📱
                    </button>
                    <button onClick={handleContactEmail} className={styles.btnEmail} title="Email">
                      📧
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.modalBodyNew}>
                {/* Estados en Cards Horizontales (editable) */}
                <div className={styles.estadosGrid}>
                  <div className={styles.estadoCard}>
                    <label className={styles.estadoLabel}>Estado del Pedido</label>
                    <div className={styles.estadoValue}>
                      <select
                        value={selectedPedido.estado || 'pendiente'}
                        onChange={(e) => handleChangeEstado(e.target.value)}
                        className={styles.selectInline}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="en_preparacion">En preparación</option>
                        <option value="en_produccion">En Producción</option>
                        <option value="listo">Listo</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.estadoCard}>
                    <label className={styles.estadoLabel}>Estado de Pago</label>
                    <div className={styles.estadoValue}>
                      <select
                        value={selectedPedido.estadoPago || 'sin_seña'}
                        onChange={(e) => setSelectedPedido({ ...selectedPedido, estadoPago: e.target.value })}
                        className={styles.selectInline}
                      >
                        <option value="sin_seña">Sin seña</option>
                        <option value="seña_pagada">Seña pagada (50%)</option>
                        <option value="pagado_total">Pagado total</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fechas en Grid Limpio */}
                <div className={styles.fechasGrid}>
                  <div className={styles.fechaItem}>
                    <label>Fecha Solicitada</label>
                    <div className={styles.fechaValue}>{formatDate(selectedPedido.fechaSolicitudEntrega)}</div>
                  </div>
                  <div className={styles.fechaItem}>
                    <label>Fecha de entrega confirmada</label>
                    <div className={styles.fechaValue}>
                      <input
                        type="date"
                        value={selectedPedido.fechaConfirmadaEntrega || ''}
                        onChange={handleChangeFechaConfirmada}
                        className={styles.dateInput}
                      />
                    </div>
                  </div>
                  <div className={styles.fechaItem}>
                    <label>Fecha Producción</label>
                    <div className={styles.fechaValue}>
                      <input
                        type="date"
                        value={selectedPedido.fechaProduccion || ''}
                        onChange={handleChangeFechaProduccion}
                        className={styles.dateInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Botón Calendario */}
                {selectedPedido.estado === 'confirmado' && !selectedPedido.asignadoAlCalendario && (
                  <button onClick={handleAsignarCalendario} className={styles.btnCalendarNew}>
                    📅 Asignar al Calendario
                  </button>
                )}
                
                {selectedPedido.asignadoAlCalendario && (
                  <div className={styles.alertSuccessNew}>
                    ✓ Asignado al calendario
                  </div>
                )}

                {/* Productos - Lista Minimalista */}
                <div className={styles.productosSection}>
                  <div className={styles.sectionTitle}>Productos</div>
                  <div className={styles.productosListNew}>
                    {selectedPedido.productos.map((prod, idx) => {
                      const productData = getProductData(prod)
                      const materialInfo = productData.material ? getMaterialInfo(productData.material) : null
                      return (
                        <div key={idx} className={styles.productoItemNew}>
                          <div className={styles.productoLeft}>
                            <div className={styles.productoNombreNew}>{prod.nombre}</div>
                            <div className={styles.productoMetaNew}>
                              {prod.medidas && <span>{prod.medidas}</span>}
                              <span>×{prod.cantidad}</span>
                              {productData.tiempoUnitario && (
                                <span className={styles.tiempoTag}>⏱ {productData.tiempoUnitario}</span>
                              )}
                              {productData.precioPorMinuto > 0 && (
                                <span className={styles.precioMinTag}>{formatCurrency(productData.precioPorMinuto)}/min</span>
                              )}
                            </div>
                            {materialInfo && (
                              <div className={styles.productoMaterial}>
                                Material: {materialInfo.nombre} ({materialInfo.espesor || 'N/A'}mm)
                              </div>
                            )}
                          </div>
                          <div className={styles.productoRight}>
                            <div className={styles.precioUnit}>{formatCurrency(prod.precioUnitario)}</div>
                            <div className={styles.subtotalProd}>{formatCurrency(prod.subtotal)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Resumen Financiero Elegante */}
                <div className={styles.financieroSection}>
                  <div className={styles.financieroGrid}>
                    <div className={styles.finItem}>
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedPedido.subtotal)}</span>
                    </div>
                    {selectedPedido.descuento > 0 && (
                      <div className={`${styles.finItem} ${styles.descuento}`}>
                        <span>Descuento</span>
                        <span>-{formatCurrency(selectedPedido.descuento)}</span>
                      </div>
                    )}
                    <div className={`${styles.finItem} ${styles.total}`}>
                      <span>Total</span>
                      <span>{formatCurrency(selectedPedido.total)}</span>
                    </div>
                  </div>

                  {(selectedPedido.estadoPago === 'seña_pagada' || selectedPedido.estadoPago === 'pagado_total') && (
                    <div className={styles.pagosGrid}>
                      <div className={styles.pagoItem}>
                        <label>Monto Recibido</label>
                        <div className={styles.montoInputWrapper}>
                          <span className={styles.currencyPrefix}>$</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            step="1"
                            min="0"
                            value={Number(selectedPedido.montoRecibido || 0)}
                            onChange={(e) => setSelectedPedido({ ...selectedPedido, montoRecibido: Number(e.target.value) })}
                            className={styles.montoInput}
                          />
                        </div>
                      </div>
                      <div className={styles.pagoItem}>
                        <label>Restante</label>
                        <div className={styles.restanteValue}>
                          {formatCurrency((selectedPedido.total || 0) - (selectedPedido.montoRecibido || (selectedPedido.estadoPago === 'seña_pagada' ? (selectedPedido.total * 0.5) : selectedPedido.total)))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comprobante Minimalista */}
                {selectedPedido.comprobante && (
                  <div className={styles.comprobanteSection}>
                    <div className={styles.sectionTitle}>Comprobante de Pago</div>
                    <div className={styles.comprobanteWrapper}>
                      <img src={selectedPedido.comprobante} alt="Comprobante" className={styles.comprobanteImgNew} />
                      <button onClick={() => downloadComprobante(selectedPedido)} className={styles.btnDownloadNew}>
                        ⬇ Descargar
                      </button>
                    </div>
                  </div>
                )}

                {selectedPedido.cliente.direccion && selectedPedido.cliente.direccion !== 'No proporcionada' && (
                  <div className={styles.direccionSection}>
                    <label>Dirección de Entrega</label>
                    <p>{selectedPedido.cliente.direccion}</p>
                  </div>
                )}
              </div>

              {/* Footer con acciones de edición */}
              <div className={styles.modalFooterNew}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.btnDanger} onClick={handleDelete}>Eliminar</button>
                  <button className={styles.btnSecondary} onClick={handleCloseModal}>Cerrar</button>
                </div>
                <div>
                  <button className={styles.btnSave} onClick={handleSaveChanges}>Guardar cambios</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Modal Asignar Pedido */}
        {showAssignModal && selectedPedido && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '940px' }}>
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
                      minDateOverride={(() => {
                        // Fijar mínimo al mayor entre hoy y la fecha de producción (si existe)
                        const hoy = new Date()
                        hoy.setHours(0,0,0,0)
                        if (selectedPedido.fechaProduccion) {
                          const fp = new Date(selectedPedido.fechaProduccion + 'T00:00:00')
                          return fp > hoy ? fp : hoy
                        }
                        return hoy
                      })()}
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
                        <div style={{ marginTop: '8px' }}>
                          Fecha seleccionada: {selectedAssignDate || '—'}
                          {selectedAssignDate && (
                            <div style={{ marginTop: '6px', color: '#059669', fontWeight: 600 }}>
                              ✅ Ese día se entrega
                            </div>
                          )}
                        </div>
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

        {/* Modal de Confirmación de Cambios Guardados */}
        <ConfirmModal
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          message="Cambios guardados correctamente"
          type="success"
        />

        {/* Modal de Validación de Fechas */}
        {showValidationModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '500px', textAlign: 'center' }}>
              <div className={styles.modalHeader}>
                <h2 style={{ color: 'var(--color-danger)', margin: 0 }}>⚠️ Error de Validación</h2>
              </div>
              <div className={styles.modalBody}>
                <div style={{ padding: '20px 0' }}>
                  <div style={{ fontSize: '16px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                    {validationMessage}
                  </div>
                  <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Por favor, ajusta las fechas para mantener la lógica temporal correcta del proceso de producción.
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button 
                  className={styles.btnSave} 
                  onClick={closeValidationModal}
                  style={{ 
                    background: 'var(--accent-blue)', 
                    color: 'white',
                    fontWeight: '600',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <span>✓</span>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
