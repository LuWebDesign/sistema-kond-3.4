import { useState } from 'react'
import styles from '../styles/detalle-pedido.module.css'
import { formatCurrency } from '../utils/catalogUtils'
import {
  formatInputNumber,
  parseInputNumber,
  formatPedidoDate,
  getPedidoProductData,
  getPedidoMaterialInfo
} from '../utils/pedidosCatalogoDetail'

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

  if (!pedido) return null

  const updatePedido = (patch) => setPedido({ ...pedido, ...patch })

  const estadoClass = styles[`status_${pedido.estado}`] || styles.status_pendiente
  const estadoLabel = ESTADO_LABELS[pedido.estado] || pedido.estado

  const historialEventos = historial.filter(h => h.tipo !== 'nota')
  const historialNotas = historial.filter(h => h.tipo === 'nota')

  const handleAddNotaClick = async () => {
    if (!notaText.trim()) return
    if (onAddNota) await onAddNota(notaText.trim())
    setNotaText('')
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
                {pedido.cliente?.direccion && pedido.cliente.direccion !== 'No proporcionada' && pedido.metodoPago !== 'envio' && (
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

            {/* Dirección de envío — solo si método es envío */}
            {pedido.metodoPago === 'envio' && pedido.cliente?.direccion && pedido.cliente.direccion !== 'No proporcionada' && (
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
                  {pedido.envioGratis && (
                    <div className={`${styles.totalRow} ${styles.totalRowDiscount}`}>
                      <span>🎁 Envío gratis</span>
                      <span>—</span>
                    </div>
                  )}
                  {pedido.descuento > 0 && (
                    <div className={`${styles.totalRow} ${styles.totalRowDiscount}`}>
                      <span>
                        {pedido.cuponCodigo
                          ? `🏷 Cupón ${pedido.cuponCodigo}`
                          : '🏷 Descuento'}
                      </span>
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
              {pedido.envioGratis && (
                <div className={`${styles.resumenRow} ${styles.resumenRowDiscount}`}>
                  <span>🎁 Envío gratis</span>
                  <span>—</span>
                </div>
              )}
              {pedido.descuento > 0 && (
                <div className={`${styles.resumenRow} ${styles.resumenRowDiscount}`}>
                  <span>
                    {pedido.cuponCodigo
                      ? `🏷 Cupón ${pedido.cuponCodigo}`
                      : '🏷 Descuento'}
                  </span>
                  <span>-{formatCurrency(pedido.descuento)}</span>
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
