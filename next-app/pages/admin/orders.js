import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import PedidoCard from '../../components/PedidoCard'
import ConfirmModal from '../../components/ConfirmModal'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/pedidos-catalogo.module.css'
import { formatCurrency, createToast } from '../../utils/catalogUtils'
import { getAllPedidosCatalogo, getPedidoCatalogoById, updateMontoRecibido } from '../../utils/supabasePedidos'
import { getAllProductos, mapProductoToFrontend } from '../../utils/supabaseProductos'
import { createMovimiento } from '../../utils/supabaseFinanzas'
import dynamic from 'next/dynamic'

// Componente sin SSR para evitar hydration mismatches
const Orders = dynamic(() => Promise.resolve(PedidosCatalogo), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div>Cargando pedidos...</div>
    </div>
  )
});

// Parsea el string con separadores y devuelve número entero
const parseInputNumber = (str) => {
  if (str === null || str === undefined) return 0
  const cleaned = String(str).replace(/[^0-9-]/g, '')
  if (cleaned === '' || cleaned === '-') return 0
  return Number(cleaned)
}

// Formatea número con separadores de miles para input
const formatInputNumber = (num) => {
  if (num === null || num === undefined || num === 0) return ''
  return new Intl.NumberFormat('es-AR').format(num)
}

// Mapea pedido de Supabase (snake_case) a formato frontend (camelCase)
// productosBase se pasa como parámetro para incluir imágenes
const mapSupabasePedidoToFrontend = (pedidoDB, productosBase = []) => {
  if (!pedidoDB) return null
  
  return {
    id: pedidoDB.id,
    cliente: {
      nombre: pedidoDB.cliente_nombre || '',
      apellido: pedidoDB.cliente_apellido || '',
      telefono: pedidoDB.cliente_telefono || '',
      email: pedidoDB.cliente_email || '',
      direccion: pedidoDB.cliente_direccion || ''
    },
    items: (pedidoDB.items || []).map(item => {
      const producto = productosBase.find(p => p.id === item.producto_id)
      return {
        idProducto: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        precioUnitario: item.producto_precio,
        precio: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        subtotal: (Number(item.producto_precio || 0) * Number(item.cantidad || 1)),
        measures: item.medidas,
        medidas: item.medidas,
        imagen: producto?.imagen || null,
        tiempoUnitario: producto?.tiempoUnitario || '00:00:00',
        material: producto?.material || null,
        materialId: producto?.materialId || null,
        espesor: producto?.espesor || null
      }
    }),
    productos: (pedidoDB.items || []).map(item => {
      const producto = productosBase.find(p => p.id === item.producto_id)
      return {
        idProducto: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        precioUnitario: item.producto_precio,
        precio: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        subtotal: (Number(item.producto_precio || 0) * Number(item.cantidad || 1)),
        measures: item.medidas,
        medidas: item.medidas,
        imagen: producto?.imagen || null,
        tiempoUnitario: producto?.tiempoUnitario || '00:00:00',
        material: producto?.material || null,
        materialId: producto?.materialId || null,
        espesor: producto?.espesor || null
      }
    }),
    metodoPago: pedidoDB.metodo_pago,
    estadoPago: pedidoDB.estado_pago || 'sin_seña',
    comprobante: pedidoDB.comprobante_url,
    _comprobanteOmitted: pedidoDB.comprobante_omitido || false,
    fechaCreacion: pedidoDB.fecha_creacion,
    fechaSolicitudEntrega: pedidoDB.fecha_solicitud_entrega,
    fechaConfirmadaEntrega: pedidoDB.fecha_confirmada_entrega,
    fechaProduccion: pedidoDB.fecha_produccion,
    fechaProduccionCalendario: pedidoDB.fecha_produccion_calendario,
    fechaEntrega: pedidoDB.fecha_entrega,
    estado: pedidoDB.estado || 'pendiente',
    total: pedidoDB.total || 0,
    montoRecibido: pedidoDB.monto_recibido || 0,
    asignadoAlCalendario: pedidoDB.asignado_al_calendario || false,
    notas: pedidoDB.notas || '',
    notasAdmin: pedidoDB.notas_admin || ''
  }
}

