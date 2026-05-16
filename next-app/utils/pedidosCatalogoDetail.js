import { createMovimiento } from './supabaseFinanzas'

export const parseInputNumber = (str) => {
  if (str === null || str === undefined) return 0
  const cleaned = String(str).replace(/[^0-9-]/g, '')
  if (cleaned === '' || cleaned === '-') return 0
  return Number(cleaned)
}

export const formatInputNumber = (num) => {
  if (num === null || num === undefined || num === 0) return ''
  return new Intl.NumberFormat('es-AR').format(num)
}

export const normalizeEstadoPago = (val) => {
  if (!val && val !== 0) return 'sin_seña'
  const s = String(val || '').trim()
  if (s === 'pagado' || s === 'pagado_total') return 'pagado_total'
  if (s === 'seña_pagada' || s === 'sena_pagada' || s === 'seña') return 'seña_pagada'
  if (s === 'sin_seña' || s === '') return 'sin_seña'
  return s
}

export const mapSupabasePedidoToFrontend = (pedidoDB, productosBase = []) => {
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
        productId: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        precioUnitario: item.producto_precio,
        precio: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        subtotal: Number(item.producto_precio || 0) * Number(item.cantidad || 1),
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
        productId: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        precioUnitario: item.producto_precio,
        precio: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        subtotal: Number(item.producto_precio || 0) * Number(item.cantidad || 1),
        measures: item.medidas,
        medidas: item.medidas,
        imagen: producto?.imagen || null,
        tiempoUnitario: producto?.tiempoUnitario || '00:00:00',
        material: producto?.material || null,
        materialId: producto?.materialId || null,
        espesor: producto?.espesor || null
      }
    }),
    subtotal: pedidoDB.subtotal || (pedidoDB.items || []).reduce((sum, item) => sum + (Number(item.producto_precio || 0) * Number(item.cantidad || 1)), 0),
    descuento: pedidoDB.descuento || 0,
    metodoPago: pedidoDB.metodo_pago,
    estadoPago: pedidoDB.estado_pago || 'sin_seña',
    mpPreferenceId: pedidoDB.mp_preference_id || null,
    mpPaymentId: pedidoDB.mp_payment_id || null,
    mpPaymentStatus: pedidoDB.mp_payment_status || null,
    comprobante: pedidoDB.comprobante_url,
    _comprobanteOmitted: pedidoDB.comprobante_omitido || false,
    fechaCreacion: pedidoDB.fecha_creacion,
    fechaSolicitudEntrega: pedidoDB.fecha_solicitud_entrega,
    fechaConfirmadaEntrega: pedidoDB.fecha_confirmada_entrega,
    fechaProduccion: pedidoDB.fecha_produccion,
    fechaProduccionCalendario: pedidoDB.fecha_produccion_calendario,
    fechaEntregaCalendario: pedidoDB.fecha_entrega_calendario,
    fechaEntrega: pedidoDB.fecha_entrega,
    estado: pedidoDB.estado || 'pendiente',
    total: pedidoDB.total || 0,
    montoRecibido: pedidoDB.monto_recibido || 0,
    asignadoAlCalendario: pedidoDB.asignado_al_calendario || false,
    notas: pedidoDB.notas || '',
    notasAdmin: pedidoDB.notas_admin || ''
  }
}

export const normalizePedido = (p) => {
  if (!p) return p
  const clone = { ...p }
  const monto = Number(p.montoRecibido ?? p.senaMonto ?? p['señaMonto'] ?? 0)
  clone.montoRecibido = Number.isNaN(monto) ? 0 : monto
  clone.estadoPago = normalizeEstadoPago(p.estadoPago)
  const totalPedido = Number(p.total ?? clone.total ?? 0)
  if (clone.estadoPago === 'pagado_total' && totalPedido > 0) {
    clone.montoRecibido = totalPedido
  }
  if (!clone.cliente) clone.cliente = { nombre: '', apellido: '' }
  else {
    clone.cliente.nombre = clone.cliente.nombre || ''
    clone.cliente.apellido = clone.cliente.apellido || ''
  }
  if (p.items && !p.productos) clone.productos = p.items
  if (!clone.productos) clone.productos = []
  if (!clone.items) clone.items = clone.productos
  return clone
}

