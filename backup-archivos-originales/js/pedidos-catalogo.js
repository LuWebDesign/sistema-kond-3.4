// ====== GESTIÓN DE PEDIDOS CATÁLOGO ======

let pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
let catalogoPage = 1;
const CATALOGO_PAGE_SIZE = 10;
let pedidoSeleccionado = null;

// Ensamblador de pestañas: manejar clicks y activar contenido correspondiente
function setupPedidosTabs() {
  const tabs = document.querySelectorAll('.pedido-tab');
  const contents = document.querySelectorAll('.pedidos-tab-content');
  if (!tabs || !contents) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const el = document.getElementById(`tab-${target}`);
      if (el) el.classList.add('active');
      // Si cambiamos a catálogo, renderizar su contenido (sub-pestaña activa)
      if (target === 'catalogo') {
        const activeSubtab = document.querySelector('.catalogo-subtab.active');
        if (activeSubtab?.dataset.subtab === 'entregados') {
          renderPedidosCatalogoEntregados();
        } else {
          renderPedidosCatalogoPendientes();
        }
      }
    });
  });
  // actualizar badges inicialmente
  updateTabBadges();
}

// Configurar sub-pestañas del catálogo
function setupCatalogoSubtabs() {
  const subtabs = document.querySelectorAll('.catalogo-subtab');
  const subtabContents = document.querySelectorAll('.catalogo-subtab-content');
  
  if (!subtabs || !subtabContents) return;
  
  subtabs.forEach(subtab => {
    subtab.addEventListener('click', () => {
      const target = subtab.dataset.subtab;
      
      // Remover clase active de todas las sub-pestañas y contenidos
      subtabs.forEach(st => st.classList.remove('active'));
      subtabContents.forEach(stc => stc.classList.remove('active'));
      
      // Activar sub-pestaña clickeada
      subtab.classList.add('active');
      const targetContent = document.getElementById(`subtab-${target}`);
      if (targetContent) targetContent.classList.add('active');
      
      // Renderizar el contenido correspondiente
      if (target === 'pendientes') {
        renderPedidosCatalogoPendientes();
      } else if (target === 'entregados') {
        renderPedidosCatalogoEntregados();
      }
    });
  });
  
  // Configurar listeners para filtros de cada sub-pestaña
  setupCatalogoFilters();
  updateCatalogoSubtabBadges();
}

// Configurar filtros para ambas sub-pestañas
function setupCatalogoFilters() {
  // Filtros para pedidos pendientes
  const catalogoSearch = document.getElementById('catalogoSearch');
  const catalogoFilterEstado = document.getElementById('catalogoFilterEstado');
  const catalogoFilterPago = document.getElementById('catalogoFilterPago');
  
  if (catalogoSearch) catalogoSearch.addEventListener('input', renderPedidosCatalogoPendientes);
  if (catalogoFilterEstado) catalogoFilterEstado.addEventListener('change', renderPedidosCatalogoPendientes);
  if (catalogoFilterPago) catalogoFilterPago.addEventListener('change', renderPedidosCatalogoPendientes);
  
  // Filtros para pedidos entregados
  const catalogoEntregadosSearch = document.getElementById('catalogoEntregadosSearch');
  const catalogoEntregadosFilterPago = document.getElementById('catalogoEntregadosFilterPago');
  const catalogoEntregadosFecha = document.getElementById('catalogoEntregadosFecha');
  
  if (catalogoEntregadosSearch) catalogoEntregadosSearch.addEventListener('input', renderPedidosCatalogoEntregados);
  if (catalogoEntregadosFilterPago) catalogoEntregadosFilterPago.addEventListener('change', renderPedidosCatalogoEntregados);
  if (catalogoEntregadosFecha) catalogoEntregadosFecha.addEventListener('change', renderPedidosCatalogoEntregados);
}

function updateTabBadges() {
  try {
    const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
    const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
    const badgeInternos = document.getElementById('badgeInternos');
    const badgeCatalogo = document.getElementById('badgeCatalogo');
    
    // Contabilizar pedidos pendientes (no entregados)
    const pedidosCatalogoPendientes = pedidosCatalogo.filter(p => p.estado !== 'entregado');
    
    if (badgeInternos) badgeInternos.textContent = (pedidos.filter(p => p.estado === 'pendiente').length || 0);
    if (badgeCatalogo) badgeCatalogo.textContent = pedidosCatalogoPendientes.length || 0;
  } catch (e) { /* ignore */ }
}

function updateCatalogoSubtabBadges() {
  try {
    const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
    
    const badgePendientes = document.getElementById('badgePendientes');
    const badgeEntregados = document.getElementById('badgeEntregados');
    
    const pendientes = pedidosCatalogo.filter(p => p.estado !== 'entregado');
    const entregados = pedidosCatalogo.filter(p => p.estado === 'entregado');
    
    if (badgePendientes) badgePendientes.textContent = pendientes.length || 0;
    if (badgeEntregados) badgeEntregados.textContent = entregados.length || 0;
  } catch (e) { /* ignore */ }
}

// Inicializar gestión de pedidos
function initPedidosCatalogo() {
  setupPedidosTabs();
  setupCatalogoSubtabs();
  
  // Renderizar la sub-pestaña activa por defecto (pendientes)
  if (typeof renderPedidosCatalogoPendientes === 'function') renderPedidosCatalogoPendientes();
  
  updatePedidosStats();
  setupPedidosEvents && typeof setupPedidosEvents === 'function' && setupPedidosEvents();
  
  // Configurar botón de limpiar duplicados
  const btnLimpiarDuplicados = document.getElementById('btnLimpiarDuplicados');
  if (btnLimpiarDuplicados) {
    btnLimpiarDuplicados.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que quieres limpiar los pedidos internos duplicados? Esta acción no se puede deshacer.')) {
        const duplicadosEliminados = limpiarDuplicadosPedidosInternos();
        if (duplicadosEliminados === 0) {
          showNotification('No se encontraron duplicados para eliminar', 'info');
        }
      }
    });
  }
}

// Renderizador para pedidos pendientes (no entregados)
function renderPedidosCatalogoPendientes() {
  const container = document.getElementById('catalogoPedidosContainer');
  const emptyState = document.getElementById('catalogoEmpty');
  if (!container) return;

  // Aplicar filtros
  const searchTerm = document.getElementById('catalogoSearch')?.value.toLowerCase() || '';
  const filterEstado = document.getElementById('catalogoFilterEstado')?.value || '';
  const filterPago = document.getElementById('catalogoFilterPago')?.value || '';

  let filteredPedidos = pedidosCatalogo.filter(pedido => {
    // Solo pedidos NO entregados
    const notEntregado = pedido.estado !== 'entregado';
    
    const matchSearch = !searchTerm || 
      pedido.id.toString().includes(searchTerm) ||
      pedido.cliente.nombre.toLowerCase().includes(searchTerm) ||
      pedido.cliente.apellido.toLowerCase().includes(searchTerm) ||
      pedido.productos.some(p => p.nombre.toLowerCase().includes(searchTerm));
    
    const matchEstado = !filterEstado || pedido.estado === filterEstado;
    const matchPago = !filterPago || pedido.estadoPago === filterPago;
    
    return notEntregado && matchSearch && matchEstado && matchPago;
  });
  
  renderPedidosCatalogoHelper(filteredPedidos, container, emptyState, 'pendientes');
}

