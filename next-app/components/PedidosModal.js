import { useEffect, useState } from 'react'

export default function PedidosModal({ open = false, onClose = () => {}, orders = null, title = null }) {
  const [mounted, setMounted] = useState(false)
  const [localOrders, setLocalOrders] = useState([])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (orders && Array.isArray(orders)) {
      setLocalOrders(orders)
      return
    }

    if (typeof window === 'undefined') return
    try {
      const stored = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      setLocalOrders(stored)
    } catch (e) {
      console.warn('Error reading pedidosCatalogo from localStorage', e)
      setLocalOrders([])
    }
  }, [orders])

  // Helpers para calcular tiempo si no viene en el pedido
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0
    const parts = ('' + timeStr).split(':')
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    return hours * 3600 + minutes * 60 + seconds
  }

  const secondsToHHMMSS = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  }

  const getProductTiempoUnitario = (prod, productosBase) => {
    if (!prod) return '00:00:00'
    if (prod.tiempoUnitario) return prod.tiempoUnitario
    const found = (productosBase || []).find(p => p.id === prod.productId || p.id === prod.idProducto || (p.nombre && prod.nombre && p.nombre.toLowerCase() === prod.nombre.toLowerCase()))
    return found?.tiempoUnitario || '00:00:00'
  }

  const computeTiempoTotalForOrder = (pedido) => {
    try {
      const productosBase = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('productosBase') || '[]') : []
      if (!pedido.productos || !Array.isArray(pedido.productos)) return '00:00:00'
      const totalSeconds = pedido.productos.reduce((sum, prod) => {
        const tiempoUnitario = getProductTiempoUnitario(prod, productosBase)
        const segundos = timeToSeconds(tiempoUnitario)
        const qty = Number(prod.cantidad || prod.quantity || 1) || 1
        return sum + (segundos * qty)
      }, 0)
      return secondsToHHMMSS(totalSeconds)
    } catch (e) {
      return '00:00:00'
    }
  }

  useEffect(() => {
    if (!mounted) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, mounted, onClose])

  if (!mounted) return null
  if (!open) return null

  return (
    <div className="pedidos-modal" role="dialog" aria-modal="true" aria-labelledby="pedidos-modal-title" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Cerrar" onClick={onClose}>✕</button>
  <div className="modal-header" id="pedidos-modal-title">{title || '📦 Pedidos del Catálogo'}</div>

        {(!localOrders || localOrders.length === 0) ? (
          <div className="empty">No hay pedidos de catálogo.</div>
        ) : (
          localOrders.map((p) => (
            <div className="pedido" key={p.id || (p.cliente && p.cliente.telefono) || Math.random()}>
              <h3>Pedido Catálogo #{p.id}</h3>
              <p>👤 Cliente: {p.cliente ? (p.cliente.nombre || p.cliente.name) : (p.clienteNombre || '—')}</p>
              {/* Mostrar estado/etiqueta de producido / listo para entrega */}
              {(() => {
                const estado = (p.estado || '').toString().toLowerCase()
                let label = null
                let color = null
                if (estado === 'listo') {
                  if (p.tipo === 'produccion') { label = 'Producto producido'; color = '#10b981' }
                  else if (p.tipo === 'entrega') { label = 'Producto listo para entrega'; color = '#10b981' }
                  else { label = 'Listo'; color = '#10b981' }
                } else if (estado === 'entregado') { label = 'Entregado'; color = '#6b7280' }
                else if (estado) { label = estado.charAt(0).toUpperCase() + estado.slice(1) ; color = '#6b7280' }

                return label ? (
                  <p style={{ marginTop: 6 }}><strong>Estado:</strong> <span style={{ color }}>{label}</span></p>
                ) : null
              })()}
              <p>
                ⏱️ Tiempo de corte: {
                  (() => {
                    // Prefer explicit fields, fallback to computed total from productos
                    if (p.tiempoTotalProduccion) {
                      if (typeof p.tiempoTotalProduccion === 'string' && p.tiempoTotalProduccion.indexOf(':') !== -1) return p.tiempoTotalProduccion
                      if (typeof p.tiempoTotalProduccion === 'number') return secondsToHHMMSS(p.tiempoTotalProduccion)
                    }
                    if (p.tiempo) return p.tiempo
                    return computeTiempoTotalForOrder(p)
                  })()
                }
              </p>
              <p>📅 Entrega programada: {p.fechaSolicitudEntrega || p.fechaProduccionCalendario || (p.fechaCreacion ? (new Date(p.fechaCreacion)).toLocaleDateString() : '—')}</p>
              <p>🏭 producir: {p.fechaProduccionCalendario || '—'}</p>
              {( (p.productos && p.productos.length > 0) || (p.items && p.items.length > 0) ) && (
                <div className="productos-list">
                  {(p.productos || p.items).map((prod, idx) => {
                    const name = prod.nombre || prod.name || prod.title || prod.productName || ''
                    const qty = Number(prod.cantidad || prod.quantity || prod.qty || 1) || 1
                    const measures = prod.medidas || prod.measures || prod.measuresText || prod.measure || ''

                    // intentar resolver material a partir del producto en productosBase
                    let materialInfo = ''
                    try {
                      const productosBase = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('productosBase') || '[]') : []
                      const materiales = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('materiales') || '[]') : []
                      const found = productosBase.find(pb => String(pb.id) === String(prod.productId || prod.id) || (pb.nombre && name && pb.nombre.toLowerCase() === String(name).toLowerCase()))
                      if (found) {
                        if (found.materialId) {
                          const m = materiales.find(m => String(m.id) === String(found.materialId))
                          if (m) materialInfo = `${m.nombre} • ${m.tipo || ''} • ${m.espesor || ''}`.trim()
                        } else if (found.material) {
                          materialInfo = found.material
                        }
                      }

                      // si no vino desde productosBase, ver si el item trae material directo
                      if (!materialInfo) {
                        if (prod.materialId) {
                          const m2 = materiales.find(m => String(m.id) === String(prod.materialId))
                          if (m2) materialInfo = `${m2.nombre} • ${m2.tipo || ''} • ${m2.espesor || ''}`.trim()
                        } else if (prod.material) {
                          materialInfo = prod.material
                        }
                      }
                    } catch (e) { /* noop */ }

                    // intentar resolver imagen: del item o desde productosBase
                    let imageSrc = ''
                    try {
                      const productosBase = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('productosBase') || '[]') : []
                      const foundImg = productosBase.find(pb => String(pb.id) === String(prod.productId || prod.id) || (pb.nombre && name && pb.nombre.toLowerCase() === String(name).toLowerCase()))
                      imageSrc = prod.imagen || prod.image || prod.thumbnail || foundImg?.imagen || foundImg?.image || ''
                    } catch (e) {
                      imageSrc = prod.imagen || prod.image || prod.thumbnail || ''
                    }

                    const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                        <rect width="100%" height="100%" fill="#f3f4f6" />
                        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, Helvetica, sans-serif" font-size="18">Sin imagen</text>
                      </svg>`
                    )

                    return (
                      <div className="producto" key={idx}>
                        <div className="producto-info">
                          <div className="producto-title">{name}</div>
                          <div className="producto-qty">unidades {qty}</div>
                          <div className="producto-meta">
                            {measures && <div className="meta-line">· {measures}</div>}
                            {materialInfo && <div className="meta-line">· Material: {materialInfo}</div>}
                          </div>
                        </div>
                        <div className="producto-img">
                          <img src={imageSrc || placeholder} alt={name} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .pedidos-modal {
          display: flex;
          position: fixed;
          z-index: 1200;
          left: 0; top: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .modal-content {
          background: var(--bg-card);
          border-radius: 12px;
          width: 90%;
          max-width: 520px;
          max-height: 80vh;
          overflow-y: auto;
          padding: 20px;
          box-shadow: var(--shadow, 0 6px 18px rgba(0,0,0,0.12));
          position: relative;
        }
        .modal-header { text-align:center; font-weight:600; font-size:1.1rem; margin-bottom:12px; color: var(--text-primary) }
        .pedido { background: var(--bg-secondary); border-radius:10px; padding:12px 15px; margin-bottom:10px; border:1px solid var(--border-color) }
        .pedido h3 { margin:0 0 6px; font-size:1rem; color:var(--text-primary) }
        .pedido p { margin:2px 0; font-size:0.9rem; color:var(--text-secondary) }
  .productos-list { margin-top:8px }
  .producto { background: var(--bg-card); border-radius:8px; padding:8px; margin-bottom:8px; border:1px solid var(--border-color); display:flex; gap:12px; align-items:flex-start; }
  .producto-info { flex:1; }
  .producto-title { font-weight:600; color:var(--text-primary); margin-bottom:4px }
  .producto-qty { color:var(--text-primary); font-weight:700; margin-bottom:6px }
  .producto-meta { color:var(--text-secondary); font-size:0.9rem }
  .meta-line { margin:2px 0 }
  .producto-img { width:88px; flex:0 0 88px; display:flex; align-items:center; justify-content:center }
  .producto-img img { max-width:100%; height:auto; border-radius:6px; object-fit:cover }
        .close { position:absolute; right:12px; top:10px; background:transparent; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-secondary) }
        .empty { color:var(--text-secondary); text-align:center; padding:24px }
        ::-webkit-scrollbar { width:6px }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius:10px }
      `}</style>
      <style jsx>{`
        @media (prefers-color-scheme: dark) {
          .modal-content {
            background: var(--bg-card);
            color: var(--text-primary);
            box-shadow: 0 8px 30px rgba(0,0,0,0.6);
          }
          .modal-header { color: var(--text-primary) }
          .pedido { background: var(--bg-secondary); border: 1px solid var(--border-color); }
          .pedido h3 { color: var(--text-primary) }
          .pedido p { color: var(--text-secondary) }
          .productos-list { margin-top:8px }
          .producto { background: var(--bg-card); border: 1px solid var(--border-color); }
          .producto-title { color: var(--text-primary) }
          .producto-qty { color: var(--text-primary) }
          .producto-meta { color: var(--text-secondary) }
          .producto-img { background: var(--bg-tertiary) }
          .close { color: var(--text-secondary) }
          .empty { color: var(--text-secondary) }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
        }
      `}</style>
    </div>
  )
}