export const formatPedidoDate = (dateString) => {
  if (!dateString) return 'Sin fecha'
  if (typeof window === 'undefined') return dateString
  // ISO timestamps from Supabase already contain 'T'; don't append it again
  const date = String(dateString).includes('T')
    ? new Date(dateString)
    : new Date(`${dateString}T12:00:00`)
  if (isNaN(date.getTime())) return String(dateString)
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const getPedidoProductData = (prod, productosBase = []) => {
  if (prod?.tiempoUnitario && prod?.precioPorMinuto) {
    return {
      tiempoUnitario: prod.tiempoUnitario,
      precioPorMinuto: prod.precioPorMinuto,
      material: prod.material || null,
      materialId: prod.materialId || null,
      espesor: prod.espesor || null
    }
  }

  const productoBase = productosBase.find(p =>
    p.id === prod?.productId ||
    p.id === prod?.idProducto ||
    p.nombre?.toLowerCase() === prod?.nombre?.toLowerCase()
  )

  return {
    tiempoUnitario: productoBase?.tiempoUnitario || '00:00:00',
    precioPorMinuto: productoBase?.precioPorMinuto || 0,
    material: productoBase?.material || null,
    materialId: productoBase?.materialId || null,
    espesor: productoBase?.espesor || null
  }
}

export const getPedidoMaterialInfo = (materiales = [], materialName, materialId) => {
  if (!materiales || materiales.length === 0) return null
  if (materialId) {
    const material = materiales.find(m => String(m.id) === String(materialId))
    if (material) return material
  }
  if (materialName) {
    const material = materiales.find(m => m.nombre === materialName)
    if (material) return material
  }
  return null
}

export const buildCalendarCartFromPedido = (pedido, productosBase = []) => {
  if (!pedido || !Array.isArray(pedido.productos)) return []
  return pedido.productos.map(item => {
    const productData = getPedidoProductData(item, productosBase)
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

export const actualizarMovimientosPedido = async (pedidoActualizado, pedidoAnterior = null, notify = null) => {
  try {
    const prevMonto = Number(pedidoAnterior?.montoRecibido || 0)
    const newMonto = Number(pedidoActualizado.montoRecibido || 0)
    const totalPedido = Number(pedidoActualizado.total || 0)

    if (prevMonto === newMonto) return
    if (newMonto < prevMonto) return
    if (newMonto <= 0) return

    const clienteNombre = `${pedidoActualizado.cliente?.nombre || ''} ${pedidoActualizado.cliente?.apellido || ''}`.trim()
    const hoy = new Date().toISOString().split('T')[0]
    const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const metodo = pedidoActualizado.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo'

    if (prevMonto === 0 && newMonto > 0) {
      const esPagoTotal = totalPedido > 0 && newMonto >= totalPedido
      const { error } = await createMovimiento({
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
      if (error && notify) notify(`❌ Error al registrar en Finanzas: ${error}`, 'error')
      if (!error && notify) notify(esPagoTotal ? '💰 Pago total registrado en Finanzas' : '💰 Seña registrada en Finanzas', 'success')
    } else if (newMonto > prevMonto) {
      const diferencia = newMonto - prevMonto
      const completaPago = totalPedido > 0 && newMonto >= totalPedido
      const { error } = await createMovimiento({
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
      if (error && notify) notify(`❌ Error al registrar en Finanzas: ${error}`, 'error')
      if (!error && notify) notify(completaPago ? '💰 Pago restante registrado en Finanzas' : '💰 Pago adicional registrado en Finanzas', 'success')
    }
  } catch (error) {
    if (notify) notify('❌ Error al registrar movimiento financiero', 'error')
  }
}

export function persistAndEmit(updatedPedidosArray, pedidoId, tipo = 'update', fecha = null) {
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

  try {
    const pedido = (updatedPedidosArray || []).find(p => p.id === pedidoId)
    if (!pedido) return
    ;(async () => {
      try {
        const resp = await fetch(`/api/pedidos/catalogo/${pedidoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedido)
        })
        if (!resp.ok) {
          await resp.json().catch(() => ({}))
        }
      } catch (e) {
        // noop
      }
    })()
  } catch (err) {
    // noop
  }
}