// Renderizador para pedidos entregados
function renderPedidosCatalogoEntregados() {
  const container = document.getElementById('catalogoEntregadosContainer');
  const emptyState = document.getElementById('catalogoEntregadosEmpty');
  if (!container) return;

  // Aplicar filtros
  const searchTerm = document.getElementById('catalogoEntregadosSearch')?.value.toLowerCase() || '';
  const filterPago = document.getElementById('catalogoEntregadosFilterPago')?.value || '';
  const filterFecha = document.getElementById('catalogoEntregadosFecha')?.value || '';

  let filteredPedidos = pedidosCatalogo.filter(pedido => {
    // Solo pedidos entregados
    const esEntregado = pedido.estado === 'entregado';
    
    const matchSearch = !searchTerm || 
      pedido.id.toString().includes(searchTerm) ||
      pedido.cliente.nombre.toLowerCase().includes(searchTerm) ||
      pedido.cliente.apellido.toLowerCase().includes(searchTerm) ||
      pedido.productos.some(p => p.nombre.toLowerCase().includes(searchTerm));
    
    const matchPago = !filterPago || pedido.estadoPago === filterPago;
    
    // Filtro por fecha de entrega (si está disponible)
    const matchFecha = !filterFecha || (pedido.fechaEntrega && pedido.fechaEntrega === filterFecha);
    
    return esEntregado && matchSearch && matchPago && matchFecha;
  });
  
  renderPedidosCatalogoHelper(filteredPedidos, container, emptyState, 'entregados');
}

