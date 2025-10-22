import styles from '../styles/pedidos-catalogo.module.css'

// Función auxiliar para convertir tiempo HH:MM:SS a minutos
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  const seconds = parseInt(parts[2]) || 0
  return hours * 60 + minutes + Math.ceil(seconds / 60)
}

// Función auxiliar para convertir minutos a HH:MM
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export default function PedidoCard({ pedido, onClick, formatCurrency, formatDate, getStatusEmoji, getStatusLabel, getPaymentLabel, getProductThumbnail, formatFechaEntrega, formatFechaProduccion }) {
  const thumbnail = getProductThumbnail(pedido)
  const seña = pedido.estadoPago === 'seña_pagada'
    ? (pedido.montoRecibido || pedido.total * 0.5)
    : 0
  const restante = pedido.total - seña

  // Obtener productosBase de localStorage
  let productosBase = []
  if (typeof window !== 'undefined') {
    try {
      productosBase = JSON.parse(localStorage.getItem('productosBase')) || []
    } catch (e) {
      console.warn('Error cargando productosBase:', e)
    }
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
        precioPorMinuto: productoBase.precioPorMinuto || 0
      }
    }

    // Valores por defecto
    return {
      tiempoUnitario: '00:00:00',
      precioPorMinuto: 0
    }
  }

  // Calcular tiempo total de producción
  const tiempoTotalMinutos = pedido.productos.reduce((sum, prod) => {
    const productData = getProductData(prod)
    const tiempoMinutos = timeToMinutes(productData.tiempoUnitario)
    return sum + (tiempoMinutos * (prod.cantidad || 1))
  }, 0)
  const tiempoTotalFormatted = minutesToTime(tiempoTotalMinutos)

  // Calcular costo total por minuto (promedio ponderado)
  const costoTotalPorMinuto = pedido.productos.reduce((sum, prod) => {
    const productData = getProductData(prod)
    if (productData.precioPorMinuto && prod.cantidad) {
      const tiempoMinutos = timeToMinutes(productData.tiempoUnitario)
      return sum + (productData.precioPorMinuto * tiempoMinutos * prod.cantidad)
    }
    return sum
  }, 0)

  return (
    <div
      className={styles.pedidoCard}
      onClick={() => onClick(pedido)}
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
            <span className={styles.placeholder}>
              {pedido.productos && pedido.productos.length > 0 ? pedido.productos[0].nombre || '📦' : '📦'}
            </span>
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

        {/* Información de tiempo de producción */}
        {tiempoTotalMinutos > 0 && (
          <div className={styles.tiempoProduccion}>
            <span>⏱️ Tiempo total: {tiempoTotalFormatted}</span>
            {tiempoTotalMinutos > 0 && (
              <span>({tiempoTotalMinutos} min)</span>
            )}
          </div>
        )}

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
          <span>� Entrega: {formatFechaEntrega(pedido)}</span>
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
}