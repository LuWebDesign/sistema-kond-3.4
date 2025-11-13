import styles from '../styles/pedidos-catalogo.module.css'

// Función auxiliar para convertir tiempo HH:MM:SS a segundos
const timeToSeconds = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  const seconds = parseInt(parts[2]) || 0
  return hours * 3600 + minutes * 60 + seconds
}

// Función auxiliar para convertir segundos a HH:MM:SS
const secondsToHHMMSS = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function PedidoCard({ pedido, onClick, formatCurrency, formatDate, getStatusEmoji, getStatusLabel, getPaymentLabel, getProductThumbnail, formatFechaEntrega, formatFechaProduccion, tiempoProduccion }) {
  // Calcular monto recibido estimado y restante
  const recibido = Number(pedido.montoRecibido || 0) || (pedido.estadoPago === 'seña_pagada' ? (Number(pedido.total || 0) * 0.5) : (pedido.estadoPago === 'pagado_total' ? Number(pedido.total || 0) : 0))
  const seña = pedido.estadoPago === 'seña_pagada' ? recibido : 0
  const restante = Math.max(0, Number(pedido.total || 0) - recibido)

  // Funciones auxiliares para clases de badges
  const getStatusBadgeClass = (estado) => {
    switch (estado) {
      case 'entregado': return 'entregado'
      case 'listo': return 'listo'
      case 'en_preparacion':
      case 'confirmado': return 'en-proceso'
      case 'pendiente': return 'pendiente'
      default: return 'default'
    }
  }

  const getPaymentBadgeClass = (estadoPago) => {
    switch (estadoPago) {
      case 'pagado_total':
      case 'pagado': return 'pagado-total'
      case 'seña_pagada': return 'seña-pagada'
      default: return 'sin-seña'
    }
  }

  // Obtener productosBase de localStorage
  let productosBase = []
  if (typeof window !== 'undefined') {
    try {
      productosBase = JSON.parse(localStorage.getItem('productosBase')) || []
    } catch (e) {
      console.warn('Error cargando productosBase:', e)
    }
  }

  // Función para obtener thumbnail de un producto específico
  const getProductThumbnailIndividual = (prod) => {
    const productBase = productosBase.find(p => p.id === prod.productId || p.id === prod.idProducto)
    return productBase?.imagen || null
  }

  // Función para obtener datos del producto desde productosBase
  const getProductData = (prod) => {
    // Si el producto ya tiene los datos, usarlos directamente (vienen de Supabase)
    if (prod.tiempoUnitario) {
      return {
        tiempoUnitario: prod.tiempoUnitario,
        precioPorMinuto: prod.precioPorMinuto || 0,
        material: prod.material || null,
        materialId: prod.materialId || null,
        espesor: prod.espesor || null
      }
    }

    // Solo si no tiene datos, buscar en productosBase (fallback)
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
    // Acceder a materials desde localStorage
    const materials = JSON.parse(localStorage.getItem('materiales') || '[]')
    
    // Primero intentar por materialId
    if (materialId) {
      const material = materials.find(m => String(m.id) === String(materialId))
      if (material) return material
    }
    
    // Si no hay materialId, intentar por nombre (para compatibilidad con productos antiguos)
    if (materialName) {
      const material = materials.find(m => m.nombre === materialName)
      if (material) return material
    }
    
    return null
  }

  // Calcular tiempo total de producción (en segundos) y formatear a HH:MM:SS
  const tiempoTotalSegundos = pedido.productos.reduce((sum, prod) => {
    const productData = getProductData(prod)
    const tiempoSeg = timeToSeconds(productData.tiempoUnitario)
    return sum + (tiempoSeg * (prod.cantidad || 1))
  }, 0)
  const tiempoTotalFormatted = secondsToHHMMSS(tiempoTotalSegundos)
  
  // Log para depuración (solo primero para no saturar consola)
  // if (pedido.id && pedido.productos.length > 0) {
  //   console.log(`📊 Pedido #${pedido.id} - Tiempo total: ${tiempoTotalFormatted}`, 
  //     pedido.productos.map(p => ({ nombre: p.nombre, tiempo: p.tiempoUnitario })))
  // }

  // Handler para abrir el modal (centralizado) y accesibilidad por teclado
  const openModal = (e) => {
    // permitir llamadas externas seguras
    if (typeof onClick === 'function') onClick(pedido)
  }

  const handleKeyDown = (e) => {
    // activar con Enter o Space
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (typeof onClick === 'function') onClick(pedido)
    }
  }

  // Calcular costo total por minuto (promedio ponderado)
  const costoTotalPorMinuto = pedido.productos.reduce((sum, prod) => {
    const productData = getProductData(prod)
    if (productData.precioPorMinuto && prod.cantidad) {
      const tiempoSeg = timeToSeconds(productData.tiempoUnitario)
      const tiempoMinutos = tiempoSeg / 60
      return sum + (productData.precioPorMinuto * tiempoMinutos * prod.cantidad)
    }
    return sum
  }, 0)

  // Fecha de entrega: preferir fecha de entrega confirmada / calendario, sino fecha solicitada
  const entregaDate = pedido.fechaEntregaCalendario || pedido.fechaConfirmadaEntrega || pedido.fechaSolicitudEntrega || null
  const entregaLabel = (pedido.fechaConfirmadaEntrega || pedido.fechaEntregaCalendario) ? 'Entrega confirmada:' : 'Entrega solicitada:'

  // Fecha de producción: preferir fechaProduccionCalendario o fechaProduccion
  const produccionDate = pedido.fechaProduccionCalendario || pedido.fechaProduccion || null

  return (
    <div
      className={styles.pedidoCard}
    >
      {/* Header con miniatura (izquierda), cliente (centro) y total/fecha (derecha) */}
  <div className={styles.pedidoHeader} onClick={openModal} role="button" tabIndex={0} onKeyDown={handleKeyDown} style={{ cursor: 'pointer' }}>
        {/* miniatura removida del header por petición (imagen previa) */}

          <div className={styles.pedidoHeaderMain}>
          <div className={styles.pedidoIdLine}>
            <strong>{pedido.nroPedido ? pedido.nroPedido : `N°${pedido.id}`}</strong>
            <div className={styles.clienteNombreHead}>{pedido.cliente?.nombre} {pedido.cliente?.apellido || ''}</div>
          </div>
          {/* tarjeta de estado: estado del pedido + estado de pago (reemplaza badge 'Asignado al calendario') */}
          <div className={styles.statusCard}>
            <div className={`${styles.statusBadge} ${styles.smallBadge} ${styles[getStatusBadgeClass(pedido.estado)] || ''}`}>{getStatusLabel(pedido.estado)}</div>
            <div className={`${styles.paymentBadge} ${styles.smallBadge} ${styles[getPaymentBadgeClass(pedido.estadoPago)] || ''}`}>{getPaymentLabel(pedido.estadoPago, pedido)}</div>
          </div>
        </div>

        <div className={styles.pedidoHeaderRight}>
          <div className={styles.fechaCreacion}>{formatDate(pedido.fechaCreacion)}</div>

          <div className={styles.headerDates}>
            <div className={styles.fechaInfo}>
              <small className={styles.metaLabel}>Producción:</small>
              <div>{produccionDate ? formatDate(produccionDate) : 'Sin asignar'}</div>
            </div>

            <div className={styles.fechaInfo}>
              <small className={styles.metaLabel}>Entrega:</small>
              <div>{entregaDate ? formatDate(entregaDate) : 'Sin confirmar'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.pedidoContent}>
        <div className={styles.pedidoMain}>
          {/* Productos compactos: nombre + unidades, medidas y material en la misma línea */}
          <div className={styles.productosPreview}>
            {pedido.productos && pedido.productos.length > 0 ? (
              <div className={styles.productosListCompact}>
                {pedido.productos.slice(0, 3).map((prod, index) => {
                  const productData = getProductData(prod)
                  const materialInfo = productData?.material ? getMaterialInfo(productData.material, productData.materialId) : null
                  return (
                    <div key={index} className={styles.productoItemCompact}>
                      <div className={styles.productoLine}>
                        <div className={styles.productoLineLeft}>
                          <span className={styles.productoNombreCompact}>{prod.nombre}</span>
                          <span className={styles.productoUnidades}>×{prod.cantidad || 1}</span>
                          {prod.medidas && <span className={styles.productoMedidas}>· {prod.medidas}</span>}
                          {materialInfo ? (
                            <span className={styles.productoMaterialCompact}>· Material: {materialInfo.nombre} • {materialInfo.tipo} • {materialInfo.espesor || 'N/A'}mm</span>
                          ) : (productData?.material && (
                            <span className={styles.productoMaterialCompact}>· {productData.material}{productData.espesor ? ` (${productData.espesor}mm)` : ''}</span>
                          ))}
                        </div>

                        <div className={styles.productoLineRight}>
                          <div className={styles.precioUnitWrap}>
                            <div className={styles.precioUnitSmallLabel}>Precio unitario</div>
                            <div className={styles.precioUnitSmall}>{formatCurrency(prod.precioUnitario)}</div>
                          </div>
                        </div>
                      </div>
                      {/* ocultamos el tiempo por producto aquí para evitar duplicados con el tiempo total; si se quiere mostrar, usar tooltip o detalle */}
                    </div>
                  )
                })}

                {pedido.productos.length > 3 && (
                  <div className={styles.productosMas}>+{pedido.productos.length - 3} más</div>
                )}
              </div>
            ) : (
              <div className={styles.sinProductos}>Sin productos</div>
            )}
          </div>

          {/* Línea de producción / tiempo total */}
          <div className={styles.productionLine}>
            <div className={styles.productionLabel}>Tiempo de corte</div>
            <div className={styles.productionValue}>⏱ {tiempoTotalFormatted}</div>
              {/* fechas mostradas en el header; se eliminan aquí para evitar duplicado */}
          </div>
        </div>

        <div className={styles.pedidoRightSummary}>
          {/* información financiera compacta: Total, Seña, Restante */}
          <div className={`${styles.totalFloatingRight} ${styles.restanteSmall}`} aria-hidden="false">
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalAmount}>{formatCurrency(pedido.total)}</span>
          </div>
          <div className={`${styles.señaInfoSmall} ${styles.restanteSmall}`}><span>Seña: {formatCurrency(seña || 0)}</span></div>
          <div className={styles.restanteSmall}><span>Restante: {formatCurrency(restante)}</span></div>
        </div>
      </div>

      <div className={styles.actionGroup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.actionButton} onClick={(e) => { e.stopPropagation(); if (typeof onClick === 'function') onClick(pedido) }}>Ver</button>
      </div>
    </div>
  )
}