// Función helper para renderizar tanto pendientes como entregados
function renderPedidosCatalogoHelper(filteredPedidos, container, emptyState, tipo) {
  
  // Ordenar por fecha (más recientes primero)
  filteredPedidos.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

  // Paginar resultados
  const totalPages = Math.max(1, Math.ceil(filteredPedidos.length / CATALOGO_PAGE_SIZE));
  if (catalogoPage > totalPages) catalogoPage = totalPages;
  const start = (catalogoPage - 1) * CATALOGO_PAGE_SIZE;
  const pageItems = filteredPedidos.slice(start, start + CATALOGO_PAGE_SIZE);
  
  if (filteredPedidos.length === 0) {
    container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = pageItems.map(pedido => {
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
    
    const metodoPagoLabel = pedido.metodoPago === 'whatsapp' ? '📱 WhatsApp' : '💳 Transferencia';
    
    const fechaCreacion = pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';
    const fechaConfirmadaEntregaDisplay = pedido.fechaConfirmadaEntrega ? new Date(pedido.fechaConfirmadaEntrega + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'Sin confirmar';
    const fechaProduccionDisplay = pedido.fechaProduccion ? new Date(pedido.fechaProduccion + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'Sin asignar';
    
    // Primeros 3 productos para preview
    const productosPreview = pedido.productos.slice(0, 3).map(p => 
      `<div class="producto-preview-item">
        <span>${p.cantidad}x ${escapeHtml(p.nombre)}</span>
        <span>${formatCurrency(p.subtotal)}</span>
      </div>`
    ).join('');
    
    const masProductos = pedido.productos.length > 3 
  ? `<div class="producto-preview-item" style="border:none; color:#0984e3;">
          +${pedido.productos.length - 3} productos más
         </div>` 
      : '';
    
  // Obtener imagen del primer producto: preferir la imagen del catálogo (`productosBase`) por productId
  const firstProd = (pedido.productos && pedido.productos[0]) ? pedido.productos[0] : null;
  let thumbnailSrc = null;
  try {
    if (firstProd) {
      // Si el producto del pedido referencia un productId, buscar en productosBase
      const prods = window.productosBase || JSON.parse(localStorage.getItem('productosBase') || '[]');
      if (firstProd.productId) {
        const found = prods.find(x => String(x.id) === String(firstProd.productId));
        if (found && found.imagen) thumbnailSrc = found.imagen;
      }
      // Si no encontramos en productosBase, usar la imagen embebida en el pedido (si existe)
      if (!thumbnailSrc) thumbnailSrc = firstProd.imagen || (Array.isArray(firstProd.imagenes) ? firstProd.imagenes[0] : null);
    }
  } catch (e) { thumbnailSrc = firstProd && (firstProd.imagen || (Array.isArray(firstProd.imagenes) ? firstProd.imagenes[0] : null)) || null; }

  const thumbHtml = thumbnailSrc ? `<div class="pedido-thumb"><img src="${escapeHtml(thumbnailSrc)}" alt="thumb-${pedido.id}"/></div>` : `<div class="pedido-thumb placeholder">🖼️</div>`;

  // calcular seña y restante
  const recibidoVal = pedido.montoRecibido !== undefined && pedido.montoRecibido !== null ? Number(pedido.montoRecibido) : (pedido.estadoPago === 'seña_pagada' ? (Number(pedido.total || 0) * 0.5) : 0);
  const recibidoEstimado = pedido.montoRecibido === undefined || pedido.montoRecibido === null ? (pedido.estadoPago === 'seña_pagada') : false;
  const restanteVal = Math.max(0, (Number(pedido.total || 0) - recibidoVal));

    return `
      <div class="pedido-card" data-id="${pedido.id}">
        <div class="pedido-left">
          <div class="pedido-id">Pedido <strong>#${pedido.id}</strong> <span class="fecha-creacion">${fechaCreacion}</span></div>
          <div class="thumb-row">
            ${thumbHtml}
            <div class="thumb-badges">
              <div class="status-badge ${pedido.estado}">${estadoLabels[pedido.estado]}</div>
              <div class="pago-badge ${pedido.estadoPago}">${pagoLabels[pedido.estadoPago]}</div>
            </div>
          </div>
        </div>

        <div class="pedido-main">
          <div class="pedido-topline">
            <div class="productos-summary">📦 ${pedido.productos.length} ${pedido.productos.length === 1 ? 'producto' : 'productos'}</div>
            <div class="fechas-resumen">Entrega: <strong>${fechaConfirmadaEntregaDisplay}</strong> · Producción: <strong>${fechaProduccionDisplay}</strong></div>
          </div>

          <div class="resumen-financiero">
            <div>Seña: <strong>${formatCurrency(recibidoVal)}</strong> ${recibidoEstimado ? '<small style="color:#999; margin-left:6px;">(estimada)</small>' : ''}</div>
            <div>Restante: <strong>${formatCurrency(restanteVal)}</strong></div>
            <div class="pedido-total-inline">Total: <strong>${formatCurrency(pedido.total)}</strong></div>
          </div>
        </div>

        <div class="pedido-right">
          <div class="cliente-top">
            <div class="cliente-nombre">${escapeHtml(pedido.cliente.nombre)} ${escapeHtml(pedido.cliente.apellido)}</div>
            <div class="cliente-contact-line">${escapeHtml(pedido.cliente.telefono || pedido.telefono || '') ? '📞 ' + escapeHtml(pedido.cliente.telefono || pedido.telefono || '') : ''}</div>
            <div class="cliente-contact-line">${(() => { const e = (pedido.cliente && pedido.cliente.email) || pedido.userEmail || ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? (window.KONDAuth.currentUser() || {}).email : ''); return e ? ('📧 ' + escapeHtml(e)) : ''; })()}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Paginación UI (ajustar ID según el tipo)
  const pagerId = tipo === 'entregados' ? 'catalogoEntregadosPager' : 'catalogoPager';
  let pager = document.getElementById(pagerId);
  if (!pager) {
    pager = document.createElement('div');
    pager.id = pagerId;
    pager.className = 'pager';
    container.parentNode.insertBefore(pager, container.nextSibling);
  }
  pager.innerHTML = `
    <button class="pager-btn" id="${tipo}Prev" ${catalogoPage <= 1 ? 'disabled' : ''}>Anterior</button>
    <span style="margin:0 12px;">Página ${catalogoPage} / ${totalPages}</span>
    <button class="pager-btn" id="${tipo}Next" ${catalogoPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
  `;

  // Event listeners para paginación
  const renderFunction = tipo === 'entregados' ? renderPedidosCatalogoEntregados : renderPedidosCatalogoPendientes;
  document.getElementById(`${tipo}Prev`)?.addEventListener('click', () => { 
    if (catalogoPage > 1) { 
      catalogoPage--; 
      renderFunction(); 
    } 
  });
  document.getElementById(`${tipo}Next`)?.addEventListener('click', () => { 
    if (catalogoPage < totalPages) { 
      catalogoPage++; 
      renderFunction(); 
    } 
  });
  
  // Event listeners para abrir detalle
  container.querySelectorAll('.pedido-card').forEach(card => {
    card.addEventListener('click', () => {
      const pedidoId = parseInt(card.dataset.id);
      mostrarDetallePedido(pedidoId);
    });
  });

  // Actualizar estadísticas según el tipo
  if (tipo === 'pendientes') {
    updatePedidosStatsPendientes(pedidosCatalogo.filter(p => p.estado !== 'entregado'));
  } else if (tipo === 'entregados') {
    updatePedidosStatsEntregados(pedidosCatalogo.filter(p => p.estado === 'entregado'));
  }
}

// Función de compatibilidad para renderPedidosCatalogo (renderiza la sub-pestaña activa)
function renderPedidosCatalogo() {
  const activeSubtab = document.querySelector('.catalogo-subtab.active');
  if (activeSubtab?.dataset.subtab === 'entregados') {
    renderPedidosCatalogoEntregados();
  } else {
    renderPedidosCatalogoPendientes();
  }
}

// Actualizar estadísticas (función general - mantiene compatibilidad)
function updatePedidosStats() {
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
  
  const pendientes = pedidosCatalogo.filter(p => p.estado === 'pendiente').length;
  const confirmados = pedidosCatalogo.filter(p => p.estado === 'confirmado' || p.estado === 'en_produccion').length;
  const concretados = pedidosCatalogo.filter(p => p.estado === 'entregado').length;

  const totalPendiente = pedidosCatalogo.reduce((sum, p) => {
    const recibido = Number(p.montoRecibido || 0);
    const restante = Math.max(0, (p.total || 0) - recibido);
    return sum + restante;
  }, 0);

  const totalCobrado = pedidosCatalogo.reduce((sum, p) => sum + (Number(p.montoRecibido || 0)), 0);
  
  // Actualizar ambas sub-pestañas
  updatePedidosStatsPendientes(pedidosCatalogo.filter(p => p.estado !== 'entregado'));
  updatePedidosStatsEntregados(pedidosCatalogo.filter(p => p.estado === 'entregado'));
  updateCatalogoSubtabBadges();
}

// Estadísticas para pedidos pendientes
function updatePedidosStatsPendientes(pedidosPendientes) {
  const pendientes = pedidosPendientes.filter(p => p.estado === 'pendiente').length;
  const confirmados = pedidosPendientes.filter(p => p.estado === 'confirmado' || p.estado === 'en_produccion').length;
  const enProduccion = pedidosPendientes.filter(p => p.estado === 'en_produccion').length;

  const totalPendiente = pedidosPendientes.reduce((sum, p) => {
    const recibido = Number(p.montoRecibido || 0);
    const restante = Math.max(0, (p.total || 0) - recibido);
    return sum + restante;
  }, 0);

  const totalCobrado = pedidosPendientes.reduce((sum, p) => sum + (Number(p.montoRecibido || 0)), 0);
  
  const statPendientesPendientes = document.getElementById('statPendientesPendientes');
  const statConfirmados = document.getElementById('statConfirmados');
  const statEnProduccion = document.getElementById('statEnProduccion');
  const statTotal = document.getElementById('statTotal');
  const statCobrado = document.getElementById('statCobrado');
  
  if (statPendientesPendientes) statPendientesPendientes.textContent = pendientes;
  if (statConfirmados) statConfirmados.textContent = confirmados;
  if (statEnProduccion) statEnProduccion.textContent = enProduccion;
  if (statTotal) statTotal.textContent = formatCurrency(totalPendiente);
  if (statCobrado) statCobrado.textContent = formatCurrency(totalCobrado);
}

// Estadísticas para pedidos entregados
function updatePedidosStatsEntregados(pedidosEntregados) {
  const totalEntregados = pedidosEntregados.length;
  
  // Calcular entregados este mes
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const entregadosEsteMes = pedidosEntregados.filter(p => {
    const fechaEntrega = p.fechaEntrega ? new Date(p.fechaEntrega) : new Date(p.fechaCreacion);
    return fechaEntrega >= inicioMes;
  }).length;
  
  const totalEntregado = pedidosEntregados.reduce((sum, p) => sum + (Number(p.total || 0)), 0);
  
  const statEntregados = document.getElementById('statEntregados');
  const statEntregadosEsteMes = document.getElementById('statEntregadosEsteMes');
  const statTotalEntregado = document.getElementById('statTotalEntregado');
  
  if (statEntregados) statEntregados.textContent = totalEntregados;
  if (statEntregadosEsteMes) statEntregadosEsteMes.textContent = entregadosEsteMes;
  if (statTotalEntregado) statTotalEntregado.textContent = formatCurrency(totalEntregado);
}

// Mostrar detalle del pedido
function mostrarDetallePedido(pedidoId) {
  const pedido = pedidosCatalogo.find(p => p.id === pedidoId);
  if (!pedido) return;
  
  pedidoSeleccionado = pedido;
  
  const modal = document.getElementById('detallePedidoModal');
  if (!modal) return;
  
  // Llenar información del cliente
  document.getElementById('pedidoIdDisplay').textContent = `#${pedido.id}`;
  document.getElementById('detailClienteNombre').textContent = 
    `${pedido.cliente.nombre} ${pedido.cliente.apellido}`;
  document.getElementById('detailClienteTelefono').textContent = pedido.cliente.telefono;
  document.getElementById('detailClienteEmail').textContent = (pedido.cliente && pedido.cliente.email) || pedido.userEmail || ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? (window.KONDAuth.currentUser() || {}).email : 'No proporcionado') || 'No proporcionado';
  document.getElementById('detailClienteDireccion').textContent = pedido.cliente.direccion || 'No proporcionada';
  
  // Estado actual
  const estadoSelect = document.getElementById('detailEstadoSelect');
  if (estadoSelect) {
    // Poblar opciones si están vacías
    if (!estadoSelect.options || estadoSelect.options.length === 0) {
      estadoSelect.innerHTML = `
        <option value="pendiente">⏳ Pendiente confirmación</option>
        <option value="confirmado">✅ Confirmado</option>
        <option value="en_produccion">🔧 En Producción</option>
        <option value="listo">📦 Listo para entrega</option>
        <option value="entregado">🎉 Entregado</option>
      `;
    }
    estadoSelect.value = pedido.estado || 'pendiente';
    
    // Event listener para actualizar botón calendario inmediatamente al cambiar estado
    estadoSelect.addEventListener('change', function() {
      updateCalendarButtonVisibility(this.value, pedido);
    });
  }
  
  // Fechas
  const fechaSolicitada = document.getElementById('detailFechaSolicitada');
  if (fechaSolicitada) {
    if (pedido.fechaSolicitudEntrega) {
      const fecha = new Date(pedido.fechaSolicitudEntrega + 'T00:00:00');
      fechaSolicitada.textContent = fecha.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      fechaSolicitada.textContent = 'Sin fecha solicitada (asignar manualmente)';
    }
  }
  
  const fechaConfirmada = document.getElementById('detailFechaConfirmada');
  if (fechaConfirmada) {
    fechaConfirmada.value = pedido.fechaConfirmadaEntrega || '';
    
    // Event listener para actualizar botón calendario cuando cambie la fecha
    fechaConfirmada.addEventListener('change', function() {
      const estadoSelect = document.getElementById('detailEstadoSelect');
      if (estadoSelect) {
        updateCalendarButtonVisibility(estadoSelect.value, pedido);
      }
    });
  }

  const fechaProduccion = document.getElementById('detailFechaProduccion');
  if (fechaProduccion) {
    // mantener compatibilidad: usar pedido.fechaProduccion si existe
    fechaProduccion.value = pedido.fechaProduccion || '';
    // (antes había un botón lateral para asignar/confirmar; se eliminó)
  }
  
  // Badges de pago y método
  const badgePago = document.getElementById('detailBadgePago');
  const badgeMetodo = document.getElementById('detailBadgeMetodo');
  
  const pagoLabels = {
    'sin_seña': 'Sin seña',
    'seña_pagada': 'Seña pagada (50%)',
    'pagado_total': 'Pagado total'
  };
  
  const metodoPagoLabel = pedido.metodoPago === 'whatsapp' ? '📱 WhatsApp' : '💳 Transferencia';
  
  if (badgePago) {
    badgePago.textContent = pagoLabels[pedido.estadoPago];
    badgePago.className = `badge pago-badge ${pedido.estadoPago}`;
  }
  
  if (badgeMetodo) {
    badgeMetodo.textContent = metodoPagoLabel;
    badgeMetodo.className = 'badge';
  }
  
  // Productos
  const productosList = document.getElementById('detailProductosList');
  if (productosList) {
    productosList.innerHTML = pedido.productos.map(prod => `
      <div class="producto-detail-item">
        <div class="producto-detail-info">
          <div class="producto-detail-nombre">${escapeHtml(prod.nombre)}</div>
          <div class="producto-detail-specs">
            <span>📏 ${escapeHtml(prod.medidas || 'Sin medidas')}</span>
            <span>📦 Cantidad: ${prod.cantidad}</span>
            <span>💰 Precio unit: ${formatCurrency(prod.precioUnitario)}</span>
            <span>⏱ Tiempo: ${(() => {
              // intentar usar tiempo del propio objeto, sino buscar en productosBase por id
              const t = prod.tiempoUnitario || prod.tiempo || prod.tiempo_unitario;
              if (t) return t;
              // buscar en productosBase por varias posibles claves
              try {
                const base = Array.isArray(productosBase) ? productosBase : JSON.parse(localStorage.getItem('productosBase') || '[]');
                const found = base.find(bp => String(bp.id) === String(prod.productId || prod.productId) || String(bp.id) === String(prod.id));
                return (found && (found.tiempoUnitario || found.tiempo || found.tiempo_unitario)) || '00:00:00';
              } catch (e) { return '00:00:00'; }
            })()}</span>
          </div>
        </div>
        <div class="producto-detail-precio">
          ${formatCurrency(prod.subtotal)}
        </div>
      </div>
    `).join('');
  }
  
  // Resumen financiero
  document.getElementById('detailSubtotal').textContent = formatCurrency(pedido.subtotal);
  document.getElementById('detailTotal').textContent = formatCurrency(pedido.total);
  // Calcular tiempo total de producción si no viene en el pedido
  let tiempoTotal = Number(pedido.tiempoTotalProduccion || 0);
  if (!tiempoTotal) {
    try {
      const base = Array.isArray(productosBase) ? productosBase : JSON.parse(localStorage.getItem('productosBase') || '[]');
      tiempoTotal = (pedido.productos || []).reduce((sum, prod) => {
        // obtener tiempo unitario en formato HH:MM:SS y convertir a minutos
        const t = prod.tiempoUnitario || prod.tiempo || prod.tiempo_unitario || (base.find(bp => String(bp.id) === String(prod.productId || prod.id)) || {}).tiempoUnitario;
        if (!t) return sum;
        return sum + (typeof timeToMinutes === 'function' ? timeToMinutes(t) : 0);
      }, 0);
    } catch (e) { tiempoTotal = 0; }
  }
  document.getElementById('detailTiempo').textContent = `${tiempoTotal} min (${minutesToTime(tiempoTotal)})`;
  
  const descuentoRow = document.getElementById('detailDescuentoRow');
  if (pedido.descuento > 0) {
    document.getElementById('detailDescuento').textContent = `-${formatCurrency(pedido.descuento)}`;
    document.getElementById('detailDescuentoCodigo').textContent = pedido.descuentoCode || '';
    if (descuentoRow) descuentoRow.style.display = 'flex';
  } else {
    if (descuentoRow) descuentoRow.style.display = 'none';
  }
  
  // Comprobante
  const comprobanteSection = document.getElementById('comprobanteSection');
  if (pedido.comprobante) {
    const comprobanteImg = document.getElementById('comprobanteImagen');
    if (comprobanteImg) comprobanteImg.src = pedido.comprobante;
    if (comprobanteSection) comprobanteSection.style.display = 'block';
  } else {
    if (comprobanteSection) comprobanteSection.style.display = 'none';
  }
  
  // Notas
  const notasContent = document.getElementById('detailNotas');
  if (notasContent) {
    notasContent.textContent = pedido.notas || 'Sin notas adicionales';
  }
  
  // Mostrar botón de asignar calendario con estado correspondiente
  updateCalendarButtonVisibility(pedido.estado, pedido);
  
  // Forzar display antes de añadir la clase para evitar que quede con display:none
  modal.style.display = 'flex';
  modal.classList.add('show');
  // guardar id en dataset para que otros módulos (p.ej. pedidos internos) puedan delegar acciones
  modal.dataset.pedidoId = pedido.id;
  modal.dataset.source = 'catalogo';

  // Llenar selector de estado de pago si existe
  const estadoPagoSelect = document.getElementById('detailEstadoPagoSelect');
  if (estadoPagoSelect) {
    if (!estadoPagoSelect.options || estadoPagoSelect.options.length === 0) {
      estadoPagoSelect.innerHTML = `
        <option value="sin_seña">Sin seña</option>
        <option value="seña_pagada">Seña pagada</option>
        <option value="pagado_total">Pagado total</option>
      `;
    }
    estadoPagoSelect.value = pedido.estadoPago || 'sin_seña';
  }

  // Pre-cargar monto recibido
  const montoRecibidoInput = document.getElementById('detailMontoRecibido');
  if (montoRecibidoInput) {
    montoRecibidoInput.value = pedido.montoRecibido !== undefined ? pedido.montoRecibido : 0;
  }

  // Mostrar restante si hay seña
  const restanteEl = document.getElementById('detailRestante');
  if (restanteEl) {
    if (pedido.estadoPago === 'seña_pagada') {
      // Si existe montoRecibido usarlo, sino asumir 50% como seña convencional
      const recibido = pedido.montoRecibido !== undefined ? Number(pedido.montoRecibido) : (pedido.total || 0) * 0.5;
      const restante = Math.max(0, (pedido.total || 0) - recibido);
      restanteEl.textContent = formatCurrency(restante);
      restanteEl.style.display = 'block';
    } else {
      restanteEl.style.display = 'none';
    }
  }

  // Helper para recalcular restante dinámicamente según monto recibido y estadoPago
  function updateRestanteAndMonto() {
    const estadoPagoVal = document.getElementById('detailEstadoPagoSelect')?.value || pedido.estadoPago;
    const montoEl = document.getElementById('detailMontoRecibido');
    const restanteElLocal = document.getElementById('detailRestante');
    const total = Number(pedido.total || 0);
    let recibido = montoEl ? Number(montoEl.value || 0) : (pedido.montoRecibido || 0);

    if (estadoPagoVal === 'pagado_total') {
      // forzar monto recibido = total
      if (montoEl) montoEl.value = total;
      recibido = total;
    }

    if (restanteElLocal) {
      const restanteNow = Math.max(0, total - recibido);
      if (restanteNow > 0 && (estadoPagoVal === 'seña_pagada')) {
        restanteElLocal.textContent = formatCurrency(restanteNow);
        restanteElLocal.style.display = 'block';
      } else {
        restanteElLocal.style.display = 'none';
      }
    }
  }

  // Al cambiar el estado de pago actualizar monto recibido si corresponde
  if (estadoPagoSelect) {
    // evitar listeners duplicados: usar asignación directa
    estadoPagoSelect.onchange = () => updateRestanteAndMonto();
  }

  // Al cambiar manualmente el monto recibido recalcular restante
  if (montoRecibidoInput) {
    montoRecibidoInput.oninput = () => updateRestanteAndMonto();
  }

  // Ejecutar al abrir para forzar coherencia
  updateRestanteAndMonto();
}

// Guardar cambios del pedido
function guardarCambiosPedido() {
  if (!pedidoSeleccionado) return;
  
  const nuevoEstado = document.getElementById('detailEstadoSelect')?.value;
  const nuevaFechaConfirmada = document.getElementById('detailFechaConfirmada')?.value;
  const nuevaFechaProduccion = document.getElementById('detailFechaProduccion')?.value;
  const nuevoEstadoPago = document.getElementById('detailEstadoPagoSelect')?.value;
  const montoRecibidoInput = document.getElementById('detailMontoRecibido');
  const montoRecibidoVal = montoRecibidoInput ? parseFloat(montoRecibidoInput.value) || 0 : (pedidoSeleccionado.montoRecibido || 0);
  
  // Actualizar pedido
  const index = pedidosCatalogo.findIndex(p => p.id === pedidoSeleccionado.id);
  if (index !== -1) {
    // Mantener pago anterior y monto recibido previo para detectar cambios y calcular diferencias
    const previoEstadoPago = pedidoSeleccionado.estadoPago || null;
    const previoMontoRecibido = Number(pedidoSeleccionado.montoRecibido || 0);

    pedidosCatalogo[index].estado = nuevoEstado;
    // Determinar la fecha confirmada final: preferir la fecha nueva ingresada,
    // sino mantener la existente; si el pedido pasa a 'entregado' y no hay fecha,
      // Determinar la fecha confirmada final: preferir la fecha nueva ingresada,
    let finalFechaConfirmada = nuevaFechaConfirmada || pedidosCatalogo[index].fechaConfirmadaEntrega || null;
    if ((!finalFechaConfirmada || finalFechaConfirmada === '') && nuevoEstado === 'entregado') {
      // Formato YYYY-MM-DD compatible con inputs type=date y con el calendario
      finalFechaConfirmada = (new Date()).toISOString().slice(0,10);
    }
    pedidosCatalogo[index].fechaConfirmadaEntrega = finalFechaConfirmada || null;
    // Persistir fecha de producción (campo nuevo, opcional)
      // Emitir un cambio auxiliar para forzar storage event en otras pestañas y permitir listeners locales
      try {
        const markerKey = 'pedidosCatalogo_updated';
        localStorage.setItem(markerKey, (new Date()).toISOString());
        // also dispatch a custom event in the same window so listeners in same-tab can react immediately
        const ev = new CustomEvent('pedidosCatalogo:updated', { detail: { updatedAt: new Date().toISOString(), pedidoId: pedidosCatalogo[index].id } });
        window.dispatchEvent(ev);
      } catch (e) { /* ignore storage failures */ }
    if (nuevaFechaProduccion) pedidosCatalogo[index].fechaProduccion = nuevaFechaProduccion;
    else if (pedidoSeleccionado && pedidoSeleccionado.fechaProduccion && !nuevaFechaProduccion) {
      // si el input quedó vacío, permitir nulificar la fechaProduccion
      pedidosCatalogo[index].fechaProduccion = null;
    }

    // Si el pedido ya fue asignado al calendario, sincronizar también las fechas usadas por el calendario
    if (pedidosCatalogo[index].asignadoAlCalendario) {
      pedidosCatalogo[index].fechaProduccionCalendario = pedidosCatalogo[index].fechaProduccion || null;
      pedidosCatalogo[index].fechaEntregaCalendario = pedidosCatalogo[index].fechaConfirmadaEntrega || null;
    }

    // Actualizar objeto en memoria (pedidoSeleccionado) para que el modal refleje los cambios inmediatamente
    if (pedidoSeleccionado && pedidoSeleccionado.id === pedidosCatalogo[index].id) {
      pedidoSeleccionado.estado = pedidosCatalogo[index].estado;
      pedidoSeleccionado.fechaConfirmadaEntrega = pedidosCatalogo[index].fechaConfirmadaEntrega || pedidoSeleccionado.fechaConfirmadaEntrega;
      pedidoSeleccionado.fechaEntregaCalendario = pedidosCatalogo[index].fechaEntregaCalendario || pedidoSeleccionado.fechaEntregaCalendario;
      pedidoSeleccionado.fechaProduccion = pedidosCatalogo[index].fechaProduccion || pedidoSeleccionado.fechaProduccion;
      pedidoSeleccionado.asignadoAlCalendario = pedidosCatalogo[index].asignadoAlCalendario || pedidoSeleccionado.asignadoAlCalendario;
    }

    // Si el usuario forzó un estado de pago, aplicarlo; de lo contrario lo inferimos por monto
    if (nuevoEstadoPago) {
      pedidosCatalogo[index].estadoPago = nuevoEstadoPago;
    }

    // Si el admin marcó pagado_total, forzamos montoRecibido = total (independiente del input)
    const totalPedido = Number(pedidosCatalogo[index].total || 0);
    let nuevoMontoRecibido = montoRecibidoVal;
    if (pedidosCatalogo[index].estadoPago === 'pagado_total') {
      nuevoMontoRecibido = totalPedido;
    } else if (nuevoEstadoPago === 'pagado_total') {
      // Si el usuario seleccionó pagado_total mediante el select pero aún no fue aplicado en pedidosCatalogo
      nuevoMontoRecibido = totalPedido;
      pedidosCatalogo[index].estadoPago = 'pagado_total';
    }

    pedidosCatalogo[index].montoRecibido = nuevoMontoRecibido;

    // Si el usuario no forzó estadoPago, recalcularlo según el monto recibido
    if (!nuevoEstadoPago) {
      if (nuevoMontoRecibido >= totalPedido) {
        pedidosCatalogo[index].estadoPago = 'pagado_total';
      } else if (nuevoMontoRecibido >= (totalPedido * 0.5)) {
        pedidosCatalogo[index].estadoPago = 'seña_pagada';
      } else {
        pedidosCatalogo[index].estadoPago = 'sin_seña';
      }
    }

  // LÓGICA FINANCIERA MEJORADA: Registrar movimientos según cambios de estado de pago
    const nuevoEstadoPagoFinal = pedidosCatalogo[index].estadoPago;

    if (typeof registrarMovimiento === 'function') {
      // Si el monto recibido aumentó mientras el estado de pago se mantiene (ej: seña_pagada -> seña_pagada),
      // debemos registrar el incremento como movimiento independiente.
      if (nuevoMontoRecibido > previoMontoRecibido && previoEstadoPago === 'seña_pagada' && nuevoEstadoPagoFinal === 'seña_pagada') {
        const incrementoSena = nuevoMontoRecibido - previoMontoRecibido;
        if (incrementoSena > 0) {
          const pedido = pedidosCatalogo[index];
          const fechaMovimiento = new Date().toISOString().slice(0,10);
          registrarMovimiento({ 
            tipo: 'ingreso', 
            monto: incrementoSena, 
            categoria: 'Señas', 
            descripcion: `Seña adicional pedido #${pedido.id}`,
            fecha: fechaMovimiento,
            clienteName: (pedido.cliente && (pedido.cliente.nombre || pedido.cliente.apellido)) ? `${(pedido.cliente.nombre||'').trim()} ${(pedido.cliente.apellido||'').trim()}`.trim() : '',
            pedidoId: pedido.id
          });
        }
      }

      // Detectar cambios en estado de pago y registrar movimientos correspondientes
      if (previoEstadoPago !== nuevoEstadoPagoFinal) {
        const pedido = pedidosCatalogo[index];
        const fechaMovimiento = new Date().toISOString().slice(0,10);
        
        // 1. Si cambió de "sin_seña" a "seña_pagada" → registrar la seña (solo si no fue registrada desde catálogo)
        if (previoEstadoPago === 'sin_seña' && nuevoEstadoPagoFinal === 'seña_pagada') {
          // Verificar si la seña ya fue registrada automáticamente desde el catálogo
          const yaTieneSeñaRegistrada = pedido.comprobante || pedido.metodoPago === 'transferencia';
          
          if (!yaTieneSeñaRegistrada) {
            const montoSena = Math.max(0, nuevoMontoRecibido - previoMontoRecibido);
            if (montoSena > 0) {
              registrarMovimiento({ 
                tipo: 'ingreso', 
                monto: montoSena, 
                categoria: 'Señas', 
                descripcion: `Seña pedido #${pedido.id} (manual)`, 
                fecha: fechaMovimiento,
                clienteName: (pedido.cliente && (pedido.cliente.nombre || pedido.cliente.apellido)) ? `${(pedido.cliente.nombre||'').trim()} ${(pedido.cliente.apellido||'').trim()}`.trim() : '',
                pedidoId: pedido.id
              });
            }
          }
        }
        
        // 2. Si cambió de "sin_seña" directamente a "pagado_total" → registrar el monto completo
        else if (previoEstadoPago === 'sin_seña' && nuevoEstadoPagoFinal === 'pagado_total') {
          const montoCompleto = Math.max(0, nuevoMontoRecibido - previoMontoRecibido);
          if (montoCompleto > 0) {
            registrarMovimiento({ 
              tipo: 'ingreso', 
              monto: montoCompleto, 
              categoria: 'Ventas', 
              descripcion: `Pago completo pedido #${pedido.id}`, 
              fecha: fechaMovimiento,
              clienteName: (pedido.cliente && (pedido.cliente.nombre || pedido.cliente.apellido)) ? `${(pedido.cliente.nombre||'').trim()} ${(pedido.cliente.apellido||'').trim()}`.trim() : '',
              pedidoId: pedido.id
            });
          }
        }
        
        // 3. Si cambió de "seña_pagada" a "pagado_total" → registrar solo el restante
        else if (previoEstadoPago === 'seña_pagada' && nuevoEstadoPagoFinal === 'pagado_total') {
          const montoRestante = Math.max(0, nuevoMontoRecibido - previoMontoRecibido);
          if (montoRestante > 0) {
            registrarMovimiento({ 
              tipo: 'ingreso', 
              monto: montoRestante, 
              categoria: 'Ventas', 
              descripcion: `Pago restante pedido #${pedido.id}`, 
              fecha: fechaMovimiento,
              clienteName: (pedido.cliente && (pedido.cliente.nombre || pedido.cliente.apellido)) ? `${(pedido.cliente.nombre||'').trim()} ${(pedido.cliente.apellido||'').trim()}`.trim() : '',
              pedidoId: pedido.id
            });
          }
        }
        
        // 4. Si se recibió seña adicional mientras ya tenía seña → incremento de seña
        else if (previoEstadoPago === 'seña_pagada' && nuevoEstadoPagoFinal === 'seña_pagada' && nuevoMontoRecibido > previoMontoRecibido) {
          const incrementoSena = nuevoMontoRecibido - previoMontoRecibido;
          if (incrementoSena > 0) {
            registrarMovimiento({ 
              tipo: 'ingreso', 
              monto: incrementoSena, 
              categoria: 'Señas', 
              descripcion: `Seña adicional pedido #${pedido.id}`, 
              fecha: fechaMovimiento,
              clienteName: (pedido.cliente && (pedido.cliente.nombre || pedido.cliente.apellido)) ? `${(pedido.cliente.nombre||'').trim()} ${(pedido.cliente.apellido||'').trim()}`.trim() : '',
              pedidoId: pedido.id
            });
          }
        }
      }
    }
    // Notificar si el pedido pasó a 'entregado'
    try {
      const previoEstado = pedidoSeleccionado.estado || null;
      if (nuevoEstado === 'entregado' && previoEstado !== 'entregado') {
        const notifTitle = `Pedido #${pedidosCatalogo[index].id} entregado`;
        const notifBody = `El pedido ${pedidosCatalogo[index].id} fue marcado como entregado.`;
        try { addNotification({ title: notifTitle, body: notifBody, date: (new Date()).toISOString().slice(0,10), meta: { pedidoId: pedidosCatalogo[index].id } }); } catch(e){}
      }
    } catch(e) {}
    
    // Guardar de forma segura (puede omitir comprobante si hay QuotaExceeded)
    try {
      const res = savePedidosCatalogoSafely(pedidosCatalogo);
      if (!res || !res.success) throw res && res.error ? res.error : new Error('savePedidosCatalogoSafely failed');
      if (res.omittedComprobante) {
        showNotification('Pedido guardado sin comprobante (espacio local insuficiente)', 'warning');
      }
    } catch (e) {
      console.warn('Error guardando pedidosCatalogo, intentando fallback', e);
      try { localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo)); } catch (e2) { console.error('Fallback directo falló', e2); }
    }
    
    showNotification('Cambios guardados correctamente', 'success');
    renderPedidosCatalogo();
    updatePedidosStats();
    updateTabBadges();
    
    // Actualizar calendario para reflejar cambios de estado
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }
    
    // Actualizar modal
    mostrarDetallePedido(pedidoSeleccionado.id);
    // Cerrar modal tras guardar
    closeModal('detallePedidoModal');
  }
}

// Eliminar pedido
function eliminarPedido() {
  if (!pedidoSeleccionado) return;
  
  if (!confirm(`¿Estás seguro de eliminar el pedido #${pedidoSeleccionado.id}?`)) {
    return;
  }
  
  const index = pedidosCatalogo.findIndex(p => p.id === pedidoSeleccionado.id);
  if (index !== -1) {
    pedidosCatalogo.splice(index, 1);
    try {
      const res = savePedidosCatalogoSafely(pedidosCatalogo);
      if (!res || !res.success) throw res && res.error ? res.error : new Error('savePedidosCatalogoSafely failed');
    } catch (e) {
      console.warn('Error guardando pedidosCatalogo tras eliminar, intentando fallback', e);
      try { localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo)); } catch (e2) { console.error('Fallback directo falló', e2); }
    }
    
    showNotification('Pedido eliminado correctamente', 'success');
    closeModal('detallePedidoModal');
    renderPedidosCatalogo();
    updatePedidosStats();
    updateTabBadges();
    
    // Actualizar calendario para reflejar la eliminación
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }
  }
}

