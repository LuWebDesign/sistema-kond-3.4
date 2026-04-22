import PublicLayout from '../../components/PublicLayout'
import UserOrderCard from '../../components/UserOrderCard'
import { useOrders } from '../../hooks/useCatalog'
import { getCurrentUser, createToast } from '../../utils/catalogUtils'
import { getPedidosByEmail } from '../../utils/supabasePedidos'
import { getAllProductos, mapProductoToFrontend } from '../../utils/supabaseProductos'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

// Format date to locale string safely
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

// Status label map
const statusLabels = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const statusColors = {
  pendiente: 'var(--orders-color)',
  confirmado: 'var(--accent-blue)',
  en_preparacion: 'var(--person-color)',
  listo: 'var(--accent-secondary)',
  entregado: 'var(--accent-secondary)',
  cancelado: 'var(--text-muted)',
}

const paymentLabels = {
  sin_seña: 'Sin seña',
  seña_pagada: 'Seña pagada',
  pagado: 'Pago total',
  pagado_total: 'Pago total',
}

const paymentColors = {
  sin_seña: 'var(--text-muted)',
  seña_pagada: 'var(--orders-color)',
  pagado: 'var(--accent-secondary)',
  pagado_total: 'var(--accent-secondary)',
}

const formatCurrency = (val) => {
  const n = Number(val || 0)
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
}

