// Función simplificada para renderizar tarjetas de pedidos
const renderPedidoCard = (pedido, tipo) => {
  // Información básica común
  let titulo = ''
  let cliente = ''
  let estado = ''
  let fecha = ''
  let monto = 0
  let colorBorde = 'var(--accent-blue)'
  let emoji = '📋'

  if (tipo === 'interno') {
    titulo = `Pedido Interno #${pedido.id}`
    cliente = typeof pedido.cliente === 'string' ? pedido.cliente : (pedido.cliente?.nombre || 'Sin cliente')
    estado = pedido.estado || 'Pendiente'
    fecha = pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-ES') : 'Sin fecha'
    colorBorde = 'var(--accent-blue)'
    emoji = '🏭'

    // Calcular monto total
    if (pedido.productos && Array.isArray(pedido.productos)) {
      monto = pedido.productos.reduce((total, prod) => total + ((prod.precioUnitario || 0) * (prod.cantidad || 0)), 0)
    }
  } else if (tipo === 'produccion') {
    titulo = `Pedido Catálogo #${pedido.id}`
    cliente = pedido.cliente?.nombre || 'Sin cliente'
    estado = 'En Producción'
    fecha = pedido.fechaProduccionCalendario ? new Date(pedido.fechaProduccionCalendario).toLocaleDateString('es-ES') : 'Sin fecha'
    colorBorde = '#FF6B35'
    emoji = '🏭'
    monto = pedido.total || 0
  } else if (tipo === 'entrega') {
    titulo = `Pedido Catálogo #${pedido.id}`
    cliente = pedido.cliente?.nombre || 'Sin cliente'
    estado = 'Para Entrega'
    fecha = pedido.fechaEntregaCalendario ? new Date(pedido.fechaEntregaCalendario).toLocaleDateString('es-ES') : 'Sin fecha'
    colorBorde = '#28A745'
    emoji = '📦'
    monto = pedido.total || 0
  }

  return (
    <div
      key={`${tipo}-${pedido.id}`}
      style={{
        padding: '16px',
        backgroundColor: 'var(--bg-card)',
        border: `2px solid ${colorBorde}`,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '12px'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Header con emoji y título */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
        <h4 style={{
          margin: 0,
          color: 'var(--text-primary)',
          fontSize: '1rem',
          fontWeight: '600'
        }}>
          {titulo}
        </h4>
      </div>

      {/* Información principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: '4px'
          }}>
            👤 {cliente}
          </div>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: '4px'
          }}>
            📅 {fecha}
          </div>
          <div style={{
            color: colorBorde,
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {estado}
          </div>
        </div>

        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            color: colorBorde
          }}>
            {formatCurrency(monto)}
          </div>
        </div>
      </div>
    </div>
  )
}