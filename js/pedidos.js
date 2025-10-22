/***********************
 * Pedidos
 ***********************/

let internosPage = 1;
const INTERNOS_PAGE_SIZE = 10;

// Renderizar pedidos internos en la tabla
function renderPedidos() {
  const container = document.getElementById('internosPedidosContainer');
  const empty = document.getElementById('internosEmpty');
  if (!container || !empty) return;

  const list = Array.isArray(pedidos) ? pedidos : [];
  if (list.length === 0) {
    container.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  container.style.display = 'grid';

  // Obtener pedidos del catálogo para detectar relaciones (pedidosInternosIds)
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');

  // Paginación
  const totalPages = Math.max(1, Math.ceil(list.length / INTERNOS_PAGE_SIZE));
  if (internosPage > totalPages) internosPage = totalPages;
  const start = (internosPage - 1) * INTERNOS_PAGE_SIZE;
  const pageItemsList = list.slice(start, start + INTERNOS_PAGE_SIZE);

  const cards = pageItemsList.map(p => {
    // intentar encontrar un pedido de catálogo que contenga este pedido interno
    const linkedCatalog = (Array.isArray(pedidosCatalogo) ? pedidosCatalogo : []).find(pc => Array.isArray(pc.pedidosInternosIds) && pc.pedidosInternosIds.some(id => String(id) === String(p.id)));

    const estadoLabels = {
      'pendiente': '⏳ Pendiente',
      'confirmado': '✅ Confirmado',
      'en_produccion': '🔧 En Producción',
  'listo': '📦 Listo para entrega',
      'entregado': '🎉 Entregado'
    };

    const pagoLabels = {
      'sin_seña': 'Sin seña',
      'seña_pagada': 'Seña pagada',
      'pagado_total': 'Pagado total'
    };

    const clienteNombre = (typeof p.cliente === 'string') ? p.cliente : (p.cliente?.nombre ? `${p.cliente.nombre}${p.cliente.apellido ? ' ' + p.cliente.apellido : ''}` : (p.cliente || 'Cliente interno'));

    // Si está vinculado a un pedido catálogo, usar su preview; sino mostrar info simple del producto
    let productosPreview = '';
    let productosCount = 0;
    if (linkedCatalog) {
      productosCount = linkedCatalog.productos?.length || 0;
      productosPreview = (linkedCatalog.productos || []).slice(0,3).map(prod => `
        <div class="producto-preview-item">
          <span>${prod.cantidad}x ${escapeHtml(prod.nombre)}</span>
          <span>${formatCurrency(prod.subtotal)}</span>
        </div>`).join('');
      if ((linkedCatalog.productos || []).length > 3) {
        productosPreview += `<div class="producto-preview-item" style="border:none; color:#0984e3;">+${linkedCatalog.productos.length - 3} productos más</div>`;
      }
    } else {
      const prodBase = (productosBase || []).find(pr => String(pr.id) === String(p.productoId)) || {};
      productosCount = 1;
      productosPreview = `
        <div class="producto-preview-item">
          <span>${p.cantidad || 1}x ${escapeHtml(prodBase.nombre || p.nombre || 'Producto')}</span>
          <span>${formatCurrency((prodBase.precioUnitario || prodBase.precio || p.precio || 0) * (p.cantidad || 1))}</span>
        </div>`;
    }

    const fechaCreacion = p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (p.fecha ? escapeHtml(p.fecha) : '');

    const estadoClass = p.estado || (linkedCatalog ? linkedCatalog.estado : 'pendiente');
    const estadoLabel = estadoLabels[estadoClass] || (p.estado || 'pendiente');
    const pagoClass = p.estadoPago || (linkedCatalog ? linkedCatalog.estadoPago : 'sin_seña');
    const pagoLabel = pagoLabels[pagoClass] || pagoClass;

    const totalVal = Number(p.total || p.pedidoTotal || p.precioTotal || ((linkedCatalog && linkedCatalog.total) ? linkedCatalog.total : 0));

    // thumbnail: intentar usar el producto del catálogo vinculado o la base de productos
    const thumbnailSrc = (linkedCatalog && linkedCatalog.productos && linkedCatalog.productos[0]) ? (linkedCatalog.productos[0].imagen || (Array.isArray(linkedCatalog.productos[0].imagenes) ? linkedCatalog.productos[0].imagenes[0] : null)) : ((productosBase || []).find(pb => String(pb.id) === String(p.productoId)) || {}).imagen || null;

    const thumbHtml = thumbnailSrc ? `<div class="pedido-thumb"><img src="${escapeHtml(thumbnailSrc)}" alt="thumb-${p.id}"/></div>` : `<div class="pedido-thumb placeholder">🖼️</div>`;

    // calcular seña y restante (mostrar estimada si no hay monto explícito)
    const recibidoVal = p.montoRecibido !== undefined && p.montoRecibido !== null ? Number(p.montoRecibido) : (p.estadoPago === 'seña_pagada' ? (Number(totalVal || 0) * 0.5) : 0);
    const recibidoEstimado = p.montoRecibido === undefined || p.montoRecibido === null ? (p.estadoPago === 'seña_pagada') : false;
    const restanteVal = Math.max(0, (Number(totalVal || 0) - recibidoVal));

    return `
      <div class="pedido-card" data-id="${p.id}" ${linkedCatalog ? `data-catalogo-id="${linkedCatalog.id}"` : ''}>
        <div class="pedido-left">
          <div class="pedido-id">Pedido <strong>#${p.id}</strong> <span class="fecha-creacion">${fechaCreacion}</span></div>
          <div class="thumb-row">
            ${thumbHtml}
            <div class="thumb-badges">
              <div class="status-badge ${p.estado}">${estadoLabels[p.estado] || escapeHtml(estadoLabel)}</div>
              <div class="pago-badge ${p.estadoPago}">${pagoLabels[p.estadoPago] || escapeHtml(pagoLabel)}</div>
            </div>
          </div>
        </div>

        <div class="pedido-main">
          <div class="pedido-topline">
            <div class="productos-summary">📦 ${productosCount} ${productosCount === 1 ? 'producto' : 'productos'}</div>
            <div class="fechas-resumen">${linkedCatalog ? `Entrega: <strong>${linkedCatalog.fechaConfirmadaEntrega || 'Sin confirmar'}</strong>` : ''}</div>
          </div>

          <div class="resumen-financiero">
            <div>Seña: <strong>${formatCurrency(recibidoVal)}</strong> ${recibidoEstimado ? '<small style="color:#999; margin-left:6px;">(estimada)</small>' : ''}</div>
            <div>Restante: <strong>${formatCurrency(restanteVal)}</strong></div>
            <div class="pedido-total-inline">Total: <strong>${formatCurrency(totalVal)}</strong></div>
          </div>
        </div>

        <div class="pedido-right">
          <div class="cliente-top">
            <div class="cliente-nombre">${escapeHtml(clienteNombre)}</div>
            <div class="cliente-contact-line">${p.telefono ? '📞 ' + escapeHtml(p.telefono) : ''}</div>
            <div class="cliente-contact-line">${(() => { const e = p.email || (p.cliente && p.cliente.email) || p.userEmail || ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? (window.KONDAuth.currentUser() || {}).email : ''); return e ? ('📧 ' + escapeHtml(e)) : ''; })()}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cards;

  // Pager para internos
  let pager = document.getElementById('internosPager');
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'internosPager';
    pager.className = 'pager';
    container.parentNode.insertBefore(pager, container.nextSibling);
  }
  pager.innerHTML = `
    <button class="pager-btn" id="internosPrev" ${internosPage <= 1 ? 'disabled' : ''}>Anterior</button>
    <span style="margin:0 12px;">Página ${internosPage} / ${totalPages}</span>
    <button class="pager-btn" id="internosNext" ${internosPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
  `;

  document.getElementById('internosPrev')?.addEventListener('click', () => { if (internosPage > 1) { internosPage--; renderPedidos(); } });
  document.getElementById('internosNext')?.addEventListener('click', () => { if (internosPage < totalPages) { internosPage++; renderPedidos(); } });

  // Hacer la tarjeta clickeable: abrir detalle de catálogo si data-catalogo-id presente,
  // o abrir detalle interno si no
  container.querySelectorAll('.pedido-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // permitir que botones internos (p.ej. botones de acción) no propaguen
      if (e.target.closest('button')) return;
      const id = card.dataset.id;
      const catalogoId = card.dataset.catalogoId;
      if (catalogoId && typeof mostrarDetallePedido === 'function') {
        mostrarDetallePedido(parseInt(catalogoId));
      } else {
        showDetallePedidoById(id);
      }
    });
  });

  // Botones de eliminar inline (si existen en plantilla futura)
  container.querySelectorAll('.btn-eliminar-pedido').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(e.currentTarget.dataset.id);
      if (!confirm('¿Eliminar este pedido interno?')) return;
      const idx = pedidos.findIndex(x => x.id === id);
      if (idx !== -1) {
        pedidos.splice(idx, 1);
        guardarProductos();
        renderPedidos();
        if (typeof renderCalendar === 'function') renderCalendar();
        showNotification('Pedido interno eliminado', 'success');
      }
    });
  });
}

// Rellena y muestra el modal de detalle de pedido (usa el modal existente en index.html)
function showDetallePedidoById(id) {
  const pedido = (Array.isArray(pedidos) ? pedidos : []).find(p => String(p.id) === String(id));
  if (!pedido) { showNotification('Pedido no encontrado', 'error'); return; }

  const modal = document.getElementById('detallePedidoModal');
  if (!modal) return;

  // Normalizar y poblar campos según el shape del pedido
  // pedido puede venir en varias formas:
  // - pedido interno simple: { id, productoId, cliente: 'Nombre', cantidad, fecha, sena, pedidoTotal, restante, observaciones }
  // - pedido de catálogo: forma más completa con cliente objeto y productos[]
  // - pedido interno ya enriquecido con items[]

  // ID
  const idDisplay = document.getElementById('pedidoIdDisplay');
  if (idDisplay) idDisplay.textContent = `#${pedido.id}`;

  // Cliente: puede ser string o un objeto con nombre/telefono/email/direccion
  const clienteNombreEl = document.getElementById('detailClienteNombre');
  const clienteTelefonoEl = document.getElementById('detailClienteTelefono');
  const clienteEmailEl = document.getElementById('detailClienteEmail');
  const clienteDireccionEl = document.getElementById('detailClienteDireccion');

  if (typeof pedido.cliente === 'string') {
    if (clienteNombreEl) clienteNombreEl.textContent = pedido.cliente || '';
    if (clienteTelefonoEl) clienteTelefonoEl.textContent = pedido.telefono || '';
    if (clienteEmailEl) clienteEmailEl.textContent = '';
    if (clienteDireccionEl) clienteDireccionEl.textContent = pedido.direccion || '';
  } else if (pedido.cliente && typeof pedido.cliente === 'object') {
    if (clienteNombreEl) clienteNombreEl.textContent = `${pedido.cliente.nombre || ''}${pedido.cliente.apellido ? ' ' + pedido.cliente.apellido : ''}`.trim() || '';
    if (clienteTelefonoEl) clienteTelefonoEl.textContent = pedido.cliente.telefono || '';
  if (clienteEmailEl) clienteEmailEl.textContent = (pedido.cliente && pedido.cliente.email) || pedido.userEmail || ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? (window.KONDAuth.currentUser() || {}).email : '') || '';
    if (clienteDireccionEl) clienteDireccionEl.textContent = pedido.cliente.direccion || '';
  } else {
    if (clienteNombreEl) clienteNombreEl.textContent = pedido.cliente?.nombre || pedido.cliente || '';
    if (clienteTelefonoEl) clienteTelefonoEl.textContent = pedido.cliente?.telefono || pedido.telefono || '';
  if (clienteEmailEl) clienteEmailEl.textContent = (pedido.cliente && pedido.cliente.email) || pedido.userEmail || ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? (window.KONDAuth.currentUser() || {}).email : '') || '';
    if (clienteDireccionEl) clienteDireccionEl.textContent = pedido.cliente?.direccion || pedido.direccion || '';
  }

  // Productos: soportar varias claves (productos, items, or single productoId)
  const productosList = document.getElementById('detailProductosList');
  const rawItems = [];
  if (Array.isArray(pedido.productos) && pedido.productos.length) {
    // forma catálogo: cada prod ya tiene nombre, cantidad, subtotal, precioUnitario
    pedido.productos.forEach(p => rawItems.push({
      productoId: p.productId || p.id || null,
      nombre: p.nombre,
      cantidad: p.cantidad || 1,
      precioUnitario: p.precioUnitario || p.precio || (p.subtotal || 0) / (p.cantidad || 1),
      medidas: p.medidas || p.medidasProducto || null,
      tiempoUnitario: p.tiempoUnitario || p.tiempo || null
    }));
  } else if (Array.isArray(pedido.items) && pedido.items.length) {
    pedido.items.forEach(it => rawItems.push({
      productoId: it.productoId || it.productId || null,
      nombre: it.nombre,
      cantidad: it.cantidad || 1,
      precioUnitario: it.precioUnitario || it.precio || 0,
      medidas: it.medidas || null,
      tiempoUnitario: it.tiempoUnitario || it.tiempo || null
    }));
  } else if (pedido.productoId || pedido.producto) {
    // pedido interno single-product
    const pid = pedido.productoId || pedido.producto;
    const prodBase = (productosBase || []).find(p => String(p.id) === String(pid)) || {};
    const cantidadSingle = pedido.cantidad || 1;
    // Determinar precio unitario: preferir campo unitario, sino si tenemos un pedidoTotal usar pedidoTotal/cantidad
    let precioUnitarioSingle = 0;
    if (pedido.precioUnitario || pedido.precio) {
      precioUnitarioSingle = Number(pedido.precioUnitario || pedido.precio || 0);
    } else if (pedido.pedidoTotal || pedido.precioTotal) {
      precioUnitarioSingle = (Number(pedido.pedidoTotal || pedido.precioTotal) || 0) / (cantidadSingle || 1);
    } else if (prodBase.precioUnitario || prodBase.precio) {
      precioUnitarioSingle = Number(prodBase.precioUnitario || prodBase.precio || 0);
    } else {
      precioUnitarioSingle = 0;
    }
    rawItems.push({
      productoId: pid,
      nombre: prodBase.nombre || pedido.nombre || 'Producto',
      cantidad: cantidadSingle,
      precioUnitario: precioUnitarioSingle,
      medidas: prodBase.medidas || pedido.medidas || null,
      tiempoUnitario: prodBase.tiempoUnitario || pedido.tiempoUnitario || null
    });
  }

  if (productosList) {
    productosList.innerHTML = '';
    rawItems.forEach(item => {
      const nombre = item.nombre || 'Producto';
      const cantidad = item.cantidad || 1;
      const precioUnit = item.precioUnitario || 0;
      const medidas = item.medidas || '';
      const tiempoUnit = item.tiempoUnitario || '';
      // calcular tiempo total en minutos y formato HH:MM:SS si es posible
      let tiempoTotalStr = '';
      if (tiempoUnit && typeof timeToMinutes === 'function' && typeof minutesToTime === 'function') {
        const unitMin = timeToMinutes(tiempoUnit);
        const totalMin = unitMin * cantidad;
        tiempoTotalStr = `${tiempoUnit} × ${cantidad} = ${minutesToTime(totalMin)}`;
      } else if (tiempoUnit) {
        tiempoTotalStr = `${tiempoUnit} × ${cantidad}`;
      }

      const row = document.createElement('div');
      row.className = 'producto-detail-item';
      row.innerHTML = `
        <div class="producto-detail-info">
          <div class="producto-detail-nombre">${escapeHtml(nombre)}</div>
          <div class="producto-detail-specs">
            <span>📦 Cantidad: ${cantidad}</span>
            <span>💰 Precio unit: ${formatCurrency(precioUnit)}</span>
            ${medidas ? `<span>📏 Medidas: ${escapeHtml(medidas)}</span>` : ''}
            ${tiempoUnit ? `<span>⏱ Unit: ${escapeHtml(tiempoUnit)}</span>` : ''}
            ${tiempoTotalStr ? `<span>⏱ Total: ${escapeHtml(tiempoTotalStr)}</span>` : ''}
          </div>
        </div>
        <div class="producto-detail-precio">${formatCurrency(precioUnit * cantidad)}</div>
      `;
      productosList.appendChild(row);
    });
  }

  // Totales: intentar usar campos existentes o calcular a partir de rawItems
  const subtotalVal = Number(pedido.subtotal || pedido.total || pedido.pedidoTotal || pedido.precioTotal || rawItems.reduce((s,i)=>s + ((i.precioUnit||0)*(i.cantidad||1)),0));
  const totalVal = Number(pedido.total || pedido.pedidoTotal || pedido.precioTotal || subtotalVal);
  const detailSubtotalEl = document.getElementById('detailSubtotal');
  const detailTotalEl = document.getElementById('detailTotal');
  if (detailSubtotalEl) detailSubtotalEl.textContent = formatCurrency(subtotalVal);
  if (detailTotalEl) detailTotalEl.textContent = formatCurrency(totalVal);

  // Calcular tiempo total de producción a partir de rawItems si no está explícito
  let tiempoTotal = Number(pedido.tiempoTotalProduccion || 0);
  if (!tiempoTotal) {
    try {
      const base = Array.isArray(productosBase) ? productosBase : JSON.parse(localStorage.getItem('productosBase') || '[]');
      tiempoTotal = rawItems.reduce((sum, it) => {
        // buscar tiempo en el item o en la base
        const tStr = it.tiempoUnitario || (base.find(bp => String(bp.id) === String(it.productoId)) || {}).tiempoUnitario;
        if (!tStr) return sum;
        const unitMinutes = (typeof timeToMinutes === 'function' ? timeToMinutes(tStr) : 0);
        return sum + (unitMinutes * (it.cantidad || 1));
      }, 0);
    } catch (e) { tiempoTotal = 0; }
  }
  const detailTiempoEl = document.getElementById('detailTiempo');
  if (detailTiempoEl) detailTiempoEl.textContent = `${tiempoTotal} min (${minutesToTime(tiempoTotal)})`;

  // Estado y pagos: rellenar selects/inputs si existen
  const estadoSelect = document.getElementById('detailEstadoSelect');
  if (estadoSelect) {
    if (!estadoSelect.options || estadoSelect.options.length === 0) {
      estadoSelect.innerHTML = `
        <option value="pendiente">⏳ Pendiente</option>
        <option value="confirmado">✅ Confirmado</option>
        <option value="en_produccion">🔧 En Producción</option>
        <option value="listo">📦 Listo</option>
        <option value="entregado">🎉 Entregado</option>
      `;
    }
    estadoSelect.value = pedido.estado || pedido.estadoPedido || 'pendiente';
  }

  const estadoPagoSelect = document.getElementById('detailEstadoPagoSelect');
  if (estadoPagoSelect) {
    if (!estadoPagoSelect.options || estadoPagoSelect.options.length === 0) {
      estadoPagoSelect.innerHTML = `
        <option value="sin_seña">Sin seña</option>
        <option value="seña_pagada">Seña pagada</option>
        <option value="pagado_total">Pagado total</option>
      `;
    }
    estadoPagoSelect.value = pedido.estadoPago || pedido.estado_pago || 'sin_seña';
  }

  const montoRecibidoInput = document.getElementById('detailMontoRecibido');
  if (montoRecibidoInput) montoRecibidoInput.value = pedido.montoRecibido !== undefined ? pedido.montoRecibido : (pedido.sena !== undefined ? pedido.sena : (pedido.monto || 0));

  const fechaConfirmadaInput = document.getElementById('detailFechaConfirmada');
  if (fechaConfirmadaInput) fechaConfirmadaInput.value = pedido.fechaConfirmadaEntrega || pedido.fechaConfirmada || pedido.fecha || '';

  // Restante y badges
  const restanteEl = document.getElementById('detailRestante');
  if (restanteEl) {
    const recibido = Number(montoRecibidoInput?.value || 0);
    const restante = Math.max(0, totalVal - recibido);
    if (restante > 0 && (pedido.estadoPago === 'seña_pagada' || pedido.sena)) {
      restanteEl.textContent = formatCurrency(restante);
      restanteEl.style.display = 'block';
    } else {
      restanteEl.style.display = 'none';
    }
  }

  const badgePago = document.getElementById('detailBadgePago');
  if (badgePago) {
    const label = pedido.estadoPago === 'seña_pagada' ? 'Seña pagada' : (pedido.estadoPago === 'pagado_total' ? 'Pagado total' : 'Sin seña');
    badgePago.textContent = label;
    badgePago.className = `badge pago-badge ${pedido.estadoPago || ''}`;
  }

  const badgeMetodo = document.getElementById('detailBadgeMetodo');
  if (badgeMetodo) {
    badgeMetodo.textContent = pedido.metodoPago === 'whatsapp' ? '📱 WhatsApp' : (pedido.metodoPago ? '💳 ' + pedido.metodoPago : '');
    badgeMetodo.className = 'badge';
  }

  // Helper para recalcular restante dinámicamente según monto recibido y estadoPago (para pedidos internos)
  function updateRestanteAndMontoInterno() {
    const estadoPagoVal = document.getElementById('detailEstadoPagoSelect')?.value || pedido.estadoPago;
    const montoEl = document.getElementById('detailMontoRecibido');
    const restanteElLocal = document.getElementById('detailRestante');
    const total = Number(pedido.total || pedido.pedidoTotal || pedido.precioTotal || 0);
    let recibido = montoEl ? Number(montoEl.value || 0) : (pedido.montoRecibido || pedido.sena || 0);

    if (estadoPagoVal === 'pagado_total') {
      if (montoEl) montoEl.value = total;
      recibido = total;
    }

    if (restanteElLocal) {
      const restanteNow = Math.max(0, total - recibido);
      if (restanteNow > 0 && (estadoPagoVal === 'seña_pagada' || pedido.sena)) {
        restanteElLocal.textContent = formatCurrency(restanteNow);
        restanteElLocal.style.display = 'block';
      } else {
        restanteElLocal.style.display = 'none';
      }
    }
  }

  // Bind dinámico para internos: cambio de estado de pago y cambio de monto recibido
  if (estadoPagoSelect) estadoPagoSelect.onchange = () => updateRestanteAndMontoInterno();
  if (montoRecibidoInput) montoRecibidoInput.oninput = () => updateRestanteAndMontoInterno();

  // Ejecutar al abrir
  updateRestanteAndMontoInterno();

  // asegurar listeners del modal
  if (typeof bindDetallePedidoModalButtons === 'function') bindDetallePedidoModalButtons();
  // mostrar modal (usar clases existentes)
  modal.style.display = 'flex';
  modal.classList.add('show');
  // guardar id en dataset para acciones posteriores
  modal.dataset.pedidoId = pedido.id;
  modal.dataset.source = 'internos';
}

// Bindeo de botones del modal detalle (cerrar, eliminar, guardar)
function bindDetallePedidoModalButtons() {
  const modal = document.getElementById('detallePedidoModal');
  if (!modal) return;
  if (modal.dataset.boundDetalleButtons === 'true') return; // evitar duplicados
  const btnCerrar = document.getElementById('btnCerrarDetalle');
  const btnEliminar = document.getElementById('btnEliminarPedido');
  const btnGuardar = document.getElementById('btnGuardarCambios');

  if (btnCerrar) btnCerrar.addEventListener('click', () => { modal.style.display = 'none'; modal.classList.remove('show'); delete modal.dataset.pedidoId; });

  if (btnEliminar) btnEliminar.addEventListener('click', () => {
    // Si el modal fue abierto por el catálogo y existe el handler específico, delegar
    if (modal.dataset.source === 'catalogo' && typeof eliminarPedido === 'function') {
      eliminarPedido();
      return;
    }
    const id = modal.dataset.pedidoId;
    if (!id) return; 
    if (!confirm('¿Eliminar este pedido?')) return;
    const idx = pedidos.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      pedidos.splice(idx, 1);
      guardarProductos();
      renderPedidos();
      if (typeof renderCalendar === 'function') renderCalendar();
      modal.style.display = 'none'; modal.classList.remove('show'); delete modal.dataset.pedidoId;
      showNotification('Pedido eliminado', 'success');
    }
  });

  if (btnGuardar) btnGuardar.addEventListener('click', () => {
    // Si el modal fue abierto por el catálogo y existe el handler específico, delegar
    if (modal.dataset.source === 'catalogo' && typeof guardarCambiosPedido === 'function') {
      guardarCambiosPedido();
      return;
    }
    const id = modal.dataset.pedidoId;
    if (!id) return;
    const idx = pedidos.findIndex(p => String(p.id) === String(id));
    if (idx === -1) return;
    // leer valores del modal y actualizar pedido
    const estado = document.getElementById('detailEstadoSelect')?.value || pedidos[idx].estado;
    const estadoPago = document.getElementById('detailEstadoPagoSelect')?.value || pedidos[idx].estadoPago;
    let montoRecibido = parseFloat(document.getElementById('detailMontoRecibido')?.value) || 0;
    const fechaConfirmada = document.getElementById('detailFechaConfirmada')?.value || pedidos[idx].fecha;

    const totalPedido = Number(pedidos[idx].total || pedidos[idx].pedidoTotal || pedidos[idx].precioTotal || 0);
    const previoEstadoPago = pedidos[idx].estadoPago || null;

    if (estadoPago === 'pagado_total') {
      montoRecibido = totalPedido;
    }

    pedidos[idx] = { ...pedidos[idx], estado, estadoPago, montoRecibido, fechaConfirmada };

    // Normalizar campos antes de comparaciones
    const pedidoNormalized = normalizePedido(pedidos[idx]);
    const previoEstadoPagoNorm = normalizeEstadoPago(previoEstadoPago);
    const nuevoEstadoPagoNorm = normalizeEstadoPago(estadoPago);
    const montoRecibidoPrev = Number(pedidoNormalized.montoRecibido || 0);
    // Si pasó a pagado_total y antes no lo estaba, registrar movimiento por la diferencia
    if (nuevoEstadoPagoNorm === 'pagado_total' && previoEstadoPagoNorm !== 'pagado_total') {
      const montoARegistrar = Math.max(0, (totalPedido || 0) - Number(montoRecibidoPrev || 0));
      if (montoARegistrar > 0 && typeof registrarMovimiento === 'function') {
        // Generar idempotencyKey consistente
        const fechaMovimiento = (new Date()).toISOString().slice(0,10);
        const idKey = `pedido:${pedidos[idx].id}:venta:${fechaMovimiento}:${montoARegistrar}`;
        registrarMovimiento({ tipo: 'ingreso', monto: montoARegistrar, categoria: 'Ventas', descripcion: `Pago total pedido #${pedidos[idx].id}`, fecha: fechaMovimiento, idempotencyKey: idKey });
      }
    }
    guardarProductos();
    renderPedidos();
    modal.style.display = 'none'; modal.classList.remove('show'); delete modal.dataset.pedidoId;
    showNotification('Cambios guardados', 'success');
  });
  // marcar como bindeado
  modal.dataset.boundDetalleButtons = 'true';
}

// El botón 'Nuevo Pedido Interno' fue eliminado del HTML; la creación manual de pedidos internos
// puede seguir realizándose desde la UI o mediante scripts si se desea reactivar.

const savePedidoBtn = document.getElementById('savePedidoBtn');
if (savePedidoBtn) {
  savePedidoBtn.addEventListener('click', () => {
    const productoId = parseInt(document.getElementById('pedidoProductoModal')?.value);
    const cliente = document.getElementById('pedidoClienteModal')?.value.trim() || '';
    const fecha = document.getElementById('pedidoFechaModal')?.value || '';
    const estado = document.getElementById('pedidoEstadoModal')?.value || 'pendiente';
    const cantidad = parseInt(document.getElementById('pedidoCantidadModal')?.value) || 1;

    if (!fecha) { showNotification('La fecha es requerida', 'error'); return; }
    if (cantidad <= 0) { showNotification('La cantidad debe ser mayor a 0', 'error'); return; }

    pedidos.push({ id: Date.now() + Math.floor(Math.random() * 100000), productoId, cliente, fecha, estado, cantidad });
    guardarProductos();
    renderPedidos();
    if (typeof renderCalendar === 'function') renderCalendar();
    closeModal('pedidoModal');
    showNotification('Pedido creado correctamente', 'success');
  });
}

const cancelPedidoBtn = document.getElementById('cancelPedidoBtn');
if (cancelPedidoBtn) cancelPedidoBtn.addEventListener('click', () => closeModal('pedidoModal'));

// Inicializar render al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { renderPedidos(); bindDetallePedidoModalButtons(); });
} else {
  renderPedidos();
  bindDetallePedidoModalButtons();
}

// Helpers de normalización para compatibilidad entre legacy y Next
function normalizeEstadoPago(val) {
  if (!val && val !== 0) return 'sin_seña'
  const s = String(val || '').trim()
  if (s === 'pagado' || s === 'pagado_total') return 'pagado_total'
  if (s === 'seña_pagada' || s === 'sena_pagada' || s === 'seña') return 'seña_pagada'
  if (s === 'sin_seña' || s === '') return 'sin_seña'
  return s
}

function normalizePedido(p) {
  if (!p) return p
  const clone = { ...p }
  const monto = Number(p.montoRecibido ?? p.senaMonto ?? p['señaMonto'] ?? 0)
  clone.montoRecibido = isNaN(monto) ? 0 : monto
  clone.estadoPago = normalizeEstadoPago(p.estadoPago)
  if (!clone.cliente) clone.cliente = { nombre: '', apellido: '' }
  else {
    clone.cliente.nombre = clone.cliente.nombre || ''
    clone.cliente.apellido = clone.cliente.apellido || ''
  }
  return clone
}