function PedidosCatalogo() {
  // Estados
  const [pedidosCatalogo, setPedidosCatalogo] = useState([])
  const [productosBase, setProductosBase] = useState([])
  const [materiales, setMateriales] = useState([])
  const [activeSubtab, setActiveSubtab] = useState('pendientes')
  const [selectedPedido, setSelectedPedido] = useState(null)
  const router = useRouter()
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAssignDate, setSelectedAssignDate] = useState(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false)
  const [pendingPaymentData, setPendingPaymentData] = useState(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isDeliveredFiltersOpen, setIsDeliveredFiltersOpen] = useState(false)
  
  // Ref para prevenir re-apertura del modal al cerrar
  const isClosingModalRef = useRef(false)
  
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

  // Cargar datos desde Supabase (y fallback a localStorage)
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      
      // Cargar productos desde Supabase primero, fallback a localStorage
      let productosBase = []
      const { data: productosDB, error: productosError } = await getAllProductos()
      
      if (!productosError && productosDB && productosDB.length > 0) {

        productosBase = productosDB.map(mapProductoToFrontend)
      } else {
        console.log('⚠️ Cargando productos desde localStorage como fallback')
        productosBase = JSON.parse(localStorage.getItem('productosBase') || '[]')
      }
      
      // Cargar pedidos desde Supabase
      const { data: pedidosDB, error } = await getAllPedidosCatalogo()
      
      if (!error && pedidosDB && pedidosDB.length > 0) {

        // Mapear de snake_case a camelCase con productos para imágenes
        const pedidosMapped = pedidosDB.map(pedidoDB => 
          mapSupabasePedidoToFrontend(pedidoDB, productosBase)
        )
        // Normalizar pedidos
        const normalized = pedidosMapped.map(normalizePedido)
        setPedidosCatalogo(normalized)
      } else {
        // Fallback a localStorage
        const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
        const normalized = (pedidos || []).map(normalizePedido)
        setPedidosCatalogo(normalized)

      }
      
      // Guardar productos en estado y cargar materiales (aún desde localStorage)
      setProductosBase(productosBase)
      const mats = JSON.parse(localStorage.getItem('materiales')) || []
      setMateriales(mats)
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error)
      // Fallback final a localStorage
      const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      const productos = JSON.parse(localStorage.getItem('productosBase')) || []
      const mats = JSON.parse(localStorage.getItem('materiales')) || []
      const normalized = (pedidos || []).map(normalizePedido)
      setPedidosCatalogo(normalized)
      setProductosBase(productos)
      setMateriales(mats)
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

    if (newStatus === 'confirmado') {
      const totalPedido = Number(updatedPedido.total || 0)
      const montoActual = Number(updatedPedido.montoRecibido || 0)
      if (totalPedido > 0 && montoActual >= totalPedido) {
        updatedPedido.estadoPago = 'pagado_total'
        updatedPedido.montoRecibido = totalPedido
      } else if (montoActual > 0 && (updatedPedido.estadoPago === 'sin_seña' || !updatedPedido.estadoPago)) {
        updatedPedido.estadoPago = 'seña_pagada'
      } else if (!updatedPedido.estadoPago) {
        updatedPedido.estadoPago = 'sin_seña'
      }
    }

    // Actualizar en el array global y persistir
    const index = pedidosCatalogo.findIndex(p => p.id === updatedPedido.id)
    if (index !== -1) {
      const pedidoAnterior = pedidosCatalogo[index]
      const updatedPedidos = [...pedidosCatalogo]
      updatedPedidos[index] = updatedPedido
      setPedidosCatalogo(updatedPedidos)
      persistAndEmit(updatedPedidos, updatedPedido.id, 'update-status')
      actualizarMovimientosPedido(updatedPedido, pedidoAnterior)
      setSelectedPedido(updatedPedido)
    } else {
      setSelectedPedido(updatedPedido)
    }
  }

  const handleChangeEstadoPago = (newEstadoPago) => {
    if (!selectedPedido) return

    const totalPedido = Number(selectedPedido.total || 0)
    const montoActual = Number(selectedPedido.montoRecibido || 0)
    const updatedPedido = { ...selectedPedido, estadoPago: newEstadoPago }

    if (newEstadoPago === 'sin_seña') {
      updatedPedido.montoRecibido = 0
    } else if (newEstadoPago === 'pagado_total') {
      updatedPedido.montoRecibido = totalPedido
    }
    // seña_pagada: no auto-rellenar, el admin ingresa el monto exacto

    setSelectedPedido(updatedPedido)
  }

  // Crear movimientos financieros automáticamente al cambiar estado de pago
  const actualizarMovimientosPedido = async (pedidoActualizado, pedidoAnterior = null) => {
    try {
      const prevMonto = Number(pedidoAnterior?.montoRecibido || 0)
      const newMonto = Number(pedidoActualizado.montoRecibido || 0)
      const totalPedido = Number(pedidoActualizado.total || 0)

      console.log('💰 actualizarMovimientosPedido:', { prevMonto, newMonto, totalPedido, estadoPago: pedidoActualizado.estadoPago })

      // Si no cambió el monto, no crear movimiento
      if (prevMonto === newMonto) {
        console.log('💰 Monto no cambió, no se registra movimiento')
        return
      }
      // Si el monto bajó, es una corrección, no crear movimiento
      if (newMonto < prevMonto) {
        console.log('💰 Monto bajó, no se registra movimiento')
        return
      }
      // Si el nuevo monto es 0, nada que registrar
      if (newMonto <= 0) {
        console.log('💰 Monto es 0, no se registra movimiento')
        return
      }

      const clienteNombre = `${pedidoActualizado.cliente?.nombre || ''} ${pedidoActualizado.cliente?.apellido || ''}`.trim()
      const hoy = new Date().toISOString().split('T')[0]
      const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
      const metodo = pedidoActualizado.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo'

      // Primera vez que se registra un monto (prevMonto era 0)
      if (prevMonto === 0 && newMonto > 0) {
        const esPagoTotal = totalPedido > 0 && newMonto >= totalPedido
        console.log('💰 Registrando primer pago:', { esPagoTotal, monto: newMonto })
        const { data, error } = await createMovimiento({
          tipo: 'ingreso',
          monto: newMonto,
          fecha: hoy,
          hora: horaActual,
          categoria: esPagoTotal ? 'Pago Pedido' : 'Seña Pedido',
          descripcion: esPagoTotal
            ? `Pago total - Pedido #${pedidoActualizado.id} - ${clienteNombre}`
            : `Seña recibida - Pedido #${pedidoActualizado.id} - ${clienteNombre}`,
          metodoPago: metodo,
          pedidoCatalogoId: pedidoActualizado.id
        })
        if (error) {
          console.error('💰 Error al crear movimiento:', error)
          createToast('❌ Error al registrar en Finanzas: ' + error, 'error')
        } else {
          console.log('💰 Movimiento creado:', data)
          createToast(esPagoTotal ? '💰 Pago total registrado en Finanzas' : '💰 Seña registrada en Finanzas', 'success')
        }
      }
      // Monto aumentó (ya había un pago previo)
      else if (newMonto > prevMonto) {
        const diferencia = newMonto - prevMonto
        const completaPago = totalPedido > 0 && newMonto >= totalPedido
        console.log('💰 Registrando pago adicional:', { diferencia, completaPago })
        const { data, error } = await createMovimiento({
          tipo: 'ingreso',
          monto: diferencia,
          fecha: hoy,
          hora: horaActual,
          categoria: 'Pago Pedido',
          descripcion: completaPago
            ? `Pago restante - Pedido #${pedidoActualizado.id} - ${clienteNombre}`
            : `Pago adicional - Pedido #${pedidoActualizado.id} - ${clienteNombre}`,
          metodoPago: metodo,
          pedidoCatalogoId: pedidoActualizado.id
        })
        if (error) {
          console.error('💰 Error al crear movimiento:', error)
          createToast('❌ Error al registrar en Finanzas: ' + error, 'error')
        } else {
          console.log('💰 Movimiento creado:', data)
          createToast(completaPago ? '💰 Pago restante registrado en Finanzas' : '💰 Pago adicional registrado en Finanzas', 'success')
        }
      }
    } catch (error) {
      console.error('Error al registrar movimiento financiero:', error)
      createToast('❌ Error al registrar movimiento financiero', 'error')
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
    // Intentar sincronizar cambios al servidor en background
    trySyncPedidoToServer(updatedPedidosArray, pedidoId)
  }

  // Intentar sincronizar cambios puntuales del pedido con el servidor (fire-and-forget)
  function trySyncPedidoToServer(updatedPedidosArray, pedidoId) {
    try {
      const pedido = (updatedPedidosArray || []).find(p => p.id === pedidoId)
      if (!pedido) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('⚠️ No se encontró pedido', pedidoId, 'para sincronizar')
        }
        return
      }

      if (typeof console !== 'undefined' && console.log) {
        console.log('🔄 Intentando sincronizar pedido', pedidoId, 'al servidor...')
      }

      // Fire-and-forget: no bloquea la UI
      ;(async () => {
        try {
          const resp = await fetch(`/api/pedidos/catalogo/${pedidoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
          })
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}))
            if (typeof console !== 'undefined' && console.warn) {
              console.warn('❌ No se pudo sincronizar pedido al servidor:', resp.status, body)
            }
          } else {
            const data = await resp.json()
            if (typeof console !== 'undefined' && console.log) {
              console.log('✅ Pedido sincronizado exitosamente en servidor:', data)
            }
          }
        } catch (e) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('❌ Error sincronizando pedido con servidor (offline?):', e)
          }
        }
      })()
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Error en trySyncPedidoToServer:', e)
      }
    }
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
    const totalPedido = Number(p.total ?? clone.total ?? 0)
    if (clone.estadoPago === 'pagado_total' && totalPedido > 0) {
      clone.montoRecibido = totalPedido
    }
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

  // Filtrar pedidos pendientes con useMemo (optimización)
  const filteredPendientes = useMemo(() => {
    return pedidosCatalogo
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
      // ordenar por fecha de creación descendente (últimos primero)
      .sort((a, b) => {
        const ta = new Date(a.fechaCreacion || 0).getTime()
        const tb = new Date(b.fechaCreacion || 0).getTime()
        return tb - ta
      })
  }, [pedidosCatalogo, filters])

  // Filtrar pedidos entregados con useMemo (optimización)
  const filteredEntregados = useMemo(() => {
    return pedidosCatalogo
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
      // ordenar por fecha de creación descendente (últimos primero)
      .sort((a, b) => {
        const ta = new Date(a.fechaCreacion || 0).getTime()
        const tb = new Date(b.fechaCreacion || 0).getTime()
        return tb - ta
      })
  }, [pedidosCatalogo, deliveredFilters])

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
          handleCloseModal()
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
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }, [])

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Sin fecha'
    if (typeof window === 'undefined') return dateString
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }, [])

  const getStatusEmoji = useCallback((status) => {
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
  }, [])

  const getStatusLabel = useCallback((status) => {
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
  }, [])

  const getPaymentLabel = useCallback((status, pedido = null) => {
    if (status === 'seña_pagada') {
      const total = Number(pedido?.total || 0)
      const recibido = Number(pedido?.montoRecibido || 0)
      if (total > 0 && recibido > 0) {
        const pct = Math.round((recibido / total) * 100)
        return `Seña pagada (${pct}%)`
      }
      return 'Seña pagada (50%)'
    }

    const labels = {
      'sin_seña': 'Sin seña',
      'pagado_total': 'Pagado total'
    }
    return labels[status] || status
  }, [])

  const formatFechaEntrega = useCallback((pedido) => {
    if (pedido.fechaConfirmadaEntrega) {
      if (typeof window === 'undefined') return pedido.fechaConfirmadaEntrega
      const { parseDateYMD } = require('../../utils/catalogUtils')
      const fecha = parseDateYMD(pedido.fechaConfirmadaEntrega) || new Date(pedido.fechaConfirmadaEntrega + 'T00:00:00')
      return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
    return 'Sin confirmar'
  }, [])

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

  const formatFechaProduccion = useCallback((pedido) => {
    if (pedido.fechaProduccion) {
      if (typeof window === 'undefined') return pedido.fechaProduccion
      const { parseDateYMD } = require('../../utils/catalogUtils')
      const fecha = parseDateYMD(pedido.fechaProduccion) || new Date(pedido.fechaProduccion + 'T00:00:00')
      return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
    return 'Sin asignar'
  }, [])

  const getProductThumbnail = useCallback((pedido) => {
    if (!pedido.productos || pedido.productos.length === 0) return null
    
    const firstProduct = pedido.productos[0]
    const productBase = productosBase.find(p => p.id === firstProduct.productId || p.id === firstProduct.idProducto)
    
    return productBase?.imagen || null
  }, [productosBase])

  const handleCardClick = useCallback((pedido) => {
    // Abrir modal y actualizar la URL para que incluya el ID del pedido
    try {
      const asPath = `/admin/orders/detalle-pedido/${pedido.id}`
      router.push({ pathname: router.pathname, query: { ...router.query, modal: 'detalle', id: pedido.id } }, asPath, { shallow: true })
    } catch (e) {
      // Si router falla, abrir modal sin cambiar URL
    }
    setSelectedPedido(pedido)
    setShowDetailModal(true)
  }, [router])

  const handleCloseModal = () => {
    isClosingModalRef.current = true
    setShowDetailModal(false)
    setSelectedPedido(null)
    // Usar setTimeout para asegurar que el estado se actualice antes de cambiar la URL
    setTimeout(() => {
      try {
        // Restaurar URL sin modal e id, pero manteniendo el tab actual
        const newQuery = { ...router.query }
        delete newQuery.modal
        delete newQuery.id
        const queryString = Object.keys(newQuery).length > 0 ? '?' + new URLSearchParams(newQuery).toString() : ''
        router.replace({ pathname: router.pathname, query: newQuery }, `/admin/orders${queryString}`, { shallow: true })
      } catch (e) {}
      // Resetear la bandera después de un breve delay
      setTimeout(() => {
        isClosingModalRef.current = false
      }, 100)
    }, 0)
  }

  const handleTabChange = (tabName) => {
    setActiveSubtab(tabName)
    // Actualizar la URL con el parámetro tab
    try {
      const newQuery = { ...router.query }
      newQuery.tab = tabName
      router.replace({ pathname: router.pathname, query: newQuery }, `/admin/orders?tab=${tabName}`, { shallow: true })
    } catch (e) {
      console.warn('Error updating URL for tab change:', e)
    }
  }

  const handleSaveChanges = () => {
    if (!selectedPedido) return

    const index = pedidosCatalogo.findIndex(p => p.id === selectedPedido.id)
    if (index === -1) return

    const pedidoAnterior = pedidosCatalogo[index]
    const pedidoActualizado = { ...selectedPedido }
    const totalPedido = Number(pedidoActualizado.total || 0)
    let nuevoMontoRecibido = Number(pedidoActualizado.montoRecibido || 0)

    // Auto-detectar estadoPago basado en el monto ingresado
    if (totalPedido > 0 && nuevoMontoRecibido >= totalPedido) {
      pedidoActualizado.estadoPago = 'pagado_total'
      pedidoActualizado.montoRecibido = totalPedido
      nuevoMontoRecibido = totalPedido
    } else if (nuevoMontoRecibido > 0) {
      pedidoActualizado.estadoPago = 'seña_pagada'
    } else {
      pedidoActualizado.estadoPago = 'sin_seña'
      pedidoActualizado.montoRecibido = 0
      nuevoMontoRecibido = 0
    }

    const restante = Math.max(0, totalPedido - nuevoMontoRecibido)
    const hayPagoCambio = nuevoMontoRecibido !== Number(pedidoAnterior.montoRecibido || 0)

    // Si hay cambio en el monto, mostrar confirmación; si no, guardar directamente
    if (hayPagoCambio && nuevoMontoRecibido > 0) {
      setPendingPaymentData({
        pedidoActualizado,
        pedidoAnterior,
        totalPedido,
        montoRecibido: nuevoMontoRecibido,
        restante
      })
      setShowPaymentConfirmModal(true)
    } else {
      doSaveChanges(pedidoActualizado, pedidoAnterior)
    }
  }

  const confirmPaymentAndSave = () => {
    if (!pendingPaymentData) return
    const { pedidoActualizado, pedidoAnterior } = pendingPaymentData
    setShowPaymentConfirmModal(false)
    setPendingPaymentData(null)
    doSaveChanges(pedidoActualizado, pedidoAnterior)
  }

  const doSaveChanges = async (pedidoActualizado, pedidoAnterior) => {
    const updatedPedidos = [...pedidosCatalogo]
    const index = updatedPedidos.findIndex(p => p.id === pedidoActualizado.id)
    if (index !== -1) updatedPedidos[index] = pedidoActualizado

    setPedidosCatalogo(updatedPedidos)
    persistAndEmit(updatedPedidos, pedidoActualizado.id, 'save-changes')
    await actualizarMovimientosPedido(pedidoActualizado, pedidoAnterior)
    handleCloseModal()
  }

  // Si la URL contiene ?modal=detalle&id=..., abrir el modal al cargar la página
  // También manejar ?tab=pendientes|entregados para las subtabs
  useEffect(() => {
    if (!router || !router.isReady) return
    if (isClosingModalRef.current) return // No reabrir si estamos cerrando
    
    const { modal, id, tab } = router.query || {}
    
    // Manejar el parámetro tab para subtabs
    if (tab === 'entregados') {
      setActiveSubtab('entregados')
    } else if (tab === 'pendientes') {
      setActiveSubtab('pendientes')
    } else {
      // Si no hay tab especificado, redirigir a pendientes
      setActiveSubtab('pendientes')
      router.replace({ pathname: router.pathname, query: { tab: 'pendientes' } }, '/admin/orders?tab=pendientes', { shallow: true })
    }
    
    // Solo abrir modal si hay parámetros y el modal NO está ya abierto
    if (modal === 'detalle' && id && !showDetailModal) {
      // Intentar encontrar el pedido en la lista cargada
      const found = (pedidosCatalogo || []).find(p => String(p.id) === String(id))
      if (found) {
        setSelectedPedido(found)
        setShowDetailModal(true)
      } else {
        // Si no está en memoria, pedirlo al servidor
        (async () => {
          try {
            const { data, error } = await getPedidoCatalogoById(id)
            if (!error && data) {
              // mapear desde supabase si hace falta (la función mapSupabasePedidoToFrontend existe arriba)
              const pedidoFront = mapSupabasePedidoToFrontend(data, productosBase || [])
              const normalized = normalizePedido(pedidoFront)
              setSelectedPedido(normalized)
              setShowDetailModal(true)
            }
          } catch (e) {}
        })()
      }
    }
  }, [router?.isReady, router?.query, pedidosCatalogo, showDetailModal])

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

  const handleDelete = async () => {
    if (!selectedPedido) return

    if (!confirm(`¿Estás seguro de eliminar este pedido?`)) {
      return
    }

    const pedidoId = selectedPedido.id

    try {
      // Intentar eliminar en el servidor (Supabase) mediante API
      const resp = await fetch(`/api/pedidos/catalogo/${pedidoId}`, { method: 'DELETE' })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || 'Error eliminando en servidor')
      }

      // Si todo bien en servidor, actualizar estado local
      const updatedPedidos = pedidosCatalogo.filter(p => p.id !== pedidoId)
      setPedidosCatalogo(updatedPedidos)
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidos))

      try { window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'delete', orderId: pedidoId } })) } catch (e) {}

      createToast && createToast('Pedido eliminado correctamente', 'success')
      handleCloseModal()
    } catch (e) {
      console.error('Error al eliminar pedido en servidor, aplicando fallback local:', e)
      // Fallback: eliminar localmente para no mostrar el pedido hasta que se pueda sincronizar
      const updatedPedidos = pedidosCatalogo.filter(p => p.id !== pedidoId)
      setPedidosCatalogo(updatedPedidos)
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedPedidos))
      try { window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'delete_offline', orderId: pedidoId } })) } catch (e) {}
      createToast && createToast('No se pudo eliminar en servidor. Eliminado localmente (sincroniza luego).', 'warning')
      handleCloseModal()
    }
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
    
    let mensaje = `Hola ${cliente.nombre}! Te contacto sobre tu pedido:\n\n`
    
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
    const subject = `Pedido - Sistema KOND`
    
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
        materialId: productoBase.materialId || null,
        espesor: productoBase.espesor || null
      }
    }

    // Valores por defecto
    return {
      tiempoUnitario: '00:00:00',
      precioPorMinuto: 0,
      material: null,
      materialId: null,
      espesor: null
    }
  }

  // Función para obtener información completa del material
  const getMaterialInfo = (materialName, materialId) => {
    if (!materiales || materiales.length === 0) return null
    
    // Primero intentar por materialId
    if (materialId) {
      const material = materiales.find(m => String(m.id) === String(materialId))
      if (material) return material
    }
    
    // Si no hay materialId, intentar por nombre (para compatibilidad con productos antiguos)
    if (materialName) {
      const material = materiales.find(m => m.nombre === materialName)
      if (material) return material
    }
    
    return null
  }

  return (
    <Layout title="Pedidos Catálogo - Sistema KOND">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>🛒 Pedidos Catálogo</h1>
          <p className={styles.subtitle}>Gestión de pedidos del catálogo público</p>
        </div>

        {/* Sub-pestañas */}
        <div className={styles.subtabs}>
          <button
            onClick={() => handleTabChange('pendientes')}
            className={`${styles.subtab} ${activeSubtab === 'pendientes' ? styles.active : ''}`}
          >
            <span>⏳</span>
            <span>Pedidos Pendientes</span>
            <span className={styles.badge}>{filteredPendientes.length}</span>
          </button>
          
          <button
            onClick={() => handleTabChange('entregados')}
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
            {/* Filtros colapsables */}
            <div className={styles.filtersSection}>
              <button 
                className={styles.filtersToggle}
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                aria-expanded={isFiltersOpen}
              >
                <span className={styles.filtersTitle}>🔍 Búsqueda y Filtros</span>
                <span className={styles.filtersToggleIcon}>{isFiltersOpen ? '▼' : '▶'}</span>
              </button>
              
              <div className={`${styles.filtersContent} ${isFiltersOpen ? styles.filtersContentOpen : ''}`}>
                <div className={styles.filters}>
                  <input
                    type="text"
                    placeholder="🔍 Buscar por ID, cliente o teléfono..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className={styles.searchInput}
                  />
                  
                  <select
                    value={filters.estado}
                    onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, estadoPago: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="all">Todos los pagos</option>
                    <option value="sin_seña">Sin Seña</option>
                    <option value="seña_pagada">Seña Pagada</option>
                    <option value="pagado_total">Pagado Total</option>
                  </select>

                  <select
                    value={filters.metodoPago}
                    onChange={(e) => setFilters(prev => ({ ...prev, metodoPago: e.target.value }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className={styles.dateInput}
                  />

                  <input
                    type="date"
                    placeholder="Fecha hasta"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className={styles.dateInput}
                  />
                </div>
              </div>
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
                      createToast={createToast}
                      productosBase={productosBase}
                      materiales={materiales}
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
            {/* Filtros colapsables */}
            <div className={styles.filtersSection}>
              <button 
                className={styles.filtersToggle}
                onClick={() => setIsDeliveredFiltersOpen(!isDeliveredFiltersOpen)}
                aria-expanded={isDeliveredFiltersOpen}
              >
                <span className={styles.filtersTitle}>🔍 Búsqueda y Filtros</span>
                <span className={styles.filtersToggleIcon}>{isDeliveredFiltersOpen ? '▼' : '▶'}</span>
              </button>
              
              <div className={`${styles.filtersContent} ${isDeliveredFiltersOpen ? styles.filtersContentOpen : ''}`}>
                <div className={styles.filters}>
                  <input
                    type="text"
                    placeholder="🔍 Buscar por ID, cliente o teléfono..."
                    value={deliveredFilters.search}
                    onChange={(e) => setDeliveredFilters(prev => ({ ...prev, search: e.target.value }))}
                    className={styles.searchInput}
                  />
                  
                  <select
                    value={deliveredFilters.estadoPago}
                    onChange={(e) => setDeliveredFilters(prev => ({ ...prev, estadoPago: e.target.value }))}
                    className={styles.select}
                  >
                    <option value="all">Todos los pagos</option>
                    <option value="sin_seña">Sin Seña</option>
                    <option value="seña_pagada">Seña Pagada</option>
                    <option value="pagado_total">Pagado Total</option>
                  </select>

                  <select
                    value={deliveredFilters.metodoPago}
                    onChange={(e) => setDeliveredFilters(prev => ({ ...prev, metodoPago: e.target.value }))}
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
                    onChange={(e) => setDeliveredFilters(prev => ({ ...prev, fecha: e.target.value }))}
                    className={styles.dateInput}
                    placeholder="Fecha específica"
                  />

                  <input
                    type="date"
                    placeholder="Fecha desde"
                    value={deliveredFilters.dateFrom}
                    onChange={(e) => setDeliveredFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className={styles.dateInput}
                  />

                  <input
                    type="date"
                    placeholder="Fecha hasta"
                    value={deliveredFilters.dateTo}
                    onChange={(e) => setDeliveredFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className={styles.dateInput}
                  />
                </div>
              </div>
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
                  {currentEntregados.map(pedido => (
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
                      createToast={createToast}
                      productosBase={productosBase}
                      materiales={materiales}
                    />
                  ))}
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

        {/* Modal de Detalle - Diseño Pro */}
        {showDetailModal && selectedPedido && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.modalContentNew} onClick={(e) => e.stopPropagation()}>
              {/* Header con info del pedido */}
              <div className={styles.modalHeaderNew}>
                <div className={styles.headerTop}>
                  <div className={styles.headerIdBadge}>
                    <span className={styles.pedidoIdTag}>#{selectedPedido.id}</span>
                    <span className={styles.metodoPagoBadge}>
                      {selectedPedido.metodoPago === 'transferencia' ? '🏦 Transferencia' : selectedPedido.metodoPago === 'envio' ? '🚚 Envío' : selectedPedido.metodoPago === 'whatsapp' ? '💬 WhatsApp' : '🏪 Retiro'}
                    </span>
                  </div>
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
                {/* Estados con iconos visuales */}
                <div className={styles.estadosGrid}>
                  <div className={styles.estadoCard}>
                    <div className={styles.estadoCardHeader}>
                      <span className={styles.estadoIcon}>📋</span>
                      <label className={styles.estadoLabel}>Estado del Pedido</label>
                    </div>
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

                  <div className={styles.estadoCard}>
                    <div className={styles.estadoCardHeader}>
                      <span className={styles.estadoIcon}>💳</span>
                      <label className={styles.estadoLabel}>Estado de Pago</label>
                    </div>
                    <select
                      value={selectedPedido.estadoPago || 'sin_seña'}
                      onChange={(e) => handleChangeEstadoPago(e.target.value)}
                      className={styles.selectInline}
                    >
                      <option value="sin_seña">Sin seña</option>
                      <option value="seña_pagada">Seña pagada</option>
                      <option value="pagado_total">Pagado total</option>
                    </select>
                  </div>
                </div>

                {/* Fechas con iconos */}
                <div className={styles.fechasSection}>
                  <div className={styles.sectionTitleRow}>
                    <span className={styles.sectionIcon}>📅</span>
                    <span className={styles.sectionTitle}>Fechas</span>
                  </div>
                  <div className={styles.fechasGrid}>
                    <div className={styles.fechaItem}>
                      <label>Solicitada</label>
                      <div className={styles.fechaValue}>{formatDate(selectedPedido.fechaSolicitudEntrega)}</div>
                    </div>
                    <div className={styles.fechaItem}>
                      <label>Producción</label>
                      <div className={styles.fechaValue}>
                        <input
                          type="date"
                          value={selectedPedido.fechaProduccion || ''}
                          onChange={handleChangeFechaProduccion}
                          className={styles.dateInput}
                        />
                      </div>
                    </div>
                    <div className={styles.fechaItem}>
                      <label>Entrega confirmada</label>
                      <div className={styles.fechaValue}>
                        <input
                          type="date"
                          value={selectedPedido.fechaConfirmadaEntrega || ''}
                          onChange={handleChangeFechaConfirmada}
                          className={styles.dateInput}
                        />
                      </div>
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

                {/* Productos */}
                <div className={styles.productosSection}>
                  <div className={styles.sectionTitleRow}>
                    <span className={styles.sectionIcon}>📦</span>
                    <span className={styles.sectionTitle}>Productos ({selectedPedido.productos.length})</span>
                  </div>
                  <div className={styles.productosListNew}>
                    {selectedPedido.productos.map((prod, idx) => {
                      const productData = getProductData(prod)
                      const materialInfo = productData.material ? getMaterialInfo(productData.material, productData.materialId) : null
                      return (
                        <div key={idx} className={styles.productoItemNew}>
                          <div className={styles.productoLeft}>
                            <div className={styles.productoNombreNew}>{prod.nombre}</div>
                            <div className={styles.productoMetaNew}>
                              {prod.medidas && <span className={styles.metaTag}>{prod.medidas}</span>}
                              <span className={styles.metaTag}>×{prod.cantidad}</span>
                              {productData.tiempoUnitario && (
                                <span className={styles.tiempoTag}>⏱ {productData.tiempoUnitario}</span>
                              )}
                              {productData.precioPorMinuto > 0 && (
                                <span className={styles.precioMinTag}>{formatCurrency(productData.precioPorMinuto)}/min</span>
                              )}
                            </div>
                            {materialInfo && (
                              <div className={styles.productoMaterial}>
                                Material: {materialInfo.nombre} • {materialInfo.tipo} • {materialInfo.espesor || 'N/A'}mm
                              </div>
                            )}
                          </div>
                          <div className={styles.productoRight}>
                            <div className={styles.precioUnit}>{formatCurrency(prod.precioUnitario)} c/u</div>
                            <div className={styles.subtotalProd}>{formatCurrency(prod.subtotal)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Resumen Financiero con barra de progreso */}
                {(() => {
                  const savedPedido = pedidosCatalogo.find(p => p.id === selectedPedido.id)
                  const savedMonto = Number(savedPedido?.montoRecibido || 0)
                  const total = Number(selectedPedido.total || 0)
                  const restante = Math.max(0, total - savedMonto)
                  const pagadoCompleto = savedMonto > 0 && savedMonto >= total
                  const porcentajePago = total > 0 ? Math.min(100, Math.round((savedMonto / total) * 100)) : 0
                  return (
                    <div className={styles.financieroSection}>
                      <div className={styles.sectionTitleRow}>
                        <span className={styles.sectionIcon}>💰</span>
                        <span className={styles.sectionTitle}>Resumen Financiero</span>
                      </div>
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
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>

                      {/* Barra de progreso de pago */}
                      {total > 0 && (
                        <div className={styles.pagoProgressSection}>
                          <div className={styles.pagoProgressHeader}>
                            <span className={styles.pagoProgressLabel}>
                              {pagadoCompleto ? '✓ Pagado completo' : savedMonto > 0 ? 'Pago parcial' : 'Sin pagos'}
                            </span>
                            <span className={styles.pagoProgressPercent}>{porcentajePago}%</span>
                          </div>
                          <div className={styles.pagoProgressBar}>
                            <div
                              className={`${styles.pagoProgressFill} ${pagadoCompleto ? styles.pagoComplete : savedMonto > 0 ? styles.pagoPartial : ''}`}
                              style={{ width: `${porcentajePago}%` }}
                            />
                          </div>
                          <div className={styles.pagoProgressDetails}>
                            {savedMonto > 0 && (
                              <span className={styles.pagoRecibido}>Recibido: {formatCurrency(savedMonto)}</span>
                            )}
                            {!pagadoCompleto && savedMonto > 0 && (
                              <span className={styles.pagoRestante}>Restante: {formatCurrency(restante)}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Input para registrar / actualizar monto recibido */}
                      <div className={styles.montoInputSection}>
                        <label className={styles.montoInputLabel}>
                          {savedMonto > 0 ? 'Actualizar monto recibido' : 'Registrar seña / monto recibido'}
                        </label>
                        <div className={styles.montoInputWrapper}>
                          <span className={styles.currencyPrefix}>$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={formatInputNumber(selectedPedido.montoRecibido)}
                            onChange={(e) => {
                              const raw = e.target.value
                              const numeric = parseInputNumber(raw)
                              setSelectedPedido({ ...selectedPedido, montoRecibido: numeric })
                            }}
                            className={styles.montoInput}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Comprobante */}
                {selectedPedido.comprobante && (
                  <div className={styles.comprobanteSection}>
                    <div className={styles.sectionTitleRow}>
                      <span className={styles.sectionIcon}>🧾</span>
                      <span className={styles.sectionTitle}>Comprobante de Pago</span>
                    </div>
                    <div className={styles.comprobanteWrapper}>
                      <img src={selectedPedido.comprobante} alt="Comprobante" className={styles.comprobanteImgNew} />
                      <button onClick={() => downloadComprobante(selectedPedido)} className={styles.btnDownloadNew}>
                        ⬇ Descargar comprobante
                      </button>
                    </div>
                  </div>
                )}

                {/* Dirección de Entrega */}
                {selectedPedido.metodoPago === 'envio' && selectedPedido.cliente?.direccion && selectedPedido.cliente.direccion !== 'No proporcionada' && (
                  <div className={styles.direccionSection}>
                    <div className={styles.sectionTitleRow}>
                      <span className={styles.sectionIcon}>📍</span>
                      <label>Dirección de Entrega</label>
                    </div>
                    <p>{selectedPedido.cliente.direccion}</p>
                  </div>
                )}
              </div>

              {/* Footer con acciones */}
              <div className={styles.modalFooterNew}>
                <button className={styles.btnDanger} onClick={handleDelete}>
                  🗑 Eliminar
                </button>
                <div className={styles.footerActions}>
                  <button className={styles.btnSecondary} onClick={handleCloseModal}>Cerrar</button>
                  <button className={styles.btnSave} onClick={handleSaveChanges}>💾 Guardar cambios</button>
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
                <h2>Asignar Pedido</h2>
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

        {/* Modal de Confirmación de Pago/Seña */}
        {showPaymentConfirmModal && pendingPaymentData && (
          <div className={styles.modalOverlay} onClick={() => setShowPaymentConfirmModal(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '28px',
                maxWidth: '380px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Confirmar registro de pago</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Pedido #{pendingPaymentData.pedidoActualizado.id} &bull; {pendingPaymentData.pedidoActualizado.cliente?.nombre} {pendingPaymentData.pedidoActualizado.cliente?.apellido || ''}
                </span>
              </div>

              <div style={{
                background: 'var(--bg-section)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.88rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <span>Total del pedido</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(pendingPaymentData.totalPedido)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(16,185,129,0.06)' }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>
                    {pendingPaymentData.restante === 0 ? '✓ Pago completo' : 'Seña recibida'}
                  </span>
                  <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.05rem' }}>{formatCurrency(pendingPaymentData.montoRecibido)}</span>
                </div>
                {pendingPaymentData.restante > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    <span>Restante</span>
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(pendingPaymentData.restante)}</span>
                  </div>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Se registrará un movimiento de ingreso en Finanzas.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowPaymentConfirmModal(false); setPendingPaymentData(null) }}
                  className={styles.btnSecondary}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPaymentAndSave}
                  className={styles.btnSave}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

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

export default withAdminAuth(PedidosCatalogo)
