import { formatCurrency } from '../utils/catalogUtils'

export default function UserOrderCard({ pedido, onClick }) {
  // Obtener thumbnail del primer producto
  const thumbnail = pedido.productos && pedido.productos.length > 0 && pedido.productos[0].imagen
    ? pedido.productos[0].imagen
    : null

  // Formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  // Mapeo de estados
  const getStatusInfo = (estado) => {
    const statusMap = {
      'pendiente': { emoji: '⏳', label: 'Pendiente', color: '#f59e0b' },
      'confirmado': { emoji: '✅', label: 'Confirmado', color: '#3b82f6' },
      'en_preparacion': { emoji: '🔨', label: 'En Preparación', color: '#8b5cf6' },
      'listo': { emoji: '📦', label: 'Listo para Entrega', color: '#10b981' },
      'entregado': { emoji: '🎉', label: 'Entregado', color: '#059669' },
      'cancelado': { emoji: '❌', label: 'Cancelado', color: '#ef4444' }
    }
    return statusMap[estado] || statusMap['pendiente']
  }

  // Mapeo de pagos
  const getPaymentInfo = (estadoPago) => {
    const paymentMap = {
      'sin_seña': { label: 'Sin Seña', color: '#ef4444' },
      'seña_pagada': { label: 'Seña Pagada', color: '#f59e0b' },
      'pagado': { label: 'Pagado', color: '#10b981' }
    }
    return paymentMap[estadoPago] || paymentMap['sin_seña']
  }

  const statusInfo = getStatusInfo(pedido.estado)
  const paymentInfo = getPaymentInfo(pedido.estadoPago)

  // Calcular seña y restante
  const seña = pedido.estadoPago === 'seña_pagada'
    ? (pedido.montoRecibido || pedido.total * 0.5)
    : 0
  const restante = pedido.total - seña

  return (
    <div
      onClick={() => onClick && onClick(pedido)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: '20px',
        alignItems: 'start',
        '&:hover': {
          transform: onClick ? 'translateY(-2px)' : 'none',
          boxShadow: onClick ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none'
        }
      }}
    >
      {/* Columna izquierda: ID y thumbnail */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        alignItems: 'center',
        minWidth: '100px'
      }}>
        <div style={{
          background: 'var(--bg-section)',
          padding: '8px 12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <strong style={{ 
            fontSize: '1.1rem', 
            color: 'var(--text-primary)' 
          }}>
            #{pedido.id}
          </strong>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginTop: '4px'
          }}>
            {formatDate(pedido.fechaCreacion)}
          </div>
        </div>
        
        {thumbnail && (
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid var(--border-color)'
          }}>
            <img 
              src={thumbnail} 
              alt="Producto" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        )}
      </div>

      {/* Columna central: Info principal */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        flex: 1
      }}>
        {/* Badges de estado */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: statusInfo.color + '20',
            color: statusInfo.color,
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            {statusInfo.emoji} {statusInfo.label}
          </span>
          
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: paymentInfo.color + '20',
            color: paymentInfo.color,
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            💳 {paymentInfo.label}
          </span>
        </div>

        {/* Productos */}
        <div style={{
          background: 'var(--bg-section)',
          padding: '12px',
          borderRadius: '8px'
        }}>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            marginBottom: '8px',
            fontWeight: 600
          }}>
            📦 Productos ({pedido.productos.length})
          </div>
          {pedido.productos.map((prod, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                borderBottom: idx < pedido.productos.length - 1 ? '1px solid var(--border-color)' : 'none'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                  {prod.nombre} {prod.medidas && `(${prod.medidas})`}
                </div>
              </div>
              <span style={{ fontWeight: 600, marginLeft: '12px' }}>
                x{prod.cantidad}
              </span>
            </div>
          ))}
        </div>

        {/* Fechas */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap'
        }}>
          {pedido.fechaSolicitudEntrega && (
            <span>
              📅 Entrega: <strong style={{ color: 'var(--text-primary)' }}>
                {formatDate(pedido.fechaSolicitudEntrega)}
              </strong>
            </span>
          )}
          {pedido.metodoPago && (
            <span>
              💳 Método: <strong style={{ color: 'var(--text-primary)' }}>
                {pedido.metodoPago === 'transferencia' ? 'Transferencia' : 
                 pedido.metodoPago === 'whatsapp' ? 'WhatsApp' : 
                 pedido.metodoPago === 'retiro' ? 'Retiro en Local' : 
                 pedido.metodoPago}
              </strong>
            </span>
          )}
        </div>

        {/* Resumen financiero para seña */}
        {pedido.estadoPago === 'seña_pagada' && (
          <div style={{
            display: 'flex',
            gap: '16px',
            padding: '8px 12px',
            background: 'var(--bg-section)',
            borderRadius: '6px',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              💵 Seña: <strong style={{ color: '#10b981' }}>
                {formatCurrency(seña)}
              </strong>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              💰 Restante: <strong style={{ color: '#f59e0b' }}>
                {formatCurrency(restante)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Columna derecha: Total */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
      }}>
        <div style={{
          background: 'var(--bg-section)',
          padding: '12px 16px',
          borderRadius: '8px',
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginBottom: '4px'
          }}>
            TOTAL
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--accent-color)',
            whiteSpace: 'nowrap'
          }}>
            {formatCurrency(pedido.total)}
          </div>
        </div>
      </div>
    </div>
  )
}