// Asignar pedido al calendario
function asignarPedidoAlCalendario() {
  if (!pedidoSeleccionado) return;

  // VERIFICAR SI YA FUE ASIGNADO PARA EVITAR DUPLICACIÓN
  if (pedidoSeleccionado.asignadoAlCalendario) {
    showNotification('Este pedido ya fue asignado al calendario anteriormente', 'warning');
    return;
  }

  // Leer los valores actuales de los inputs del modal (si el usuario cambió fechas sin guardar)
  const fechaProduccionInput = document.getElementById('detailFechaProduccion');
  const fechaConfirmadaInput = document.getElementById('detailFechaConfirmada');
  const fechaProduccion = (fechaProduccionInput && fechaProduccionInput.value) || pedidoSeleccionado.fechaProduccion || pedidoSeleccionado.fechaProduccionCalendario || '';
  const fechaEntrega = (fechaConfirmadaInput && fechaConfirmadaInput.value) || pedidoSeleccionado.fechaConfirmadaEntrega || pedidoSeleccionado.fechaEntregaCalendario || '';

  if (!fechaProduccion && !fechaEntrega) {
    showNotification('Debe asignar al menos una fecha (producción o entrega) antes de enviar al calendario', 'error');
    return;
  }

  // Marcar como asignado al calendario y persistir las fechas actuales
  const index = pedidosCatalogo.findIndex(p => p.id === pedidoSeleccionado.id);
  if (index !== -1) {
    pedidosCatalogo[index].estado = 'en_produccion';
    pedidosCatalogo[index].asignadoAlCalendario = true;

    // Guardar las fechas tanto en campos legibles como en los campos específicos para el calendario
    if (fechaProduccion) {
      pedidosCatalogo[index].fechaProduccion = fechaProduccion;
      pedidosCatalogo[index].fechaProduccionCalendario = fechaProduccion;
    }
    if (fechaEntrega) {
      pedidosCatalogo[index].fechaConfirmadaEntrega = fechaEntrega;
      pedidosCatalogo[index].fechaEntregaCalendario = fechaEntrega;
    }

    // Actualizar el objeto en memoria para reflejar los cambios inmediatamente
    pedidoSeleccionado.fechaProduccion = fechaProduccion || pedidoSeleccionado.fechaProduccion;
    pedidoSeleccionado.fechaConfirmadaEntrega = fechaEntrega || pedidoSeleccionado.fechaConfirmadaEntrega;
    pedidoSeleccionado.asignadoAlCalendario = true;

    try {
      const res = savePedidosCatalogoSafely(pedidosCatalogo);
      if (!res || !res.success) throw res && res.error ? res.error : new Error('savePedidosCatalogoSafely failed');
    } catch (e) {
      console.warn('Error guardando pedidosCatalogo al asignar calendario, intentando fallback', e);
      try { localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo)); } catch (e2) { console.error('Fallback directo falló', e2); }
    }
    if (typeof updateTabBadges === 'function') updateTabBadges();
  }

  showNotification('Pedido asignado al calendario correctamente', 'success');

  // Notificar asignación de fecha
  try {
    const parts = [];
    if (fechaProduccion) parts.push(`Producción: ${fechaProduccion}`);
    if (fechaEntrega) parts.push(`Entrega: ${fechaEntrega}`);
    const body = parts.length ? parts.join(' · ') : 'Fechas asignadas';
    addNotification({ title: `Pedido #${pedidoSeleccionado.id} asignado al calendario`, body, date: (new Date()).toISOString().slice(0,10), meta: { pedidoId: pedidoSeleccionado.id } });
  } catch(e){}

  // Actualizar vistas, pero NO cerrar el modal ni re-renderizar la lista completa
  // Mantener modal abierto para permitir más acciones del admin; sólo actualizar calendario, badges y estadísticas
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof updateTabBadges === 'function') updateTabBadges();
  if (typeof updatePedidosStats === 'function') updatePedidosStats();

  // Actualizar visibilidad y estado del botón de asignación dentro del modal
  try {
    updateCalendarButtonVisibility(pedidosCatalogo[index].estado, pedidosCatalogo[index]);
  } catch (e) { /* no-op si no está disponible */ }
}

