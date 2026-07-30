import { useState } from 'react'
import styles from '../styles/detalle-pedido.module.css'
import { createToast, formatCurrency } from '../utils/catalogUtils'
import {
  formatInputNumber,
  parseInputNumber,
  formatPedidoDate,
  getPedidoProductData,
  getPedidoMaterialInfo
} from '../utils/pedidosCatalogoDetail'

function buildPromoRows(pedido) {
  const rows = []
  const promos = pedido.appliedPromotions || []
  for (const p of promos) {
    const t = p.type
    let icon, label, amount
    if (t === 'percentage_discount') {
      icon = '🏷'; label = `${p.name}${p.value ? ` (${p.value}%)` : ''}`; amount = p.discount_amount
    } else if (t === 'fixed_price') {
      icon = '🏷'; label = `${p.name} (precio fijo)`; amount = p.discount_amount
    } else if (t === 'buy_x_get_y') {
      icon = '🏷'; label = `${p.name} (2x1)`; amount = p.discount_amount
    } else if (t === 'free_shipping') {
      icon = '🎁'; label = p.name || 'Envío gratis'; amount = null
    } else if (t === 'transfer_discount') {
      icon = '🏦'; label = p.name + (p.value ? ` (${p.value}%)` : ''); amount = p.discount_amount
    } else {
      icon = '🏷'; label = p.name || t; amount = p.discount_amount
    }
    rows.push({ icon, label, amount })
  }
  return rows
}

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  en_produccion: 'En producción',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const METODO_PAGO_LABELS = {
  transferencia: '🏦 Transferencia',
  whatsapp: '💬 WhatsApp',
  mercadopago: '💳 MercadoPago',
  // Compatibilidad con pedidos legacy donde la entrega estaba embebida en metodo_pago
  envio: '🚚 Envío a domicilio',
  retiro: '🏪 Retiro en local',
}

const METODO_ENTREGA_LABELS = {
  envio: '🚚 Envío a domicilio',
  retiro: '🏪 Retiro en local',
}

const SHIPPING_DELIVERY_LABELS = {
  home: 'Domicilio',
  agency: 'Sucursal',
  domicilio: 'Domicilio',
  sucursal: 'Sucursal',
}

const SHIPPING_STATUS_LABELS = {
  quoted: 'Cotizado',
  free: 'Envío gratis',
  to_quote: 'A cotizar',
}

const SHIPPING_IMPORT_STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  imported: 'Importado',
  failed: 'Falló',
  manual_followup: 'Seguimiento manual requerido',
  not_required: 'No requerido',
}

const HISTORIAL_DOT = {
  created: styles.dotCreated,
  estado: styles.dotEstado,
  pago: styles.dotPago,
  fecha: styles.dotFecha,
  nota: styles.dotNota,
  calendario: styles.dotCalendario,
  guardado: styles.dotGuardado,
}

