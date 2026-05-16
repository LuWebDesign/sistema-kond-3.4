import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'
import OrderCatalogDetailView from '../../../../components/OrderCatalogDetailView'
import { getPedidoCatalogoById, updatePedidoCatalogo, updateMontoRecibido } from '../../../../utils/supabasePedidos'
import { getAllProductos, mapProductoToFrontend } from '../../../../utils/supabaseProductos'
import { getAllMateriales } from '../../../../utils/supabaseMateriales'
import { createToast } from '../../../../utils/catalogUtils'
import { getCurrentSession } from '../../../../utils/supabaseAuthV2'
import { getPedidoHistorial, addHistorialEvent } from '../../../../utils/supabasePedidoHistorial'
import {
  mapSupabasePedidoToFrontend,
  normalizePedido,
  persistAndEmit,
  actualizarMovimientosPedido
} from '../../../../utils/pedidosCatalogoDetail'
import styles from '../../../../styles/detalle-pedido.module.css'

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  en_produccion: 'En producción',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

function DetallePedidoPage() {
  const router = useRouter()
  const { id } = router.query

  const [pedido, setPedido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [productosBase, setProductosBase] = useState([])
  const [materiales, setMateriales] = useState([])
  const [historial, setHistorial] = useState([])
  const [adminUser, setAdminUser] = useState('Admin')

  // Ref para evitar registrar historial de creación más de una vez
  const historialInitDone = useRef(false)

  // ── Admin user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentSession()
      .then(sess => {
        const u = sess?.user
        setAdminUser(u?.nombre || u?.email || 'Admin')
      })
      .catch(() => {})
  }, [])

  // ── localStorage helper ─────────────────────────────────────────────────────
  const upsertPedidoLocal = useCallback((updatedPedido) => {
    try {
      const current = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      const next = Array.isArray(current)
        ? current.map(p => String(p.id) === String(updatedPedido.id) ? updatedPedido : p)
        : [updatedPedido]
      if (!next.some(p => String(p.id) === String(updatedPedido.id))) next.push(updatedPedido)
      localStorage.setItem('pedidosCatalogo', JSON.stringify(next))
      return next
    } catch (e) {
      return [updatedPedido]
    }
  }, [])

  // ── Historial helper ────────────────────────────────────────────────────────
  const logEvent = useCallback(async (tipo, descripcion, autor) => {
    if (!id) return null
    const { data } = await addHistorialEvent({
      pedidoId: id,
      tipo,
      descripcion,
      autor: autor || adminUser
    })
    if (data) setHistorial(prev => [data, ...prev])
    return data
  }, [id, adminUser])

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return
    let active = true

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [{ data: productosDB }, { data: materialesDB }, { data: pedidoDB }, { data: histDB }] = await Promise.all([
          getAllProductos(),
          getAllMateriales(),
          getPedidoCatalogoById(id),
          getPedidoHistorial(id)
        ])
        if (!active) return

        const mappedProductos = (productosDB || []).map(mapProductoToFrontend)
        setProductosBase(mappedProductos)
        setMateriales(materialesDB || [])
        setHistorial(histDB || [])

        if (pedidoDB) {
          setPedido(normalizePedido(mapSupabasePedidoToFrontend(pedidoDB, mappedProductos)))

          // Registrar evento 'created' solo si el historial está vacío
          if (!historialInitDone.current && (!histDB || histDB.length === 0)) {
            historialInitDone.current = true
            const fechaCreacion = pedidoDB.fecha_creacion || new Date().toISOString()
            const { data: ev } = await addHistorialEvent({
              pedidoId: id,
              tipo: 'created',
              descripcion: 'Pedido creado',
              autor: 'Sistema'
            })
            if (ev && active) setHistorial([{ ...ev, created_at: ev.created_at || fechaCreacion }])
          } else {
            historialInitDone.current = true
          }
        } else {
          const fallback = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
            .find(p => String(p.id) === String(id))
          setPedido(fallback ? normalizePedido(fallback) : null)
        }
      } catch (e) {
        if (!active) return
        setError('No se pudo cargar el pedido')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [router.isReady, id])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChangeFechaProduccion = useCallback((valor) => {
    setPedido(prev => {
      if (!prev) return prev
      if (valor) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
        const fechaProd = new Date(valor + 'T00:00:00')
        if (fechaProd < hoy) {
          createToast('La fecha de producción no puede ser en el pasado', 'error')
          return prev
        }
        if (prev.fechaConfirmadaEntrega) {
          const fechaEntrega = new Date(prev.fechaConfirmadaEntrega + 'T00:00:00')
          if (fechaProd > fechaEntrega) {
            createToast('La fecha de producción no puede ser posterior a la fecha de entrega confirmada', 'error')
            return prev
          }
        }
      }
      const updated = normalizePedido({
        ...prev,
        fechaProduccion: valor,
        fechaProduccionCalendario: valor || null,
        asignadoAlCalendario: Boolean(valor || prev.fechaEntregaCalendario || prev.fechaConfirmadaEntrega)
      })
      const cache = upsertPedidoLocal(updated)
      persistAndEmit(cache, updated.id, 'fechaProduccionChanged', valor)
      if (valor) logEvent('fecha', `Fecha de producción → ${valor}`)
      return updated
    })
  }, [upsertPedidoLocal, logEvent])

  const handleChangeFechaConfirmada = useCallback((valor) => {
    setPedido(prev => {
      if (!prev) return prev
      if (valor) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
        const fechaEntrega = new Date(valor + 'T00:00:00')
        if (fechaEntrega < hoy) {
          createToast('La fecha de entrega no puede ser en el pasado', 'error')
          return prev
        }
        if (prev.fechaProduccion) {
          const fechaProd = new Date(prev.fechaProduccion + 'T00:00:00')
          if (fechaEntrega < fechaProd) {
            createToast('La fecha de entrega no puede ser anterior a la fecha de producción', 'error')
            return prev
          }
        }
      }
      const updated = normalizePedido({
        ...prev,
        fechaConfirmadaEntrega: valor,
        fechaEntregaCalendario: valor || null,
        asignadoAlCalendario: Boolean(prev.fechaProduccionCalendario || valor || prev.fechaProduccion)
      })
      const cache = upsertPedidoLocal(updated)
      persistAndEmit(cache, updated.id, 'fechaEntregaChanged', valor)
      if (valor) logEvent('fecha', `Entrega confirmada → ${valor}`)
      return updated
    })
  }, [upsertPedidoLocal, logEvent])

  const handleChangeEstado = useCallback((newStatus) => {
    setPedido(prev => {
      if (!prev) return prev
      const updated = normalizePedido({ ...prev })
      if (newStatus === 'pendiente') {
        updated.estado = 'pendiente'
        updated.asignadoAlCalendario = false
        delete updated.fechaProduccionCalendario
        delete updated.fechaEntregaCalendario
      } else if (newStatus === 'confirmado') {
        updated.estado = 'confirmado'
        const fechaProd = updated.fechaProduccion || updated.fechaProduccionCalendario || null
        const fechaEnt = updated.fechaConfirmadaEntrega || updated.fechaEntregaCalendario || null
        if (fechaProd || fechaEnt) {
          updated.asignadoAlCalendario = true
          if (fechaProd) updated.fechaProduccionCalendario = fechaProd
          if (fechaEnt) updated.fechaEntregaCalendario = fechaEnt
        } else {
          updated.asignadoAlCalendario = false
        }
      } else {
        updated.estado = newStatus
      }
      const cache = upsertPedidoLocal(updated)
      persistAndEmit(cache, updated.id, 'update-status')
      logEvent('estado', `Estado → ${ESTADO_LABELS[newStatus] || newStatus}`)
      return updated
    })
  }, [upsertPedidoLocal, logEvent])

  const handleChangeEstadoPago = useCallback((newEstadoPago) => {
    setPedido(prev => {
      if (!prev) return prev
      const totalPedido = Number(prev.total || 0)
      const updated = normalizePedido({ ...prev, estadoPago: newEstadoPago })
      if (newEstadoPago === 'sin_seña') updated.montoRecibido = 0
      else if (newEstadoPago === 'pagado_total') updated.montoRecibido = totalPedido
      const cache = upsertPedidoLocal(updated)
      persistAndEmit(cache, updated.id, 'update-payment')
      const labels = { sin_seña: 'Sin seña', seña_pagada: 'Seña pagada', pagado_total: 'Pagado total' }
      logEvent('pago', `Estado de pago → ${labels[newEstadoPago] || newEstadoPago}`)
      return updated
    })
  }, [upsertPedidoLocal, logEvent])

  const handleChangeMontoRecibido = useCallback((monto) => {
    setPedido(prev => prev ? normalizePedido({ ...prev, montoRecibido: monto }) : prev)
  }, [])

  const savePedido = useCallback(async (pedidoActual) => {
    if (!pedidoActual) return
    try {
      const updated = normalizePedido(pedidoActual)
      const resp = await updatePedidoCatalogo(updated.id, updated)
      if (resp.error) throw new Error(resp.error)
      if (updated.metodoPago !== 'mercadopago') {
        await updateMontoRecibido(updated.id, Number(updated.montoRecibido || 0), updated.estadoPago)
      }
      const cache = upsertPedidoLocal(updated)
      persistAndEmit(cache, updated.id, 'save-changes')
      await actualizarMovimientosPedido(updated, pedido, createToast)
      await logEvent('guardado', 'Cambios guardados')
      setPedido(updated)
      createToast('Pedido guardado correctamente', 'success')
    } catch (e) {
      createToast(`No se pudo guardar el pedido: ${e.message}`, 'error')
    }
  }, [pedido, upsertPedidoLocal, logEvent])

  const onAssignCalendar = useCallback((currentPedido) => {
    if (!currentPedido) return
    try {
      const updated = {
        ...currentPedido,
        asignadoAlCalendario: true,
        estado: currentPedido.estado === 'pendiente' ? 'confirmado' : currentPedido.estado,
        fechaProduccionCalendario: currentPedido.fechaProduccion || null,
        fechaEntregaCalendario: currentPedido.fechaConfirmadaEntrega || null
      }
      setPedido(updated)
      persistAndEmit(upsertPedidoLocal(updated), updated.id, 'assigned')
      logEvent('calendario', 'Asignado al calendario')
      createToast('Pedido asignado al calendario correctamente', 'success')
    } catch (e) {
      createToast('Ocurrió un error al asignar el pedido', 'error')
    }
  }, [upsertPedidoLocal, logEvent])

  const handleDelete = useCallback(async (currentPedido) => {
    if (!currentPedido) return
    if (!confirm('¿Estás seguro de eliminar este pedido?')) return
    const resp = await fetch(`/api/pedidos/catalogo/${currentPedido.id}`, { method: 'DELETE' })
    if (!resp.ok) {
      createToast('No se pudo eliminar el pedido', 'error')
      return
    }
    try {
      const current = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      const updated = (Array.isArray(current) ? current : []).filter(p => String(p.id) !== String(currentPedido.id))
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updated))
      persistAndEmit(updated, currentPedido.id, 'delete')
    } catch (e) { /* noop */ }
    createToast('Pedido eliminado correctamente', 'success')
    router.push('/admin/orders?tab=pendientes')
  }, [router])

  const handleContactWhatsApp = useCallback(() => {
    if (!pedido?.cliente?.telefono) return
    const telefono = pedido.cliente.telefono.replace(/\D/g, '')
    const mensaje = `Hola ${pedido.cliente.nombre}! Te contacto sobre tu pedido #${pedido.id}.`
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }, [pedido])

  const handleContactEmail = useCallback(() => {
    if (!pedido?.cliente?.email) return
    const subject = 'Pedido - Sistema KOND'
    const body = `Hola ${pedido.cliente.nombre},\n\nTe contacto sobre tu pedido #${pedido.id}.`
    window.location.href = `mailto:${pedido.cliente.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [pedido])

  const handleDownloadComprobante = useCallback((currentPedido) => {
    if (!currentPedido?.comprobante) return
    const a = document.createElement('a')
    a.href = currentPedido.comprobante
    a.download = `comprobante-pedido-${currentPedido.id}`
    a.click()
  }, [])

  const handleAddNota = useCallback(async (texto) => {
    await logEvent('nota', texto)
  }, [logEvent])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout title={pedido ? `Pedido #${pedido.id} - Sistema KOND` : 'Detalle de Pedido'}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} style={{ padding: '16px 28px 0' }}>
        <Link href="/admin/orders?tab=pendientes">Pedidos Catálogo</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>Pedido #{id}</span>
      </nav>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Cargando pedido...
        </div>
      ) : error ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--danger-color, #ef4444)' }}>
          {error}
        </div>
      ) : !pedido ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Pedido no encontrado
        </div>
      ) : (
        <OrderCatalogDetailView
          pedido={pedido}
          setPedido={setPedido}
          productosBase={productosBase}
          materiales={materiales}
          historial={historial}
          onChangeEstado={handleChangeEstado}
          onChangeEstadoPago={handleChangeEstadoPago}
          onChangeFechaProduccion={handleChangeFechaProduccion}
          onChangeFechaConfirmada={handleChangeFechaConfirmada}
          onChangeMontoRecibido={handleChangeMontoRecibido}
          onSave={savePedido}
          onDelete={handleDelete}
          onClose={() => router.push('/admin/orders?tab=pendientes')}
          onAssignCalendar={onAssignCalendar}
          onContactWhatsApp={handleContactWhatsApp}
          onContactEmail={handleContactEmail}
          onDownloadComprobante={handleDownloadComprobante}
          onAddNota={handleAddNota}
          showFooter={true}
        />
      )}
    </Layout>
  )
}

export default withAdminAuth(DetallePedidoPage)
