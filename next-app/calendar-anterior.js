// calendar.js - versión consolidada
// Este archivo renderiza el calendario usando los globals de `main.js`:
// `productosBase`, `pedidos`, `currentMonth`.

function setupCalendarListeners() {
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  if (prevBtn) prevBtn.addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); });
}

// Inicializar cuando cargue la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupCalendarListeners();
    renderCalendar();
  });
} else {
  setupCalendarListeners();
  renderCalendar();
}
// Este módulo usa los globals definidos en `js/main.js`:
// `currentMonth`, `productosBase`, `pedidos`.
// No redeclarar esas variables aquí (si se redeclaran rompen la referencia compartida).

// ========== INICIALIZACIÓN ==========
function initCalendar() {
  loadCalendarData();
  renderCalendar();
  setupCalendarListeners();
}

// ========== CARGAR DATOS ==========
function loadCalendarData() {
  // Refrescar variables globales desde localStorage (clave correcta: 'productosBase')
  try {
    const storedPedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
    const storedProductos = JSON.parse(localStorage.getItem('productosBase') || '[]');
    // Asignar a las variables globales (declaradas en main.js). Si no existen, crearlas en window.
    if (typeof pedidos !== 'undefined') pedidos = storedPedidos;
    else window.pedidos = storedPedidos;

    if (typeof productosBase !== 'undefined') productosBase = storedProductos;
    else window.productosBase = storedProductos;
  } catch (e) {
    console.error('Error leyendo localStorage en calendar.loadCalendarData', e);
    pedidos = pedidos || [];
    productosBase = productosBase || [];
  }
}

