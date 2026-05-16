import styles from '../styles/pedidos-catalogo.module.css'
import { formatCurrency } from '../utils/catalogUtils'
import {
  formatInputNumber,
  parseInputNumber,
  formatPedidoDate,
  getPedidoProductData,
  getPedidoMaterialInfo
} from '../utils/pedidosCatalogoDetail'

export default function OrderCatalogDetailView({
  pedido,
  setPedido,
  productosBase = [],
  materiales = [],
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
  showFooter = true,
}) {
  if (!pedido) return null

  const updatePedido = (patch) => setPedido({ ...pedido, ...patch })

  return (
    <div className={styles.modalContentNew} style={{ width: '100%', maxWidth: 1200, margin: 0 }}>
      <div className={styles.modalHeaderNew}>
        <div className={styles.headerTop}>
          <div className={styles.headerIdBadge}>
            <span className={styles.pedidoIdTag}>#{pedido.id}</span>
            <span className={styles.metodoPagoBadge}>
              {pedido.metodoPago === 'transferencia' ? '🏦 Transferencia' : pedido.metodoPago === 'envio' ? '🚚 Envío' : pedido.metodoPago === 'whatsapp' ? '💬 WhatsApp' : '🏪 Retiro'}
            </span>
          </div>
          {onClose && <button onClick={onClose} className={styles.closeBtnNew}>×</button>}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.clienteMain}>
            <span className={styles.clienteNombre}>{pedido.cliente?.nombre} {pedido.cliente?.apellido || ''}</span>
            <span className={styles.clienteContacto}>{pedido.cliente?.telefono} · {pedido.cliente?.email || 'Sin email'}</span>
          </div>
          <div className={styles.contactActions}>
            <button onClick={onContactWhatsApp} className={styles.btnWhatsApp} title="WhatsApp">📱</button>
            <button onClick={onContactEmail} className={styles.btnEmail} title="Email">📧</button>
          </div>
        </div>
      </div>

      <div className={styles.modalBodyNew}>
        <div className={styles.estadosGrid}>
          <div className={styles.estadoCard}>
            <div className={styles.estadoCardHeader}>
              <span className={styles.estadoIcon}>📋</span>
              <label className={styles.estadoLabel}>Estado del Pedido</label>
            </div>
            <select value={pedido.estado || 'pendiente'} onChange={(e) => (onChangeEstado ? onChangeEstado(e.target.value) : updatePedido({ estado: e.target.value }))} className={styles.selectInline}>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_preparacion">En preparación</option>
              <option value="en_produccion">En Producción</option>
              <option value="listo">Listo</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className={styles.estadoCard}>
            <div className={styles.estadoCardHeader}>
              <span className={styles.estadoIcon}>💳</span>
              <label className={styles.estadoLabel}>Estado de Pago</label>
            </div>
            {pedido.metodoPago === 'mercadopago' ? (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {pedido.mpPaymentStatus === 'approved' ? '✓ Pagado via MP' : pedido.mpPaymentStatus === 'rejected' ? '✗ Rechazado MP' : pedido.mpPaymentStatus === 'pending' ? '⏳ Pendiente MP' : '⏳ Esperando confirmación MP'}
              </span>
            ) : (
              <select value={pedido.estadoPago || 'sin_seña'} onChange={(e) => (onChangeEstadoPago ? onChangeEstadoPago(e.target.value) : updatePedido({ estadoPago: e.target.value }))} className={styles.selectInline}>
                <option value="sin_seña">Sin seña</option>
                <option value="seña_pagada">Seña pagada</option>
                <option value="pagado_total">Pagado total</option>
              </select>
            )}
          </div>
        </div>

        <div className={styles.fechasSection}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionIcon}>📅</span>
            <span className={styles.sectionTitle}>Fechas</span>
          </div>
          <div className={styles.fechasGrid}>
            <div className={styles.fechaItem}>
              <label>Solicitada</label>
              <div className={styles.fechaValue}>{formatPedidoDate(pedido.fechaSolicitudEntrega)}</div>
            </div>
            <div className={styles.fechaItem}>
              <label>Producción</label>
              <div className={styles.fechaValue}>
                <input type="date" value={pedido.fechaProduccion || ''} onChange={(e) => (onChangeFechaProduccion ? onChangeFechaProduccion(e.target.value || '') : updatePedido({ fechaProduccion: e.target.value || '', fechaProduccionCalendario: e.target.value || null }))} className={styles.dateInput} />
              </div>
            </div>
            <div className={styles.fechaItem}>
              <label>Entrega confirmada</label>
              <div className={styles.fechaValue}>
                <input type="date" value={pedido.fechaConfirmadaEntrega || ''} onChange={(e) => (onChangeFechaConfirmada ? onChangeFechaConfirmada(e.target.value || '') : updatePedido({ fechaConfirmadaEntrega: e.target.value || '' }))} className={styles.dateInput} />
              </div>
            </div>
          </div>
        </div>

        {pedido.estado === 'confirmado' && !pedido.asignadoAlCalendario && (
          <button onClick={() => onAssignCalendar && onAssignCalendar(pedido)} className={styles.btnCalendarNew}>📅 Asignar al Calendario</button>
        )}

        {pedido.asignadoAlCalendario && <div className={styles.alertSuccessNew}>✓ Asignado al calendario</div>}

        <div className={styles.productosSection}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionIcon}>📦</span>
            <span className={styles.sectionTitle}>Productos ({pedido.productos?.length || 0})</span>
          </div>
          <div className={styles.productosListNew}>
            {(pedido.productos || []).map((prod, idx) => {
              const productData = getPedidoProductData(prod, productosBase)
              const materialInfo = productData.material ? getPedidoMaterialInfo(materiales, productData.material, productData.materialId) : null
              return (
                <div key={idx} className={styles.productoItemNew}>
                  <div className={styles.productoLeft}>
                    <div className={styles.productoNombreNew}>{prod.nombre}</div>
                    <div className={styles.productoMetaNew}>
                      {prod.medidas && <span className={styles.metaTag}>{prod.medidas}</span>}
                      <span className={styles.metaTag}>×{prod.cantidad}</span>
                      {productData.tiempoUnitario && <span className={styles.tiempoTag}>⏱ {productData.tiempoUnitario}</span>}
                    </div>
                    {materialInfo && <div className={styles.productoMaterial}>Material: {materialInfo.nombre} • {materialInfo.tipo} • {materialInfo.espesor || 'N/A'}mm</div>}
                  </div>
                  <div className={styles.productoRight}>
                    <div className={styles.precioUnit}>{formatCurrency(prod.precioUnitario)} c/u</div>
                    <div className={styles.subtotalProd}>{formatCurrency(prod.subtotal)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.financieroSection}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionIcon}>💰</span>
            <span className={styles.sectionTitle}>Resumen Financiero</span>
          </div>
          <div className={styles.financieroGrid}>
            <div className={styles.finItem}><span>Subtotal</span><span>{formatCurrency(pedido.subtotal)}</span></div>
            {pedido.descuento > 0 && <div className={`${styles.finItem} ${styles.descuento}`}><span>Descuento</span><span>-{formatCurrency(pedido.descuento)}</span></div>}
            <div className={`${styles.finItem} ${styles.total}`}><span>Total</span><span>{formatCurrency(pedido.total || 0)}</span></div>
          </div>

          {pedido.metodoPago === 'mercadopago' ? (
            <div className={styles.montoInputSection}>
              <label className={styles.montoInputLabel}>Información de pago MercadoPago</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Estado MP</span>
                  <span style={{ fontWeight: 600 }}>
                    {pedido.mpPaymentStatus === 'approved' ? '✓ Aprobado' : pedido.mpPaymentStatus === 'rejected' ? '✗ Rechazado' : pedido.mpPaymentStatus === 'pending' ? '⏳ Pendiente' : pedido.estadoPago === 'pendiente_mp' ? '⏳ Esperando confirmación' : '—'}
                  </span>
                </div>
                {pedido.mpPaymentId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ID de pago</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{pedido.mpPaymentId}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.montoInputSection}>
              <label className={styles.montoInputLabel}>{Number(pedido.montoRecibido || 0) > 0 ? 'Actualizar monto recibido' : 'Registrar seña / monto recibido'}</label>
              <div className={styles.montoInputWrapper}>
                <span className={styles.currencyPrefix}>$</span>
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={formatInputNumber(pedido.montoRecibido)} onChange={(e) => (onChangeMontoRecibido ? onChangeMontoRecibido(parseInputNumber(e.target.value)) : updatePedido({ montoRecibido: parseInputNumber(e.target.value) }))} className={styles.montoInput} />
              </div>
            </div>
          )}
        </div>

        {pedido.comprobante && (
          <div className={styles.comprobanteSection}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon}>🧾</span>
              <span className={styles.sectionTitle}>Comprobante de Pago</span>
            </div>
            <div className={styles.comprobanteWrapper}>
              <img src={pedido.comprobante} alt="Comprobante" className={styles.comprobanteImgNew} />
              <button onClick={() => onDownloadComprobante && onDownloadComprobante(pedido)} className={styles.btnDownloadNew}>⬇ Descargar comprobante</button>
            </div>
          </div>
        )}

        {pedido.metodoPago === 'envio' && pedido.cliente?.direccion && pedido.cliente.direccion !== 'No proporcionada' && (
          <div className={styles.direccionSection}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionIcon}>📍</span>
              <label>Dirección de Entrega</label>
            </div>
            <p>{pedido.cliente.direccion}</p>
          </div>
        )}
      </div>

      {showFooter && (
        <div className={styles.modalFooterNew}>
          <button className={styles.btnDanger} onClick={() => onDelete && onDelete(pedido)}>🗑 Eliminar</button>
          <div className={styles.footerActions}>
            {onClose && <button className={styles.btnSecondary} onClick={onClose}>Cerrar</button>}
            <button className={styles.btnSave} onClick={() => onSave && onSave(pedido)}>💾 Guardar cambios</button>
          </div>
        </div>
      )}
    </div>
  )
}
