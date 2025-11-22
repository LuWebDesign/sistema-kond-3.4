import { formatCurrency, createToast } from '../utils/catalogUtils'
import { useState, memo } from 'react'

const UserOrderCard = memo(function UserOrderCard({ pedido, onClick }) {
  const [expanded, setExpanded] = useState(false)

  const totalUnits = pedido.productos.reduce((sum, prod) => sum + (prod.cantidad || 0), 0)
  const firstProduct = pedido.productos && pedido.productos.length ? pedido.productos[0] : null

  // Intentar obtener imagen actual del catálogo si el pedido guarda una imagen antigua
  const getStoredProductImage = (prod) => {
    if (!prod) return ''
    if (prod.imagen) return prod.imagen
    if (prod.image) return prod.image
    const idCandidate = prod.productId || prod.idProducto || prod.productoId || prod.id
    try {
      if (typeof window !== 'undefined') {
        const productosBase = JSON.parse(localStorage.getItem('productosBase') || '[]') || []
        const found = productosBase.find(p => p && (p.id === idCandidate || p.id == idCandidate))
        if (found) return found.imagen || found.image || ''
      }
    } catch (e) {
      // ignore
    }
    return ''
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha'
    try {
      // parsear YYYY-MM-DD como fecha local para evitar desfases por zona horaria
      const { parseDateYMD } = require('../utils/catalogUtils')
      const d = parseDateYMD(dateStr) || new Date(dateStr)
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getStatusInfo = (estado) => {
    const statusMap = {
      'pendiente': { emoji: '⏳', label: 'Pendiente', color: '#f59e0b' },
      'confirmado': { emoji: '✅', label: 'Confirmado', color: '#3b82f6' },
      'en_preparacion': { emoji: '🔨', label: 'En Preparación', color: '#8b5cf6' },
      'listo': { emoji: '📦', label: 'Listo', color: '#10b981' },
      'entregado': { emoji: '🎉', label: 'Entregado', color: '#059669' },
      'cancelado': { emoji: '❌', label: 'Cancelado', color: '#ef4444' }
    }
    return statusMap[estado] || statusMap['pendiente']
  }

  const getPaymentInfo = (estadoPago) => {
    const paymentMap = {
      'sin_seña': { label: 'Sin Seña', color: '#ef4444' },
      'seña_pagada': { label: 'Seña Pagada', color: '#f59e0b' },
      'pagado': { label: 'Pago total', color: '#10b981' },
      'pagado_total': { label: 'Pago total', color: '#10b981' }
    }
    return paymentMap[estadoPago] || paymentMap['sin_seña']
  }

  const statusInfo = getStatusInfo(pedido.estado)
  const paymentInfo = getPaymentInfo(pedido.estadoPago)

  // Calcular seña/restante: manejar pago total como caso especial
  const paymentStatus = (pedido.estadoPago || '').toString().toLowerCase()
  const isFullyPaid = paymentStatus === 'pagado' || paymentStatus === 'pagado_total' || paymentStatus === 'pagado total'
  const totalAmount = Number(pedido.total || 0)
  const sena = isFullyPaid ? totalAmount : (Number(pedido.montoRecibido || 0) || (pedido.estadoPago === 'seña_pagada' ? totalAmount * 0.5 : 0))
  const restante = Math.max(0, totalAmount - Number(sena || 0))

  const copyOrderId = async (e) => {
    try {
      // evitar que el click en el icono expanda/contraiga la card
      if (e && e.stopPropagation) e.stopPropagation()
      const text = pedido.id?.toString ? pedido.id.toString() : String(pedido.id)
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        createToast('Número de pedido copiado al portapapeles', 'success')
      } else {
        // fallback
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        createToast('Número de pedido copiado al portapapeles', 'success')
      }
    } catch (err) {
      console.error('Error copiando ID de pedido', err)
      createToast('No se pudo copiar el número de pedido', 'error')
    }
  }

  return (
    <div className={`uoc-card user-order-card`} role="button" tabIndex={0} style={{position: 'relative'}}
      onClick={() => { if (!onClick) setExpanded(s => !s) }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!onClick) setExpanded(s => !s) } }}>

      {/* Header Mobile - incluye número de pedido y fecha */}
      <div className="uoc-mobile-header" style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
        <div className="uoc-order-id" style={{display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 8px', borderRadius: 8}}>
          <span style={{fontWeight: 700}}>#{pedido.id}</span>
          <button onClick={(e) => { e.stopPropagation(); copyOrderId(e) }} title="Copiar número de pedido" aria-label={`Copiar número de pedido ${pedido.id}`} style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, fontSize: '0.9rem'}}>
            📋
          </button>
        </div>
        <div className="uoc-date-pill">Fecha de Pedido: {formatDate(pedido.fechaCreacion)}</div>
      </div>

      {/* Badges Mobile */}
      <div className="uoc-badges-mobile" style={{display: 'flex', gap: 10, alignItems: 'center'}}>
        <span className="uoc-badge uoc-badge-status">{statusInfo.emoji} {statusInfo.label}</span>
        <span className="uoc-badge uoc-badge-payment">💰 {paymentInfo.label}</span>
      </div>

      {/* Productos Preview */}
      <div className="uoc-products-preview">
        <div>
          <span>📦 Productos ({pedido.productos.length})</span>
        </div>
        <div style={{display: 'flex', alignItems: 'flex-start', fontSize: '0.85rem', opacity: 0.8, marginTop: '4px', gap: 10}}>
          {pedido.productos.length > 1 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              {pedido.productos.map((p, idx) => {
                const price = p.precioUnitario || p.price || p.precio || 0
                return (
                  <div key={idx} style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8}}>
                    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                      { (getStoredProductImage(p) || p.imagen) && <img src={getStoredProductImage(p) || p.imagen} alt={p.nombre || 'producto'} style={{width: 36, height: 36, objectFit: 'cover', borderRadius: 6}} />}
                      <div>
                        <div style={{fontWeight: 600}}>{p.nombre} {p.medidas && `(${p.medidas})`}</div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Unidades: {p.cantidad || 1}</div>
                      </div>
                    </div>
                    <div style={{whiteSpace: 'nowrap', fontWeight: 600}}>{formatCurrency(price)}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {firstProduct && (
                <img src={(getStoredProductImage(firstProduct) || (firstProduct.imagenes && firstProduct.imagenes[0]) || firstProduct.imagen || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Crect width="48" height="48" fill="%23e5e7eb"/%3E%3Cpath d="M24 20a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm-8 8a8 8 0 0 1 16 0h2a10 10 0 0 0-20 0h2z" fill="%239ca3af"/%3E%3C/svg%3E')} alt={firstProduct.nombre || 'producto'} style={{width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginRight: 10}} />
              )}
              <div>
                {firstProduct?.nombre} {firstProduct?.medidas && `(${firstProduct?.medidas})`}
                {pedido.productos.length > 1 && ` + ${pedido.productos.length - 1} más`}
              </div>
            </>
          )}
        </div>
        {/* Total */}
        {pedido.total && (
          <div style={{fontSize: '0.9rem', fontWeight: '600', marginTop: '6px', textAlign: 'right'}}>
            Total: {formatCurrency(pedido.total)}
          </div>
        )}
        {/* Seña y Restante (compacto) */}
        {pedido.total != null && (
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6, fontSize: '0.85rem'}}>
            <div style={{color: 'var(--text-secondary)'}}>Seña: <span style={{fontWeight: 700}}>{isFullyPaid ? 'Pago total' : formatCurrency(sena)}</span></div>
            <div style={{color: 'var(--text-secondary)'}}>Restante: <span style={{fontWeight: 700}}>{formatCurrency(restante)}</span></div>
          </div>
        )}
      </div>

      {/* Detalles expandidos */}
      <div className="uoc-details">
        {/* Productos completos */}
        <div className="uoc-products">
          <div className="uoc-products-row">
            <span>📦 Productos ({pedido.productos.length})</span>
          </div>
          {pedido.productos.map((producto, index) => {
            const unitPrice = producto.precioUnitario || producto.price || producto.precio || 0
            return (
              <div key={index} className="uoc-products-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <div>
                  {producto.nombre} {producto.medidas && `(${producto.medidas})`}
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Unidades: {producto.cantidad || 1}</div>
                </div>
                <div style={{fontWeight: 700}}>{formatCurrency(unitPrice)}</div>
              </div>
            )
          })}
        </div>

        {/* Entrega y método */}
        <div className="uoc-delivery">
          {pedido.metodoPago && <div><strong>Método:</strong> {pedido.metodoPago === 'transferencia' ? 'Transferencia' : pedido.metodoPago === 'whatsapp' ? 'WhatsApp' : pedido.metodoPago === 'retiro' ? 'Retiro en Local' : pedido.metodoPago}</div>}
        </div>

        {/* Pagos (seña/restante) */}
        {pedido.total != null && (
          <div className="uoc-payments">
            <div className="uoc-pay-row"><span>💵 Seña:</span><span className="uoc-pay-seña">{isFullyPaid ? 'Pago total' : formatCurrency(sena)}</span></div>
            <div className="uoc-pay-row"><span>🔥 Restante:</span><span className="uoc-pay-rest">{formatCurrency(restante)}</span></div>
          </div>
        )}
      </div>

      {/* Footer Mobile */}
      <div className="uoc-mobile-footer">
        {/* Información de entrega */}
        {(() => {
          const entrega = pedido.fechaEntregaCalendario || pedido.fechaConfirmadaEntrega || pedido.fechaSolicitudEntrega || null
          if (entrega) {
            // Si existe fechaConfirmadaEntrega y la fecha actual ya la superó, y el pedido no está entregado,
            // mostrar mensaje de demora en lugar de la fecha.
            if (pedido.fechaConfirmadaEntrega) {
              try {
                const { parseDateYMD } = require('../utils/catalogUtils')
                const confirmed = parseDateYMD(pedido.fechaConfirmadaEntrega) || new Date(pedido.fechaConfirmadaEntrega)
                const today = new Date()
                // comparar por día (ignorar horas)
                confirmed.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                if (today > confirmed && (pedido.estado || '').toString().toLowerCase() !== 'entregado') {
                  return (
                    <div className="uoc-delivery-info" style={{ color: '#f59e0b' }}>
                      <span style={{ marginRight: 8 }}>💬</span>Entrega con demora. Contáctate para recibir información
                    </div>
                  )
                }
              } catch (e) {
                // si falla el parseo no bloquear la renderización — caerá al label normal
                // console.warn('Error parsing fechaConfirmadaEntrega', e)
              }
            }

            const label = pedido.fechaConfirmadaEntrega ? 'Entrega confirmada:' : 'Entrega solicitada:'
            return (
              <div className="uoc-delivery-info">
                📅 {label} {formatDate(entrega)}
              </div>
            )
          }
          return null
        })()}
        <div className="uoc-total">
          <div className="uoc-total-label">Total</div>
          <div className="uoc-total-amount">{formatCurrency(pedido.total)}</div>
        </div>
      </div>

    </div>
  )
})

export default UserOrderCard