// ========== RENDERIZAR CALENDARIO ==========
function renderCalendar() {
  // Cargar datos más recientes antes de renderizar
  loadCalendarData();
  const calendar = document.querySelector('.calendar');
  const monthDisplay = document.getElementById('currentMonth');
  const monthTotalTime = document.getElementById('monthTotalTime');
  const monthTotalPrice = document.getElementById('monthTotalPrice');
  
  if (!calendar || !monthDisplay) return;
  
  calendar.innerHTML = '';

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  monthDisplay.textContent = currentMonth.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let totalMonthMinutes = 0;
  let totalMonthPrice = 0;
  // Cargar pedidos de catálogo asignados para contabilizarlos en el calendario
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');

  // Días vacíos al inicio
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendar.appendChild(emptyDay);
  }

  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayPedidos = (Array.isArray(pedidos) ? pedidos : []).filter(p => p.fecha === dateStr);

    // Minutos y precio de pedidos internos
    const internosMinutes = dayPedidos.reduce((sum, p) => {
      const prod = (Array.isArray(productosBase) ? productosBase : []).find(pr => Number(pr.id) === Number(p.productoId));
      return sum + (prod ? timeToMinutes(prod.tiempoUnitario) * (p.cantidad || 0) : 0);
    }, 0);

    const internosPrice = dayPedidos.reduce((sum, p) => {
      const prod = (Array.isArray(productosBase) ? productosBase : []).find(pr => Number(pr.id) === Number(p.productoId));
      return sum + (prod ? (Number(prod.precioUnitario) || 0) * (p.cantidad || 0) : 0);
    }, 0);

    // Pedidos de catálogo asignados para este día
    const dayPedidosCatalogo = (Array.isArray(pedidosCatalogo) ? pedidosCatalogo : []).filter(p =>
      p.asignadoAlCalendario &&
      (p.fechaProduccionCalendario === dateStr || p.fechaEntregaCalendario === dateStr) &&
      p.estado !== 'entregado'
    );

    // Contabilizar tiempo y precio sólo en fecha de producción
    const catalogoMinutes = dayPedidosCatalogo.reduce((sum, pc) => {
      if (pc.fechaProduccionCalendario === dateStr) {
        return sum + (pc.productos || []).reduce((prodSum, prod) => {
          const prodBase = (Array.isArray(productosBase) ? productosBase : []).find(pb => String(pb.id) === String(prod.productId));
          return prodSum + (prodBase ? timeToMinutes(prodBase.tiempoUnitario) * (prod.cantidad || 0) : 0);
        }, 0);
      }
      return sum;
    }, 0);

    const catalogoPrice = dayPedidosCatalogo.reduce((sum, pc) => {
      if (pc.fechaProduccionCalendario === dateStr) return sum + (pc.total || 0);
      return sum;
    }, 0);

    const dayMinutes = internosMinutes + catalogoMinutes;
    const dayPrice = internosPrice + catalogoPrice;

    totalMonthMinutes += dayMinutes;
    totalMonthPrice += dayPrice;

    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day${today.getFullYear() === year && today.getMonth() === month && today.getDate() === day ? ' current' : ''}`;
    dayDiv.dataset.date = dateStr;
    dayDiv.innerHTML = `
    <div style="font-weight:700; color:#0984e3;">${day}</div>
      <div style="font-size:0.85rem; color:#cfcfcf;">${minutesToTime(dayMinutes)}</div>
      <div style="font-size:0.85rem; color:#4CAF50;">${formatCurrency(dayPrice)}</div>
    `;
    dayDiv.addEventListener('click', () => showCalendarModal(dateStr));
    calendar.appendChild(dayDiv);
  }

  if (monthTotalTime) monthTotalTime.textContent = minutesToTime(totalMonthMinutes);
  if (monthTotalPrice) monthTotalPrice.textContent = formatCurrency(totalMonthPrice);
}

// ========== CONFIGURAR LISTENERS ==========
function setupCalendarListeners() {
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    });
  }
  
  // Event delegation para botones de acciones en el calendario
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="view-catalogo"]')) {
      const btn = e.target.closest('[data-action="view-catalogo"]');
      const catalogoId = parseInt(btn.dataset.id);
      if (typeof mostrarDetallePedido === 'function') {
        mostrarDetallePedido(catalogoId);
      }
    }
    
    if (e.target.closest('[data-action="delete-pedido"]')) {
      const btn = e.target.closest('[data-action="delete-pedido"]');
      const pedidoId = btn.dataset.id;
      deletePedido(pedidoId);
    }
    
    if (e.target.closest('[data-action="view-pedido"]')) {
      const btn = e.target.closest('[data-action="view-pedido"]');
      const pedidoId = btn.dataset.id;
      // Aquí podrías abrir un modal de detalle para pedidos internos si lo deseas
      console.log('Ver pedido interno:', pedidoId);
    }
  });
}

// ========== MOSTRAR MODAL DEL CALENDARIO ==========
function showCalendarModal(dateStr) {
  const modal = document.getElementById('calendarModal');
  if (!modal) return;
  
  // Forzar display para sobreescribir inline styles que puedan bloquear la visualización
  modal.style.display = 'flex';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  modal.dataset.currentDate = dateStr;
  
  // Mostrar fecha en el modal
  const modalDateDisplay = document.getElementById('modalDateDisplay');
  if (modalDateDisplay) {
  const { parseDateYMD } = require('./utils/catalogUtils')
  const date = parseDateYMD(dateStr) || new Date(dateStr + 'T00:00:00');
    modalDateDisplay.textContent = date.toLocaleDateString('es-AR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  renderDayProducts(dateStr);
  populateProductSelect();
  updateDaySummary(dateStr);
}

// ========== RENDERIZAR PRODUCTOS DEL DÍA ==========
function renderDayProducts(dateStr) {
  const dayProductList = document.getElementById('dayProductList');
  if (!dayProductList) return;
  
  // Obtener pedidos internos del día
  const dayPedidosInternos = (Array.isArray(pedidos) ? pedidos : []).filter(p => p.fecha === dateStr);
  
  // Obtener pedidos de catálogo asignados al día (excluir entregados)
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
  const dayPedidosCatalogo = pedidosCatalogo.filter(p => 
    p.asignadoAlCalendario && 
    (p.fechaProduccionCalendario === dateStr || p.fechaEntregaCalendario === dateStr) &&
    p.estado !== 'entregado'
  );
  
  // Combinar todos los pedidos
  const allDayItems = [];
  
  // Agregar pedidos internos
  dayPedidosInternos.forEach(pedido => {
    const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => Number(p.id) === Number(pedido.productoId));
    if (producto) {
      allDayItems.push({
        type: 'interno',
        id: pedido.id,
        producto: producto,
        cantidad: pedido.cantidad,
        cliente: pedido.cliente,
        observaciones: pedido.observaciones,
        totalTime: timeToMinutes(producto.tiempoUnitario) * pedido.cantidad,
        totalPrice: producto.precioUnitario * pedido.cantidad,
        data: pedido
      });
    }
  });
  
  // Agregar pedidos de catálogo
  dayPedidosCatalogo.forEach(pedidoCatalogo => {
    // Determinar si este día es de producción o entrega
    const esProduccion = pedidoCatalogo.fechaProduccionCalendario === dateStr;
    const esEntrega = pedidoCatalogo.fechaEntregaCalendario === dateStr;
    
    // Función para obtener texto relativo de fecha
    // Nota: parseamos la fecha como LOCAL (YYYY-MM-DD) para evitar desfases por zona horaria
    const parseLocalDate = (s) => {
      const parts = String(s).split('-').map(Number);
      if (parts.length !== 3) return new Date(s);
      const [y, m, d] = parts;
      return new Date(y, (m || 1) - 1, d || 1);
    };

    const formatDateStr = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    const getRelativeDateText = (fecha) => {
      const today = new Date();
      const todayStr = formatDateStr(today);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = formatDateStr(yesterday);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = formatDateStr(tomorrow);

      if (fecha === todayStr) return 'hoy';
      if (fecha === yesterdayStr) return 'ayer';
      if (fecha === tomorrowStr) return 'mañana';

      // Para otras fechas, usar el día de la semana (parseado como fecha local)
      const targetDate = parseLocalDate(fecha);
      const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      return days[targetDate.getDay()];
    };
    
    pedidoCatalogo.productos.forEach(prod => {
      const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => Number(p.id) === Number(prod.productId));
      if (producto) {
        // Crear diferentes entradas según el tipo de fecha
        if (esProduccion) {
          const fechaReal = pedidoCatalogo.fechaProduccionCalendario || dateStr;
          const relativeDateText = getRelativeDateText(fechaReal);
          
          // DEBUG: logging temporal para depurar el problema
          console.log('DEBUG PRODUCCION:', {
            pedidoId: pedidoCatalogo.id,
            fechaProduccionCalendario: pedidoCatalogo.fechaProduccionCalendario,
            dateStr: dateStr,
            fechaReal: fechaReal,
            relativeDateText: relativeDateText
          });
          
          allDayItems.push({
            type: 'catalogo-produccion',
            id: `${pedidoCatalogo.id}-${prod.productId}-prod`,
            catalogoId: pedidoCatalogo.id,
            producto: producto,
            cantidad: prod.cantidad,
            cliente: `${pedidoCatalogo.cliente.nombre} ${pedidoCatalogo.cliente.apellido || ''}`.trim(),
            observaciones: `⚙️ Producir ${relativeDateText} - Pedido #${pedidoCatalogo.id}`,
            totalTime: timeToMinutes(producto.tiempoUnitario) * prod.cantidad,
            totalPrice: prod.subtotal,
            data: pedidoCatalogo
          });
        }
        
        if (esEntrega) {
          const relativeDateText = getRelativeDateText(pedidoCatalogo.fechaEntregaCalendario || dateStr);
          allDayItems.push({
            type: 'catalogo-entrega',
            id: `${pedidoCatalogo.id}-${prod.productId}-ent`,
            catalogoId: pedidoCatalogo.id,
            producto: producto,
            cantidad: prod.cantidad,
            cliente: `${pedidoCatalogo.cliente.nombre} ${pedidoCatalogo.cliente.apellido || ''}`.trim(),
            observaciones: `📦 Entrega ${relativeDateText} - Pedido #${pedidoCatalogo.id}`,
            totalTime: 0, // La entrega no consume tiempo de producción
            totalPrice: 0, // No contar el precio en entrega para evitar duplicados
            data: pedidoCatalogo
          });
        }
      }
    });
  });
  
  if (allDayItems.length === 0) {
    dayProductList.innerHTML = '<div class="empty-state">No hay pedidos asignados para este día</div>';
    return;
  }
  
  // Mostrar versión compacta: primeros 6 pedidos y opción de "mostrar más"
  const MAX_VISIBLE = 6;
  const visible = allDayItems.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, allDayItems.length - MAX_VISIBLE);

  dayProductList.innerHTML = visible.map(item => {
    // Determinar badge y icono según el tipo
    let tipoIcon, tipoBadge;
    
    if (item.type === 'interno') {
      tipoIcon = '🏭';
      tipoBadge = 'interno';
    } else if (item.type === 'catalogo-produccion') {
      tipoIcon = '⚙️';
      tipoBadge = 'catalogo-produccion';
    } else if (item.type === 'catalogo-entrega') {
      tipoIcon = '📦';
      tipoBadge = 'catalogo-entrega';
    } else {
      // Fallback para compatibilidad
      tipoIcon = '🛒';
      tipoBadge = 'catalogo';
    }
    
    return `
      <div class="day-product-item compact-item" data-type="${item.type}">
        <div class="tipo-badge ${tipoBadge}">${tipoIcon}</div>
        ${item.producto.imagen ? `<img src="${item.producto.imagen}" class="product-mini-img" alt="${item.producto.nombre}">` : '<div class="product-mini-placeholder">Sin</div>'}
        <div class="product-info">
          <div class="product-name">${item.producto.nombre}</div>
          <div class="product-details">
            <div class="product-detail-item"><strong>${item.cantidad}×</strong></div>
            <div class="product-detail-item"><strong>${minutesToTime(item.totalTime)}</strong></div>
            <div class="product-detail-item cliente">${item.cliente}</div>
            <div class="product-detail-item observaciones">${item.observaciones}</div>
          </div>
        </div>
        <div class="day-item-actions">
          ${item.type.startsWith('catalogo') ? 
            `<button class="btn-view" title="Ver pedido catálogo" data-action="view-catalogo" data-id="${item.catalogoId}">🔍</button>` :
            `<button class="btn-view" title="Ver pedido interno" data-action="view-pedido" data-id="${item.id}" data-fecha="${dateStr}">🔍</button>
             <button class="btn-delete" data-action="delete-pedido" data-id="${item.id}" title="Eliminar pedido">🗑️</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  if (hiddenCount > 0) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'btn-more';
    moreBtn.textContent = `Mostrar ${hiddenCount} pedido(s) más`;
    moreBtn.addEventListener('click', () => {
      // Renderizar todos
        dayProductList.innerHTML = dayPedidos.map(pedido => {
        const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => Number(p.id) === Number(pedido.productoId));
        if (!producto) return '';
        const totalTime = timeToMinutes(producto.tiempoUnitario) * pedido.cantidad;
        const totalPrice = producto.precioUnitario * pedido.cantidad;
        return `
          <div class="day-product-item">
            ${producto.imagen ? `<img src="${producto.imagen}" class="product-mini-img" alt="${producto.nombre}">` : '<div class="product-mini-placeholder">Sin imagen</div>'}
            <div class="product-info">
              <div class="product-name">${producto.nombre}</div>
              <div class="product-details">
                <div class="product-detail-item"><strong>Cantidad:</strong> ${pedido.cantidad}</div>
                <div class="product-detail-item"><strong>Tiempo:</strong> ${minutesToTime(totalTime)}</div>
                <div class="product-detail-item"><strong>Valor:</strong> ${formatCurrency(totalPrice)}</div>
                ${pedido.cliente ? `<div class="product-detail-item full-width"><strong>Cliente:</strong> ${pedido.cliente}</div>` : ''}
                ${pedido.observaciones ? `<div class="product-detail-item full-width"><strong>Obs:</strong> ${pedido.observaciones}</div>` : ''}
              </div>
            </div>
            <div class="day-item-actions">
              <button class="btn-view" title="Ver pedido" data-action="view-pedido" data-id="${pedido.id}" data-fecha="${pedido.fecha}">🔍 Ver</button>
              <button class="btn-delete" data-action="delete-pedido" data-id="${pedido.id}" title="Eliminar pedido">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    });
    dayProductList.appendChild(moreBtn);
  }
}

// ========== POBLAR SELECT DE PRODUCTOS ==========
function populateProductSelect() {
  const select = document.getElementById('modalProductSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Selecciona un producto</option>' +
    productosBase.map(p => 
      `<option value="${p.id}">${p.nombre} - ${formatCurrency(p.precioUnitario)}</option>`
    ).join('');
  
  // Evitar añadir múltiples listeners en llamadas repetidas
  select.removeEventListener?.('change', updateProductPreview);
  select.addEventListener('change', updateProductPreview);
}

// ========== ACTUALIZAR PREVIEW DEL PRODUCTO ==========
function updateProductPreview() {
  const select = document.getElementById('modalProductSelect');
  const preview = document.getElementById('selectedProductPreview');
  const cantidadInput = document.getElementById('modalCantidad');
  
  if (!select || !preview) return;
  
  const productoId = Number(select.value);
  if (!productoId) {
    preview.classList.remove('show');
    return;
  }
  
  const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => Number(p.id) === productoId);
  if (!producto) return;
  
  const cantidad = parseInt(cantidadInput?.value || 1);
  const totalTime = timeToMinutes(producto.tiempoUnitario) * cantidad;
  const totalPrice = producto.precioUnitario * cantidad;
  
  preview.innerHTML = `
    ${producto.imagen 
      ? `<img src="${producto.imagen}" class="preview-img" alt="${producto.nombre}">` 
      : '<div class="product-mini-placeholder" style="width:70px;height:70px;">Sin imagen</div>'}
    <div class="preview-info">
      <div class="preview-name">${producto.nombre}</div>
      <div class="preview-specs">
        <span>⏱️ ${minutesToTime(totalTime)}</span>
        <span>💰 ${formatCurrency(totalPrice)}</span>
        <span>📦 ${producto.medidas || 'N/A'}</span>
      </div>
    </div>
  `;
  preview.classList.add('show');
  
  // Actualizar campos calculados
  updateCalculatedFields(producto, cantidad);
}

// ========== ACTUALIZAR CAMPOS CALCULADOS ==========
function updateCalculatedFields(producto, cantidad) {
  const totalPrice = producto.precioUnitario * cantidad;
  const senaInput = document.getElementById('modalSena');
  const pedidoTotal = document.getElementById('modalPedidoTotal');
  const restante = document.getElementById('modalRestante');
  
  if (pedidoTotal) pedidoTotal.textContent = formatCurrency(totalPrice);
  
  if (senaInput && restante) {
    const sena = parseFloat(senaInput.value || 0);
    restante.textContent = formatCurrency(Math.max(0, totalPrice - sena));
  }
}

// ========== ACTUALIZAR RESUMEN DEL DÍA ==========
function updateDaySummary(dateStr) {
  const dayPedidos = (Array.isArray(pedidos) ? pedidos : []).filter(p => p.fecha === dateStr);
  
  // Obtener pedidos de catálogo del día
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
  const dayPedidosCatalogo = pedidosCatalogo.filter(p => 
    p.asignadoAlCalendario && 
    (p.fechaProduccionCalendario === dateStr || p.fechaEntregaCalendario === dateStr) &&
    p.estado !== 'entregado'
  );
  
  let totalMinutes = 0;
  let totalMoney = 0;
  
  // Calcular totales de pedidos internos
  dayPedidos.forEach(pedido => {
    const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => Number(p.id) === Number(pedido.productoId));
    if (producto) {
      totalMinutes += timeToMinutes(producto.tiempoUnitario) * pedido.cantidad;
      totalMoney += producto.precioUnitario * pedido.cantidad;
    }
  });
  
  // Calcular totales de pedidos catálogo (solo en día de producción)
  dayPedidosCatalogo.forEach(pedidoCatalogo => {
    if (pedidoCatalogo.fechaProduccionCalendario === dateStr) {
      (pedidoCatalogo.productos || []).forEach(prod => {
        const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => Number(p.id) === Number(prod.productId));
        if (producto) {
          totalMinutes += timeToMinutes(producto.tiempoUnitario) * prod.cantidad;
          totalMoney += prod.subtotal || 0;
        }
      });
    }
  });
  
  const dayTotalMin = document.getElementById('dayTotalMin');
  const dayTotalMoney = document.getElementById('dayTotalMoney');
  const capacityText = document.getElementById('capacityText');
  const capacityFill = document.getElementById('capacityFill');
  
  if (dayTotalMin) dayTotalMin.textContent = minutesToTime(totalMinutes);
  if (dayTotalMoney) dayTotalMoney.textContent = formatCurrency(totalMoney);
  
  // Capacidad (asumiendo 8 horas = 480 minutos por día)
  const capacity = Math.min(100, (totalMinutes / 480) * 100);
  if (capacityText) capacityText.textContent = `${capacity.toFixed(0)}%`;
  if (capacityFill) capacityFill.style.width = `${capacity}%`;
}

// ========== ELIMINAR PEDIDO ==========
function deletePedido(pedidoId) {
  if (!confirm('¿Eliminar este pedido del calendario?')) return;
  
  // Normalizar tipos (pedidos pueden tener id string o number)
  pedidos = (Array.isArray(pedidos) ? pedidos : []).filter(p => String(p.id) !== String(pedidoId));
  localStorage.setItem('pedidos', JSON.stringify(pedidos));
  if (typeof updateTabBadges === 'function') updateTabBadges();
  
  const modal = document.getElementById('calendarModal');
  const dateStr = modal?.dataset.currentDate;
  if (dateStr) {
    renderDayProducts(dateStr);
    updateDaySummary(dateStr);
  }
  renderCalendar();
  showNotification('Pedido eliminado correctamente');
}

// ========== GUARDAR NUEVO PEDIDO ==========
function saveNewPedido() {
  const modal = document.getElementById('calendarModal');
  const dateStr = modal?.dataset.currentDate;
  
  const productoId = parseInt(document.getElementById('modalProductSelect')?.value);
  const cantidad = parseInt(document.getElementById('modalCantidad')?.value || 1);
  // Leer inputs de forma segura (algunos pueden no existir en la UI simplificada)
  const clienteEl = document.getElementById('modalCliente');
  const cliente = clienteEl ? (clienteEl.value || '').trim() : '';
  const personalizado = Boolean(document.getElementById('modalPersonalizado')?.checked);
  const sena = parseFloat(document.getElementById('modalSena')?.value || 0);
  const observacionesEl = document.getElementById('modalObservaciones');
  const observaciones = observacionesEl ? (observacionesEl.value || '').trim() : '';
  
  if (!productoId) {
    showNotification('Selecciona un producto', 'error');
    return;
  }
  
  // Buscar el producto de forma robusta (IDs pueden ser string/number)
  const producto = (Array.isArray(productosBase) ? productosBase : []).find(p => String(p.id) === String(productoId));
  if (!producto) {
    showNotification('Producto no encontrado', 'error');
    return;
  }
  const pedidoTotal = (Number(producto.precioUnitario) || 0) * cantidad;
  
  const nuevoPedido = {
    id: Date.now() + Math.floor(Math.random() * 100000),
    fecha: dateStr,
    productoId: productoId,
    cantidad: cantidad,
    cliente: cliente,
    personalizado: personalizado,
    sena: sena,
    pedidoTotal: pedidoTotal,
    restante: pedidoTotal - sena,
    observaciones: observaciones,
    fechaCreacion: new Date().toISOString()
  };
  
  pedidos.push(nuevoPedido);
  localStorage.setItem('pedidos', JSON.stringify(pedidos));
  if (typeof updateTabBadges === 'function') updateTabBadges();
  // Forzar recarga en memoria desde localStorage para evitar inconsistencias entre módulos
  try {
    const stored = JSON.parse(localStorage.getItem('pedidos') || '[]');
    if (typeof pedidos !== 'undefined') pedidos = stored;
    else window.pedidos = stored;
  } catch (e) {
    console.error('Error recargando pedidos desde localStorage', e);
  }
  
  // Limpiar formulario
  const sel = document.getElementById('modalProductSelect'); if (sel) sel.value = '';
  const cant = document.getElementById('modalCantidad'); if (cant) cant.value = '1';
  if (clienteEl) clienteEl.value = '';
  const personalizadoEl = document.getElementById('modalPersonalizado'); if (personalizadoEl) personalizadoEl.checked = false;
  const senaEl = document.getElementById('modalSena'); if (senaEl) senaEl.value = '';
  if (observacionesEl) observacionesEl.value = '';
  const previewEl = document.getElementById('selectedProductPreview'); if (previewEl && previewEl.classList) previewEl.classList.remove('show');
  
  renderDayProducts(dateStr);
  updateDaySummary(dateStr);
  renderCalendar();
  showNotification('Pedido asignado correctamente');

  // Colapsar el formulario "Nuevo pedido" si está abierto
  const newContent = document.getElementById('newPedidoContent');
  const newToggle = document.getElementById('newPedidoToggle');
  if (newContent && newToggle) {
    newContent.style.display = 'none';
    newContent.classList.remove('open');
    newToggle.setAttribute('aria-expanded', 'false');
  }
}

// ========== CERRAR MODAL ==========
function closeCalendarModal() {
  const modal = document.getElementById('calendarModal');
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
  }
}

// ========== CONFIGURAR BOTONES DEL MODAL ==========
function setupModalButtons() {
  const saveBtn = document.getElementById('modalSaveBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const closeBtn = document.querySelector('#calendarModal .close-modal');
  const cantidadInput = document.getElementById('modalCantidad');
  const senaInput = document.getElementById('modalSena');
  const personalizadoToggle = document.getElementById('modalPersonalizado');
  
  if (saveBtn) saveBtn.addEventListener('click', saveNewPedido);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCalendarModal);
  if (closeBtn) closeBtn.addEventListener('click', closeCalendarModal);
  
  if (cantidadInput) {
    cantidadInput.addEventListener('input', () => {
      const select = document.getElementById('modalProductSelect');
      if (select?.value) updateProductPreview();
    });
  }
  
  if (senaInput) {
    senaInput.addEventListener('input', () => {
      const select = document.getElementById('modalProductSelect');
      const cantidad = parseInt(document.getElementById('modalCantidad')?.value || 1);
      const productoId = parseInt(select?.value);
      if (productoId) {
        const producto = productosBase.find(p => p.id === productoId);
        if (producto) updateCalculatedFields(producto, cantidad);
      }
    });
  }
  
  if (personalizadoToggle) {
    personalizadoToggle.addEventListener('change', (e) => {
      const label = document.getElementById('personalizadoLabel');
      if (label) label.textContent = e.target.checked ? 'Sí' : 'No';
    });
  }

  // Accordion toggle for new pedido
  const newToggle = document.getElementById('newPedidoToggle');
  const newContent = document.getElementById('newPedidoContent');
  if (newToggle && newContent) {
    function toggleNewPedido() {
      const expanded = newToggle.getAttribute('aria-expanded') === 'true';
      newToggle.setAttribute('aria-expanded', String(!expanded));
      if (expanded) {
        newContent.style.display = 'none';
        newContent.classList.remove('open');
      } else {
        newContent.style.display = 'block';
        newContent.classList.add('open');
      }
    }
    newToggle.addEventListener('click', toggleNewPedido);
    newToggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') toggleNewPedido(); });
  }
}

// ========== INICIALIZAR CUANDO SE CARGA LA PÁGINA ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    setupModalButtons();
  });
} else {
  initCalendar();
  setupModalButtons();
}