function formatHistorialTime(dateStr) {
  if (!dateStr || typeof window === 'undefined') return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatShippingCost(shipping) {
  if (!shipping) return '—'
  if (shipping.status === 'to_quote') return 'A cotizar'
  if (shipping.status === 'free') return 'Envío gratis'
  if (shipping.cost === null || shipping.cost === undefined) return '—'
  const amount = formatCurrency(Number(shipping.cost || 0))
  return shipping.currency && shipping.currency !== 'ARS' ? `${amount} ${shipping.currency}` : amount
}

function formatShippingImportResult(result) {
  if (!result) return '—'
  if (typeof result === 'string') return result
  if (result.error) return result.error
  const parts = [
    result.shipmentId ? `Envío: ${result.shipmentId}` : null,
    result.status ? `Estado: ${result.status}` : null,
    result.importedAt ? `Importado: ${formatPedidoDate(result.importedAt)}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : JSON.stringify(result)
}

function getShippingLabelUrl(importResult) {
  if (!importResult || typeof importResult !== 'object') return null
  return importResult.labelUrl || null
}

function getQuoteSnapshotCarrierInfo(quoteSnapshot) {
  if (!quoteSnapshot || typeof quoteSnapshot !== 'object') return null
  return {
    logisticType: quoteSnapshot.logisticType || null,
    carrierId: quoteSnapshot.carrierId || null,
    serviceTypeCode: quoteSnapshot.serviceTypeCode || null,
    quoteId: quoteSnapshot.quoteId || null,
  }
}

function isShipmentGenerationEligible(pedido) {
  const shipping = pedido?.shipping
  if (!shipping || pedido?.metodoEntrega !== 'envio') return false
  const isPaid = pedido?.mpPaymentStatus === 'approved' || ['pagado', 'pagado_total'].includes(pedido?.estadoPago)
  return Boolean(
    isPaid &&
    shipping.provider &&
    (shipping.status === 'quoted' || shipping.status === 'free') &&
    ['pending', 'failed'].includes(shipping.importStatus)
  )
}

export default function OrderCatalogDetailView({
  pedido,
  setPedido,
  productosBase = [],
  materiales = [],
  historial = [],
  onChangeEstado,
  onChangeEstadoPago,
  onChangeFechaProduccion,
  onChangeFechaConfirmada,
  onChangeMontoRecibido,
  onSave,
  onDelete,
  onClose,
  onAssignCalendar,
  onContactWhatsApp,
  onContactEmail,
  onDownloadComprobante,
  onAddNota,
  showFooter = true,
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [notaText, setNotaText] = useState('')
  const [generatingShipment, setGeneratingShipment] = useState(false)

  if (!pedido) return null

  const updatePedido = (patch) => setPedido({ ...pedido, ...patch })

  const estadoClass = styles[`status_${pedido.estado}`] || styles.status_pendiente
  const estadoLabel = ESTADO_LABELS[pedido.estado] || pedido.estado

  const historialEventos = historial.filter(h => h.tipo !== 'nota')
  const historialNotas = historial.filter(h => h.tipo === 'nota')
  const isShippingDelivery = pedido.metodoEntrega === 'envio'
  const shipping = pedido.shipping || null
  const shippingAgency = shipping?.agencySnapshot || null
  const shippingDestination = shipping?.destinationSnapshot || null
  const shipmentGenerationEligible = isShipmentGenerationEligible(pedido)

  const handleAddNotaClick = async () => {
    if (!notaText.trim()) return
    if (onAddNota) await onAddNota(notaText.trim())
    setNotaText('')
  }

  const handleGenerateShipment = async () => {
    if (!pedido?.id || generatingShipment) return
    setGeneratingShipment(true)
    try {
      const response = await fetch('/api/admin/shipping/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pedido.id }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'No se pudo generar el envío')

      setPedido({
        ...pedido,
        shipping: {
          ...pedido.shipping,
          ...body.shipping,
        },
      })
      createToast('Envío generado correctamente', 'success')
    } catch (error) {
      createToast(error.message || 'No se pudo generar el envío', 'error')
    } finally {
      setGeneratingShipment(false)
    }
  }

  return (
    <div className={styles.detailPage}>
      {/* ── Header ── */}
      <div className={styles.detailHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Pedido #{pedido.id}</h1>
          <div className={styles.headerMeta}>
            <span className={`${styles.statusBadge} ${estadoClass}`}>{estadoLabel}</span>
            {pedido.fechaCreacion && (
              <span className={styles.fechaCreacionLabel}>
                Realizado el {formatPedidoDate(pedido.fechaCreacion)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.btnAction}
            onClick={onContactWhatsApp}
            title="WhatsApp"
          >
            📱 WhatsApp
          </button>
          <button
            className={styles.btnAction}
            onClick={onContactEmail}
            title="Email"
          >
            📧 Email
          </button>
          <button className={styles.btnAction} disabled title="Próximamente">
            🖨 Imprimir
          </button>
          {showFooter && (
            <button
              className={styles.btnSavePrimary}
              onClick={() => onSave && onSave(pedido)}
            >
              💾 Guardar cambios
            </button>
          )}
          <div className={styles.moreActionsWrapper}>
            <button
              className={styles.btnMoreActions}
              onClick={() => setMoreOpen(o => !o)}
            >
              Más acciones ▾
            </button>
            {moreOpen && (
              <div className={styles.moreActionsDropdown}>
                {onClose && (
                  <button
                    className={styles.dropdownItem}
                    onClick={() => { setMoreOpen(false); onClose() }}
                  >
                    ← Volver a pedidos
                  </button>
                )}
                <button
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onClick={() => { setMoreOpen(false); onDelete && onDelete(pedido) }}
                >
                  🗑 Eliminar pedido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className={styles.detailLayout}>

        {/* ── Columna principal ── */}
        <div className={styles.detailMain}>

          {/* Info cards row */}
          <div className={styles.infoCardsRow}>

            {/* Información del pedido */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>📋</span>
                <h3 className={styles.cardTitle}>Información del pedido</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoGrid}>
                  <span className={styles.infoLabel}>Estado</span>
                  <select
                    value={pedido.estado || 'pendiente'}
                    onChange={e => onChangeEstado ? onChangeEstado(e.target.value) : updatePedido({ estado: e.target.value })}
                    className={styles.infoValueSelect}
                  >
                    {Object.entries(ESTADO_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  <span className={styles.infoLabel}>Fecha</span>
                  <span className={styles.infoValue}>{formatPedidoDate(pedido.fechaCreacion) || '—'}</span>

                  <span className={styles.infoLabel}>N° pedido</span>
                  <span className={styles.infoValue}>#{pedido.id}</span>

                  <span className={styles.infoLabel}>Pago</span>
                  <span className={styles.infoValue}>
                    {METODO_PAGO_LABELS[pedido.metodoPago] || pedido.metodoPago || '—'}
                  </span>

                  <span className={styles.infoLabel}>Entrega</span>
                  <span className={styles.infoValue}>
                    {pedido.metodoEntrega
                      ? (METODO_ENTREGA_LABELS[pedido.metodoEntrega] || pedido.metodoEntrega)
                      : (METODO_ENTREGA_LABELS[pedido.metodoPago] || '—')
                    }
                  </span>

                  {pedido.fechaSolicitudEntrega && (
                    <>
                      <span className={styles.infoLabel}>Entrega solicitada</span>
                      <span className={styles.infoValue}>{formatPedidoDate(pedido.fechaSolicitudEntrega)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>👤</span>
                <h3 className={styles.cardTitle}>Cliente</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.clienteNombreMain}>
                  {pedido.cliente?.nombre} {pedido.cliente?.apellido || ''}
                </div>
                {pedido.cliente?.email && (
                  <div className={styles.clienteEmail}>{pedido.cliente.email}</div>
                )}
                {pedido.cliente?.telefono && (
                  <div className={styles.clienteContactRow}>
                    <span className={styles.clienteContactLabel}>Teléfono</span>
                    <span className={styles.clienteContactVal}>{pedido.cliente.telefono}</span>
                  </div>
                )}
                {pedido.cliente?.direccion && pedido.cliente.direccion !== 'No proporcionada' && !isShippingDelivery && (
                  <div className={styles.clienteContactRow}>
                    <span className={styles.clienteContactLabel}>Dirección</span>
                    <span className={styles.clienteContactVal}>{pedido.cliente.direccion}</span>
                  </div>
                )}
                <div className={styles.clienteActions}>
                  <button className={styles.btnClienteAction} onClick={onContactWhatsApp}>
                    📱 WhatsApp
                  </button>
                  <button className={styles.btnClienteAction} onClick={onContactEmail}>
                    📧 Email
                  </button>
                </div>
              </div>
            </div>

            {/* Shipping address — only when delivery method is shipping */}
            {isShippingDelivery && pedido.cliente?.direccion && pedido.cliente.direccion !== 'No proporcionada' && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardIcon}>📍</span>
                  <h3 className={styles.cardTitle}>Dirección de envío</h3>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.clienteNombreMain}>
                    {pedido.cliente.nombre} {pedido.cliente.apellido || ''}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.5 }}>
                    {pedido.cliente.direccion}
                  </div>
                </div>
              </div>
            )}
          </div>

          {shipping && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>🚚</span>
                <h3 className={styles.cardTitle}>Envío</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoGrid}>
                  <span className={styles.infoLabel}>Proveedor</span>
                  <span className={styles.infoValue}>{shipping.provider || '—'}</span>

                  <span className={styles.infoLabel}>Servicio</span>
                  <span className={styles.infoValue}>{shipping.serviceName || shipping.serviceCode || '—'}</span>

                  <span className={styles.infoLabel}>Tipo de entrega</span>
                  <span className={styles.infoValue}>{SHIPPING_DELIVERY_LABELS[shipping.deliveryType] || shipping.deliveryType || '—'}</span>

                  <span className={styles.infoLabel}>Costo</span>
                  <span className={styles.infoValue}>
                    {formatShippingCost(shipping)}
                    {pedido.envioGratis && (
                      <span style={{ marginLeft: 8, fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        🎁 Envío gratis
                      </span>
                    )}
                  </span>

                  <span className={styles.infoLabel}>Moneda</span>
                  <span className={styles.infoValue}>{shipping.currency || 'ARS'}</span>

                  <span className={styles.infoLabel}>Estado</span>
                  <span className={styles.infoValue}>{SHIPPING_STATUS_LABELS[shipping.status] || shipping.status || '—'}</span>

                  <span className={styles.infoLabel}>Importación</span>
                  <span className={styles.infoValue}>{SHIPPING_IMPORT_STATUS_LABELS[shipping.importStatus] || shipping.importStatus || '—'}</span>

                  {shipping.trackingNumber && (
                    <>
                      <span className={styles.infoLabel}>Tracking</span>
                      <span className={styles.infoValue}>{shipping.trackingNumber}</span>
                    </>
                  )}

                  {shippingAgency && (
                    <>
                      <span className={styles.infoLabel}>Sucursal</span>
                      <span className={styles.infoValue}>
                        {[shippingAgency.name, shippingAgency.address, shippingAgency.city, shippingAgency.postalCode].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </>
                  )}

                  {shippingDestination && (
                    <>
                      <span className={styles.infoLabel}>Destino</span>
                      <span className={styles.infoValue}>
                        {[shippingDestination.address, shippingDestination.city, shippingDestination.provinceCode, shippingDestination.postalCode].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </>
                  )}

                  <span className={styles.infoLabel}>Resultado importación</span>
                  <span className={styles.infoValue}>{formatShippingImportResult(shipping.importResult)}</span>

                  {(() => {
                    const labelUrl = getShippingLabelUrl(shipping.importResult)
                    return labelUrl ? (
                      <>
                        <span className={styles.infoLabel}>Etiqueta</span>
                        <span className={styles.infoValue}>
                          <a
                            href={labelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-color, #2563eb)', textDecoration: 'underline', fontWeight: 600 }}
                          >
                            📄 Descargar etiqueta
                          </a>
                        </span>
                      </>
                    ) : null
                  })()}

                  {(() => {
                    const carrierInfo = getQuoteSnapshotCarrierInfo(shipping.quoteSnapshot)
                    return carrierInfo && (carrierInfo.logisticType || carrierInfo.carrierId) ? (
                      <>
                        <span className={styles.infoLabel}>Tipo logístico</span>
                        <span className={styles.infoValue}>{carrierInfo.logisticType || '—'}</span>
                        {carrierInfo.carrierId && (
                          <>
                            <span className={styles.infoLabel}>Carrier ID</span>
                            <span className={styles.infoValue} style={{ fontSize: 12, fontFamily: 'monospace' }}>{carrierInfo.carrierId}</span>
                          </>
                        )}
                      </>
                    ) : null
                  })()}
                </div>

                {/* Items incluidos en el envío */}
                {shipping.importStatus === 'imported' && pedido.productos?.length > 0 && (
                  <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 6, border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                      📦 Productos incluidos en el envío
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {pedido.productos.length} producto(s) — {pedido.productos.reduce((sum, p) => sum + Number(p.cantidad || 1), 0)} unidad(es)
                    </div>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {pedido.productos.map((prod, idx) => (
                        <li key={idx}>
                          {prod.nombre}
                          {prod.medidas ? ` (${prod.medidas})` : ''}
                          {' '}× {prod.cantidad || 1}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {shipmentGenerationEligible && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      className={styles.btnSavePrimary}
                      onClick={handleGenerateShipment}
                      disabled={generatingShipment}
                    >
                      {generatingShipment ? 'Generando envío...' : 'Generar envío en Zipnova'}
                    </button>
                  </div>
                )}

                {(shipping.manualFollowupRequired || shipping.importStatus === 'imported') && (
                  <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    <strong>Seguimiento manual:</strong> revisar en el proveedor de envío la etiqueta, impresión, pegado en el paquete y despacho físico. La generación no confirma que esos pasos ya estén realizados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Productos del pedido */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>📦</span>
              <h3 className={styles.cardTitle}>
                Productos del pedido ({pedido.productos?.length || 0})
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.productsTable}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className={styles.colRight}>Precio unitario</th>
                    <th className={styles.colRight}>Cantidad</th>
                    <th className={styles.colRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(pedido.productos || []).map((prod, idx) => {
                    const productData = getPedidoProductData(prod, productosBase)
                    const materialInfo = productData.material
                      ? getPedidoMaterialInfo(materiales, productData.material, productData.materialId)
                      : null
                    const imgSrc = prod.imagen
                      || productosBase.find(p => p.id === prod.productId || p.id === prod.idProducto)?.imagen
                      || null

                    return (
                      <tr key={idx}>
                        <td>
                          <div className={styles.productCell}>
                            {imgSrc ? (
                              <img src={imgSrc} alt={prod.nombre} className={styles.productThumb} />
                            ) : (
                              <div className={styles.productThumbPlaceholder}>📦</div>
                            )}
                            <div>
                              <div className={styles.productName}>{prod.nombre}</div>
                              {prod.medidas && (
                                <div className={styles.productMedidas}>{prod.medidas}</div>
                              )}
                              {productData.tiempoUnitario && productData.tiempoUnitario !== '00:00:00' && (
                                <div className={styles.productTiempo}>⏱ {productData.tiempoUnitario}</div>
                              )}
                              {materialInfo && (
                                <div className={styles.productsMaterial}>
                                  {materialInfo.nombre} · {materialInfo.tipo} · {materialInfo.espesor || 'N/A'}mm
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={styles.colRight}>
                          {formatCurrency(prod.precioUnitario)}
                        </td>
                        <td className={styles.colRight}>{prod.cantidad}</td>
                        <td className={styles.colRight}>
                          {formatCurrency(prod.subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totales debajo de la tabla */}
              <div className={styles.tableTotalsRow}>
                <div className={styles.tableTotals} style={{ padding: '0 12px 14px' }}>
                  <div className={styles.totalRow}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(pedido.subtotal)}</span>
                  </div>
                  {pedido.descuento > 0 && (
                    <div className={`${styles.totalRow} ${styles.totalRowDiscount}`}>
                      <span>Descuento total</span>
                      <span>-{formatCurrency(pedido.descuento)}</span>
                    </div>
                  )}
                  <div className={styles.totalRowFinal}>
                    <span>Total</span>
                    <span>{formatCurrency(pedido.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fechas + Notas */}
          <div className={styles.bottomRow}>

            {/* Fechas */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>📅</span>
                <h3 className={styles.cardTitle}>Fechas de producción y entrega</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.fechasGrid}>
                  <div className={styles.fechaItem}>
                    <span className={styles.fechaItemLabel}>Fecha de producción</span>
                    <input
                      type="date"
                      value={pedido.fechaProduccion || ''}
                      onChange={e => onChangeFechaProduccion
                        ? onChangeFechaProduccion(e.target.value || '')
                        : updatePedido({ fechaProduccion: e.target.value || '', fechaProduccionCalendario: e.target.value || null })
                      }
                      className={styles.dateInputNew}
                    />
                  </div>
                  <div className={styles.fechaItem}>
                    <span className={styles.fechaItemLabel}>Entrega confirmada</span>
                    <input
                      type="date"
                      value={pedido.fechaConfirmadaEntrega || ''}
                      onChange={e => onChangeFechaConfirmada
                        ? onChangeFechaConfirmada(e.target.value || '')
                        : updatePedido({ fechaConfirmadaEntrega: e.target.value || '' })
                      }
                      className={styles.dateInputNew}
                    />
                  </div>
                  {pedido.asignadoAlCalendario ? (
                    <div className={styles.calendarBadge}>✓ Asignado al calendario</div>
                  ) : pedido.estado === 'confirmado' ? (
                    <button
                      className={styles.btnAssignCalendar}
                      onClick={() => onAssignCalendar && onAssignCalendar(pedido)}
                    >
                      📅 Asignar al calendario
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Notas internas */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>📝</span>
                <h3 className={styles.cardTitle}>Notas internas</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.notasContainer}>
                  {historialNotas.length > 0 ? (
                    historialNotas.map((n, i) => (
                      <div key={i} className={styles.notaEntry}>
                        <div className={styles.notaEntryMeta}>
                          {formatHistorialTime(n.created_at)} · {n.autor}
                        </div>
                        <div className={styles.notaEntryText}>{n.descripcion}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Sin notas aún.
                    </p>
                  )}
                  <div className={styles.notaInputWrapper}>
                    <textarea
                      className={styles.notaTextarea}
                      placeholder="Escribir nota interna..."
                      value={notaText}
                      onChange={e => setNotaText(e.target.value)}
                    />
                    <button
                      className={styles.btnAgregarNota}
                      onClick={handleAddNotaClick}
                      disabled={!notaText.trim()}
                    >
                      Agregar nota
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.detailSidebar}>

          {/* Resumen del pedido */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>Resumen del pedido</div>
            <div className={styles.sidebarCardBody}>
              <div className={styles.resumenRow}>
                <span>Subtotal ({pedido.productos?.length || 0} productos)</span>
                <span>{formatCurrency(pedido.subtotal)}</span>
              </div>
              {buildPromoRows(pedido).map((row, i) => (
                <div key={`sb-${i}`} className={`${styles.resumenRow} ${styles.resumenRowDiscount}`}>
                  <span style={{ color: '#dc2626' }}>{row.icon} {row.label}</span>
                  <span style={{ color: '#dc2626' }}>{row.amount !== null ? `-${formatCurrency(row.amount)}` : '—'}</span>
                </div>
              ))}
              {pedido.descuento > 0 && (
                <div className={`${styles.resumenRow} ${styles.resumenRowDiscount}`}>
                  <span>Descuento total</span>
                  <span>-{formatCurrency(pedido.descuento)}</span>
                </div>
              )}
              {(pedido.cuponCodigo || (pedido.descuento > 0 && pedido.cuponTipo)) && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, padding: '0 12px' }}>
                  {pedido.cuponCodigo ? <>Cupón: <strong>{pedido.cuponCodigo}</strong></> : 'Cupón aplicado'}
                  {pedido.cuponTipo === 'porcentaje' && pedido.cuponValor ? ` (${pedido.cuponValor}% off)` : ''}
                  {pedido.cuponTipo === 'monto_fijo' && pedido.cuponValor ? ` ($${formatInputNumber(pedido.cuponValor)} off)` : ''}
                </div>
              )}
              <div className={styles.resumenRowTotal}>
                <span>Total</span>
                <span>{formatCurrency(pedido.total || 0)}</span>
              </div>

              <div className={styles.resumenDivider} />

              {/* Método de pago */}
              <div>
                <div className={styles.resumenLabel}>Método de pago</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {METODO_PAGO_LABELS[pedido.metodoPago] || pedido.metodoPago || '—'}
                </div>
              </div>

              {/* Estado de pago */}
              <div>
                <div className={styles.resumenLabel}>Estado de pago</div>
                {pedido.metodoPago === 'mercadopago' ? (
                  <div className={styles.mpStatusText}>
                    {pedido.mpPaymentStatus === 'approved' ? '✓ Aprobado' :
                     pedido.mpPaymentStatus === 'rejected' ? '✗ Rechazado' :
                     pedido.mpPaymentStatus === 'pending'  ? '⏳ Pendiente' :
                     pedido.estadoPago === 'pendiente_mp'  ? '⏳ Esperando confirmación' : '—'}
                  </div>
                ) : (
                  <div className={styles.pagoSelectWrapper}>
                    <select
                      value={pedido.estadoPago || 'sin_seña'}
                      onChange={e => onChangeEstadoPago
                        ? onChangeEstadoPago(e.target.value)
                        : updatePedido({ estadoPago: e.target.value })
                      }
                      className={styles.pagoSelect}
                    >
                      <option value="sin_seña">Sin seña</option>
                      <option value="seña_pagada">Seña pagada</option>
                      <option value="pagado_total">Pagado total</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Monto recibido — solo si no es MP */}
              {pedido.metodoPago !== 'mercadopago' && (
                <div>
                  <div className={styles.resumenLabel}>
                    {Number(pedido.montoRecibido || 0) > 0 ? 'Monto recibido' : 'Registrar seña / monto recibido'}
                  </div>
                  <div className={styles.montoInputRow}>
                    <span className={styles.montoPrefix}>$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={formatInputNumber(pedido.montoRecibido)}
                      onChange={e => onChangeMontoRecibido
                        ? onChangeMontoRecibido(parseInputNumber(e.target.value))
                        : updatePedido({ montoRecibido: parseInputNumber(e.target.value) })
                      }
                      className={styles.montoInputNew}
                    />
                  </div>
                </div>
              )}

              {/* MP payment id */}
              {pedido.metodoPago === 'mercadopago' && pedido.mpPaymentId && (
                <div>
                  <div className={styles.resumenLabel}>ID de pago MP</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {pedido.mpPaymentId}
                  </div>
                </div>
              )}

              {/* Comprobante */}
              {pedido.comprobante && (
                <button
                  className={styles.btnComprobante}
                  onClick={() => onDownloadComprobante && onDownloadComprobante(pedido)}
                >
                  🧾 Ver comprobante
                </button>
              )}
            </div>
          </div>

          {/* Historial del pedido */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHeader}>Historial del pedido</div>
            <div className={styles.sidebarCardBody}>
              {historialEventos.length === 0 ? (
                <div className={styles.historialEmpty}>Sin eventos registrados.</div>
              ) : (
                <div className={styles.historialList}>
                  {historialEventos.map((ev, i) => (
                    <div key={i} className={styles.historialEntry}>
                      <div className={`${styles.historialDot} ${HISTORIAL_DOT[ev.tipo] || styles.dotGuardado}`} />
                      <div className={styles.historialContent}>
                        <span className={styles.historialTime}>{formatHistorialTime(ev.created_at)}</span>
                        <span className={styles.historialDesc}>{ev.descripcion}</span>
                        <span className={styles.historialAutor}>por {ev.autor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
