import { formatCurrency } from '../utils/catalogUtils'
import { useState } from 'react'

export default function UserOrderCard({ pedido, onClick }) {
  const [expanded, setExpanded] = useState(false)

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

  return (
    <div className={`uoc-card user-order-card`} role="button" tabIndex={0}
      onClick={() => { if (!onClick) setExpanded(s => !s) }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!onClick) setExpanded(s => !s) } }}>

      {/* Header Mobile */}
      <div className="uoc-mobile-header">
        <div className="uoc-order-id">#{pedido.id}</div>
        <div className="uoc-date-pill">{formatDate(pedido.fechaCreacion)}</div>
      </div>

      {/* Badges Mobile */}
      <div className="uoc-badges-mobile">
        <span className="uoc-badge uoc-badge-status">{statusInfo.emoji} {statusInfo.label}</span>
        <span className="uoc-badge uoc-badge-payment">💰 {paymentInfo.label}</span>
      </div>

      {/* Productos Preview */}
      <div className="uoc-products-preview">
        <div>
          <span>📦 Productos ({pedido.productos.length})</span>
          <span>x{pedido.productos.reduce((sum, prod) => sum + (prod.cantidad || 0), 0)}</span>
        </div>
        <div style={{fontSize: '0.85rem', opacity: 0.8, marginTop: '4px'}}>
          {pedido.productos[0]?.nombre} {pedido.productos[0]?.medidas && `(${pedido.productos[0]?.medidas})`}
          {pedido.productos.length > 1 && ` + ${pedido.productos.length - 1} más`}
        </div>
        {/* Total */}
        {pedido.total && (
          <div style={{fontSize: '0.9rem', fontWeight: '600', marginTop: '6px', textAlign: 'right'}}>
            Total: {formatCurrency(pedido.total)}
          </div>
        )}
      </div>

      {/* Detalles expandidos */}
      <div className="uoc-details">
        {/* Productos completos */}
        <div className="uoc-products">
          <div className="uoc-products-row">
            <span>📦 Productos ({pedido.productos.length})</span>
            <span>x{pedido.productos.reduce((sum, prod) => sum + (prod.cantidad || 0), 0)}</span>
          </div>
          {pedido.productos.map((producto, index) => (
            <div key={index} className="uoc-products-title">
              {producto.nombre} {producto.medidas && `(${producto.medidas})`} x{producto.cantidad || 1}
            </div>
          ))}
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
}