// Contactar por WhatsApp
function contactarWhatsApp() {
  if (!pedidoSeleccionado) return;
  
  const cliente = pedidoSeleccionado.cliente;
  const telefono = cliente.telefono.replace(/\D/g, ''); // Solo números
  
  let mensaje = `Hola ${cliente.nombre}! Te contacto sobre tu pedido #${pedidoSeleccionado.id}:\n\n`;
  
  pedidoSeleccionado.productos.forEach(prod => {
    mensaje += `• ${prod.cantidad}x ${prod.nombre}\n`;
  });
  
  mensaje += `\nTotal: ${formatCurrency(pedidoSeleccionado.total)}`;
  
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// Contactar por Email
function contactarEmail() {
  if (!pedidoSeleccionado || !pedidoSeleccionado.cliente.email) {
    showNotification('El cliente no proporcionó email', 'error');
    return;
  }
  
  const cliente = pedidoSeleccionado.cliente;
  const subject = `Pedido #${pedidoSeleccionado.id} - Megafibro`;
  
  let body = `Hola ${cliente.nombre},\n\nTe contacto sobre tu pedido #${pedidoSeleccionado.id}:\n\n`;
  
  pedidoSeleccionado.productos.forEach(prod => {
    body += `• ${prod.cantidad}x ${prod.nombre} - ${formatCurrency(prod.subtotal)}\n`;
  });
  
  body += `\nTotal: ${formatCurrency(pedidoSeleccionado.total)}\n\n`;
  body += `Saludos,\nMegafibro`;
  
  const mailto = `mailto:${cliente.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

// Descargar comprobante
function descargarComprobante() {
  if (!pedidoSeleccionado || !pedidoSeleccionado.comprobante) return;

  const data = pedidoSeleccionado.comprobante;

  // Si es data URL (base64), convertir a Blob para forzar descarga con la extensión correcta
  if (typeof data === 'string' && data.startsWith('data:')) {
    const matches = data.match(/^data:(.+);base64,(.*)$/);
    if (matches) {
      const mime = matches[1];
      const b64 = matches[2];
      try {
        const byteChars = atob(b64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        const ext = (function(m){ if (m === 'application/pdf') return '.pdf'; if (m === 'image/png') return '.png'; if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg'; return ''; })(mime);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprobante-pedido-${pedidoSeleccionado.id}${ext}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        return;
      } catch (err) {
        console.error('Error al procesar comprobante base64', err);
      }
    }
  }

  // Fallback: si es una URL normal, inferir extensión y descargar
  const link = document.createElement('a');
  link.href = data;
  const guessedExt = (function(u){ try { const p = u.split('?')[0].split('#')[0]; const seg = p.split('.'); return seg.length>1?'.'+seg.pop() : '.jpg'; } catch(e){ return '.jpg'; } })(data);
  link.download = `comprobante-pedido-${pedidoSeleccionado.id}${guessedExt}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Setup event listeners
function setupPedidosEvents() {
  // Búsqueda y filtros
  const catalogoSearch = document.getElementById('catalogoSearch');
  if (catalogoSearch) {
    catalogoSearch.addEventListener('input', renderPedidosCatalogo);
  }
  
  const catalogoFilterEstado = document.getElementById('catalogoFilterEstado');
  if (catalogoFilterEstado) {
    catalogoFilterEstado.addEventListener('change', renderPedidosCatalogo);
  }
  
  const catalogoFilterPago = document.getElementById('catalogoFilterPago');
  if (catalogoFilterPago) {
    catalogoFilterPago.addEventListener('change', renderPedidosCatalogo);
  }
  
  // Botones del modal
  const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
  if (btnCerrarDetalle) {
    btnCerrarDetalle.addEventListener('click', () => {
      if (typeof closeModal === 'function') {
        closeModal('detallePedidoModal');
      } else {
        // Fallback: quitar clase show
        const modal = document.getElementById('detallePedidoModal');
        if (modal) modal.classList.remove('show');
      }
    });
  }
  
  const btnGuardarCambios = document.getElementById('btnGuardarCambios');
  if (btnGuardarCambios) {
    btnGuardarCambios.addEventListener('click', guardarCambiosPedido);
  }
  
  const btnEliminarPedido = document.getElementById('btnEliminarPedido');
  if (btnEliminarPedido) {
    btnEliminarPedido.addEventListener('click', eliminarPedido);
  }
  
  const btnAsignarCalendario = document.getElementById('btnAsignarCalendario');
  if (btnAsignarCalendario) {
    btnAsignarCalendario.addEventListener('click', asignarPedidoAlCalendario);
  }
  
  const btnContactWhatsApp = document.getElementById('btnContactWhatsApp');
  if (btnContactWhatsApp) {
    btnContactWhatsApp.addEventListener('click', contactarWhatsApp);
  }
  
  const btnContactEmail = document.getElementById('btnContactEmail');
  if (btnContactEmail) {
    btnContactEmail.addEventListener('click', contactarEmail);
  }
  
  const btnDescargarComprobante = document.getElementById('btnDescargarComprobante');
  if (btnDescargarComprobante) {
    btnDescargarComprobante.addEventListener('click', descargarComprobante);
  }
}

// Nota: usamos la función global `closeModal(modalId)` definida en js/modals.js

// Funciones auxiliares
function updateCalendarButtonVisibility(estadoValue, pedido) {
  const btnAsignarCalendario = document.getElementById('btnAsignarCalendario');
  if (!btnAsignarCalendario) return;
  
  if (pedido.asignadoAlCalendario) {
    // Ya fue asignado al calendario
    btnAsignarCalendario.style.display = 'block';
    btnAsignarCalendario.textContent = '✅ Ya asignado';
    btnAsignarCalendario.style.background = '#4CAF50';
    btnAsignarCalendario.disabled = true;
  } else if (estadoValue === 'confirmado') {
    // Mostrar botón cuando se selecciona "confirmado" (sin requerir fecha confirmada)
    btnAsignarCalendario.style.display = 'block';
    btnAsignarCalendario.textContent = '📅 Asignar al calendario';
    btnAsignarCalendario.style.background = '#2563eb';
    btnAsignarCalendario.disabled = false;
  } else {
    // Ocultar botón para otros estados
    btnAsignarCalendario.style.display = 'none';
  }
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

// Función para limpiar duplicados existentes en pedidos internos
function limpiarDuplicadosPedidosInternos() {
  const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
  
  // Crear mapa de pedidos internos por ID de catálogo
  const pedidosInternPorCatalogo = new Map();
  const pedidosParaMantener = [];
  
  pedidos.forEach(pedido => {
    // Buscar si este pedido interno está referenciado en algún pedido de catálogo
    const catalogo = pedidosCatalogo.find(pc => 
      pc.pedidosInternosIds && pc.pedidosInternosIds.includes(pedido.id)
    );
    
    if (catalogo) {
      // Es un pedido legítimo vinculado a catálogo
      pedidosParaMantener.push(pedido);
    } else {
      // Verificar si es un pedido duplicado basado en observaciones
      const observaciones = pedido.observaciones || '';
      const match = observaciones.match(/Pedido catálogo #(\d+)/);
      
      if (match) {
        const catalogoId = parseInt(match[1]);
        const catalogoRef = pedidosCatalogo.find(pc => pc.id === catalogoId);
        
        if (catalogoRef) {
          // Ver si ya tenemos pedidos internos para este catálogo
          if (!pedidosInternPorCatalogo.has(catalogoId)) {
            pedidosInternPorCatalogo.set(catalogoId, []);
          }
          pedidosInternPorCatalogo.get(catalogoId).push(pedido);
        } else {
          // El pedido de catálogo ya no existe, mantener el pedido interno
          pedidosParaMantener.push(pedido);
        }
      } else {
        // Pedido interno normal (no vinculado a catálogo)
        pedidosParaMantener.push(pedido);
      }
    }
  });
  
  // Para cada grupo de pedidos internos por catálogo, mantener solo los únicos
  let duplicadosEliminados = 0;
  
  pedidosInternPorCatalogo.forEach((pedidosGrupo, catalogoId) => {
    const catalogo = pedidosCatalogo.find(pc => pc.id === catalogoId);
    
    if (catalogo && catalogo.productos) {
      // Mantener solo un pedido interno por cada producto único del catálogo
      const pedidosUnicos = new Map();
      
      pedidosGrupo.forEach(pedido => {
        const key = `${pedido.productoId}-${pedido.cantidad}`;
        if (!pedidosUnicos.has(key)) {
          pedidosUnicos.set(key, pedido);
        } else {
          duplicadosEliminados++;
        }
      });
      
      pedidosUnicos.forEach(pedido => {
        pedidosParaMantener.push(pedido);
      });
      
      // Actualizar pedidosInternosIds en el catálogo
      const idsActualizados = Array.from(pedidosUnicos.values()).map(p => p.id);
      catalogo.pedidosInternosIds = idsActualizados;
    }
  });
  
  if (duplicadosEliminados > 0) {
    // Guardar datos limpiados
    localStorage.setItem('pedidos', JSON.stringify(pedidosParaMantener));
    localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo));
    
    showNotification(`Se eliminaron ${duplicadosEliminados} pedidos internos duplicados`, 'success');
    
    // Re-renderizar vistas
    if (typeof renderPedidos === 'function') renderPedidos();
    if (typeof renderPedidosCatalogo === 'function') renderPedidosCatalogo();
    if (typeof updateTabBadges === 'function') updateTabBadges();
  }
  
  return duplicadosEliminados;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPedidosCatalogo);
} else {
  initPedidosCatalogo();
}

// Escuchar cambios en localStorage (actualizaciones desde otra pestaña, p.ej. catálogo)
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key === 'pedidosCatalogo') {
    // Re-renderizar lista y stats
    if (typeof renderPedidosCatalogo === 'function') renderPedidosCatalogo();
    if (typeof updatePedidosStats === 'function') updatePedidosStats();
    if (typeof updateTabBadges === 'function') updateTabBadges();
  }
  if (e.key === 'pedidos') {
    if (typeof updateTabBadges === 'function') updateTabBadges();
    if (typeof renderPedidos === 'function') renderPedidos();
  }
});