// Mapea pedido de Supabase (snake_case) a formato frontend (camelCase)
// productosBase se pasa como parámetro para incluir imágenes
const mapSupabasePedidoToFrontend = (pedidoDB, productosBase = []) => {
  if (!pedidoDB) return null
  
    return {
      id: String(pedidoDB.id),
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
        imagen: producto?.imagen || null
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
        imagen: producto?.imagen || null
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

export default function MisPedidos() {
  const router = useRouter()
  const { saveOrder } = useOrders()
  const [userOrders, setUserOrders] = useState([])
  const [currentUserState, setCurrentUserState] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [ordersPage, setOrdersPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const itemsPerPage = 4

  // Cargar pedidos del usuario actual y suscribirse a actualizaciones globales
  const loadUserOrders = async () => {
    try {
      const user = getCurrentUser()
      setCurrentUserState(user)

      if (user && user.email) {

        // Cargar productos desde Supabase primero, fallback a localStorage
        let productosBase = []
        const { data: productosDB, error: productosError } = await getAllProductos()
        if (!productosError && productosDB && productosDB.length > 0) {
          productosBase = productosDB.map(mapProductoToFrontend)
        }

        // Intentar cargar pedidos desde API server-side (bypass RLS)
        let pedidosDB = null
        let fetchError = null
        try {
          const resp = await fetch(`/api/pedidos-catalogo/by-email?email=${encodeURIComponent(user.email)}`)
          if (resp.ok) {
            const json = await resp.json()
            pedidosDB = json.data
          } else {
            fetchError = true
          }
        } catch (e) {
          fetchError = true
        }

        // Fallback: cliente anon (puede fallar por RLS)
        if (fetchError || !pedidosDB) {
          const { data, error } = await getPedidosByEmail(user.email)
          if (!error && data) pedidosDB = data
        }

        if (pedidosDB) {
          const pedidosMapped = pedidosDB.map(pedidoDB =>
            mapSupabasePedidoToFrontend(pedidoDB, productosBase)
          )
          pedidosMapped.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
          setUserOrders(pedidosMapped)
        } else {
          setUserOrders([])
        }
      } else {
        setUserOrders([])
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error cargando pedidos:', error)
      setCurrentUserState(null)
      setIsLoading(false)
      setUserOrders([])
      createToast('Error al cargar los pedidos', 'error')
    }
  }

  useEffect(() => {
    loadUserOrders()

    const handlePedidosUpdated = (e) => {
      loadUserOrders()
    }

    window.addEventListener('pedidosCatalogo:updated', handlePedidosUpdated)
    return () => {
      window.removeEventListener('pedidosCatalogo:updated', handlePedidosUpdated)
    }
  }, [])

  // Paginación (memoizada para evitar recalcular en cada render)
  const totalPages = useMemo(() => Math.ceil(userOrders.length / itemsPerPage), [userOrders.length, itemsPerPage])
  const startIndex = useMemo(() => (ordersPage - 1) * itemsPerPage, [ordersPage, itemsPerPage])
  const paginatedOrders = useMemo(() => userOrders.slice(startIndex, startIndex + itemsPerPage), [userOrders, startIndex, itemsPerPage])

  // Función de paginación inteligente (memoizada)
  const getVisiblePages = useCallback(() => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, ordersPage - delta); i <= Math.min(totalPages - 1, ordersPage + delta); i++) {
      range.push(i)
    }

    if (ordersPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (ordersPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }, [ordersPage, totalPages])

  // Memoizar handler de click en pedido
  const handleOrderClick = useCallback((order) => {
    setSelectedOrder(order)
  }, [])

  // Session check is instant (localStorage). If no user, show immediately.
  if (!isLoading && !currentUserState) {
    return (
      <PublicLayout title="Mis Pedidos - KOND">
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.3rem', fontWeight: 700 }}>
              Iniciá sesión para ver tus pedidos
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Necesitás tener una cuenta para acceder al historial de compras.
            </p>
            <Link
              href="/catalog/user"
              style={{ background: 'var(--accent-blue)', color: 'white', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'inline-block' }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout title="Mis Pedidos - KOND">
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Mis pedidos
          </h1>
          {userOrders.length > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {userOrders.length} {userOrders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ height: '14px', width: '100px', borderRadius: '6px', background: 'var(--bg-section)' }} />
                  <div style={{ height: '14px', width: '60px', borderRadius: '6px', background: 'var(--bg-section)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ height: '12px', width: '140px', borderRadius: '6px', background: 'var(--bg-section)' }} />
                  <div style={{ height: '12px', width: '80px', borderRadius: '6px', background: 'var(--bg-section)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : userOrders.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
              No tenés pedidos aún
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Explorá el catálogo y realizá tu primer compra.
            </p>
            <Link
              href="/catalog"
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'inline-block'
              }}
            >
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <>
            {/* Order list */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {paginatedOrders.map(order => {
                const isFullyPaid = (order.estadoPago || '').toLowerCase().includes('pagado')
                const sena = isFullyPaid ? order.total : (Number(order.montoRecibido) || (order.estadoPago === 'seña_pagada' ? order.total * 0.5 : 0))
                const restante = Math.max(0, order.total - sena)
                const entregaFecha = order.fechaConfirmadaEntrega || order.fechaSolicitudEntrega || order.fechaEntrega
                const isDelayed = order.fechaConfirmadaEntrega && order.estado !== 'entregado' && new Date(order.fechaConfirmadaEntrega + 'T00:00:00') < new Date(new Date().toDateString())

                return (
                  <button
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                      display: 'grid',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
                  >
                    {/* Row 1: ID + Status + Payment */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        #{order.id?.toString().slice(0, 8) || order.id}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 600,
                          color: statusColors[order.estado] || 'var(--text-muted)',
                          border: `1px solid ${statusColors[order.estado] || 'var(--border-color)'}`,
                          borderRadius: '6px', padding: '3px 8px'
                        }}>
                          {statusLabels[order.estado] || order.estado || 'Pendiente'}
                        </span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 600,
                          color: paymentColors[order.estadoPago] || 'var(--text-muted)',
                          border: `1px solid ${paymentColors[order.estadoPago] || 'var(--border-color)'}`,
                          borderRadius: '6px', padding: '3px 8px'
                        }}>
                          {paymentLabels[order.estadoPago] || order.estadoPago || 'Sin seña'}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>📅 Pedido: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(order.fechaCreacion)}</strong></div>
                      {entregaFecha && (
                        <div style={isDelayed ? { color: 'var(--orders-color)' } : {}}>
                          🚚 {order.fechaConfirmadaEntrega ? 'Entrega confirmada:' : 'Entrega solicitada:'} <strong style={{ color: 'var(--text-primary)' }}>{formatDate(entregaFecha)}</strong>
                          {isDelayed && <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '2px' }}>⚠️ Entrega con demora. Contáctate para info.</span>}
                        </div>
                      )}
                    </div>

                    {/* Row 3: Products preview + Total + Seña/Restante */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {order.items?.length || 0} {order.items?.length === 1 ? 'producto' : 'productos'}
                        {order.items?.[0]?.nombre && ` • ${order.items[0].nombre}`}
                        {order.items?.length > 1 && ` +${order.items.length - 1}`}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                          {formatCurrency(order.total)}
                        </div>
                        {!isFullyPaid && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Seña: {formatCurrency(sena)} • Restante: {formatCurrency(restante)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                  disabled={ordersPage === 1}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: ordersPage === 1 ? 'var(--bg-section)' : 'var(--bg-card)',
                    color: ordersPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: ordersPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ←
                </button>

                {getVisiblePages().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && setOrdersPage(page)}
                    disabled={page === '...'}
                    style={{
                      padding: '6px 10px',
                      border: page === ordersPage ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: page === ordersPage ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: page === ordersPage ? 'white' : page === '...' ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: page === '...' ? 'default' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: page === ordersPage ? 600 : 400,
                      minWidth: '36px'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setOrdersPage(Math.min(totalPages, ordersPage + 1))}
                  disabled={ordersPage === totalPages}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: ordersPage === totalPages ? 'var(--bg-section)' : 'var(--bg-card)',
                    color: ordersPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: ordersPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal de detalle del pedido */}
        {selectedOrder && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 1000, padding: '20px'
            }}
            onClick={() => setSelectedOrder(null)}
          >
            <div
              style={{
                background: 'var(--bg-card)', borderRadius: '12px', padding: '24px',
                maxWidth: '560px', width: '100%', maxHeight: '80vh', overflow: 'auto'
              }}
              onClick={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    Pedido #{selectedOrder.id?.slice(0, 8) || selectedOrder.id}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                    {formatDate(selectedOrder.fechaCreacion)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                >
                  ×
                </button>
              </div>

              {/* Status + total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 600,
                  color: statusColors[selectedOrder.estado] || 'var(--text-muted)',
                  border: `1px solid ${statusColors[selectedOrder.estado] || 'var(--border-color)'}`,
                  borderRadius: '6px', padding: '4px 12px', textTransform: 'capitalize'
                }}>
                  {statusLabels[selectedOrder.estado] || selectedOrder.estado || 'Pendiente'}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                  ${selectedOrder.total?.toLocaleString('es-AR') || '0'}
                </span>
              </div>

              {/* Products */}
              {selectedOrder.productos && selectedOrder.productos.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Productos
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedOrder.productos.map((producto, index) => (
                      <div key={index} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'var(--bg-section)', borderRadius: '8px'
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {producto.nombre}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Cant. {producto.cantidad}
                          </div>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          ${producto.subtotal?.toLocaleString('es-AR') || '0'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Skeleton animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </PublicLayout>
  )
}
