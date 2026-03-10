// ==================== GESTIÓN DE MODALES ====================

function showImageModal(src) {
  const modal = document.getElementById('imageModal');
  if (!modal) return;
  const img = modal.querySelector('.modal-image');
  if (img) img.src = src;
  modal.classList.add('show');
  modal.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return; // IMPORTANTE: Validar que el modal existe
  
  modal.classList.remove('show');
  // Asegurar que el modal quede oculto aunque tenga estilos inline
  modal.style.display = 'none';
  
  // Limpiar formulario al cerrar
  if (modalId === 'calendarModal') {
    resetModalForm();
    resetAccordion();
  }
}

// Cerrar modales al hacer clic en el botón X (usando delegación de eventos)
document.body.addEventListener('click', (e) => {
  // Proteger en caso de que e.target sea un nodo de texto (p.ej. el carácter ×)
  const closeBtn = (e.target && typeof e.target.closest === 'function') ? e.target.closest('.close-modal') : null;
  if (closeBtn) {
    e.preventDefault();
    e.stopPropagation();
    const modal = (typeof closeBtn.closest === 'function') ? closeBtn.closest('.image-modal, .calendar-modal, .pedido-modal, .checkout-modal, .cart-modal') : null;
    if (modal && modal.id) {
      closeModal(modal.id);
    }
  }
});

// Cerrar modal al hacer clic fuera del contenido
document.body.addEventListener('click', (e) => {
  // Asegurarnos de que e.target sea un Element con classList
  const target = (e.target && e.target.classList) ? e.target : null;
  if (target && (
      target.classList.contains('image-modal') || 
      target.classList.contains('calendar-modal') || 
      target.classList.contains('pedido-modal') || 
      target.classList.contains('checkout-modal') || 
      target.classList.contains('cart-modal')
    )) {
    if (target.id) {
      closeModal(target.id);
    }
  }
});

// Cerrar con tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.image-modal.show, .calendar-modal.show, .pedido-modal.show');
    if (openModal && openModal.id) {
      closeModal(openModal.id);
    }
  }
});

// ==================== MODAL DE CALENDARIO ====================

function showCalendarModal(date) {
  const modal = document.getElementById('calendarModal');
  const productSelect = document.getElementById('modalProductSelect');
  const modalDateDisplay = document.getElementById('modalDateDisplay');

  if (!modal || !productSelect) return;

  // Formatear fecha
  const dateObj = new Date(date + 'T00:00:00');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('es-AR', options);
  if (modalDateDisplay) {
    modalDateDisplay.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  // Poblar select de productos
  productSelect.innerHTML = '<option value="">Seleccionar producto...</option>' + 
    productosBase
      .filter(p => p.active)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`)
      .join('');

  // Actualizar vista de pedidos del día
  updateDayView(date);

  modal.dataset.date = date;
  // Forzar display para asegurar que el modal quede visible
  modal.style.display = 'flex';
  modal.classList.add('show');
  
  // Preview del producto seleccionado
  setupProductPreview();
  
  // Inicializar accordion
  initAccordion();
  
  // Focus en el select de productos
  setTimeout(() => {
    const select = document.getElementById('modalProductSelect');
    if (select) select.focus();
  }, 150);
}

function updateDayView(date) {
  const dayProductList = document.getElementById('dayProductList');
  const dayTotalMin = document.getElementById('dayTotalMin');
  const dayTotalMoney = document.getElementById('dayTotalMoney');
  const capacityFill = document.getElementById('capacityFill');
  const capacityText = document.getElementById('capacityText');

  if (!dayProductList) return;

  // Filtrar pedidos del día
  const dayPedidos = pedidos.filter(p => p.fecha === date);
  let totalMinutes = 0;
  let totalPrice = 0;

  // Si no hay pedidos
  if (dayPedidos.length === 0) {
    dayProductList.innerHTML = '<div class="empty-state">No hay pedidos asignados para este día</div>';
  } else {
    // Generar HTML de pedidos
    dayProductList.innerHTML = dayPedidos.map(pedido => {
      const prod = productosBase.find(pr => pr.id === pedido.productoId);
      if (!prod) return '';

      const minutes = timeToMinutes(prod.tiempoUnitario) * pedido.cantidad;
      const price = prod.precioUnitario * pedido.cantidad;
      totalMinutes += minutes;
      totalPrice += price;

      // Construir detalles del pedido
      let detalles = `
        <div class="product-detail-item">
          <strong>${pedido.cantidad}</strong> ${pedido.cantidad === 1 ? 'unidad' : 'unidades'}
        </div>
        <div class="product-detail-item">
          👤 ${escapeHtml(pedido.cliente || 'Sin cliente')}
        </div>
        <div class="product-detail-item">
          ⏱ ${minutesToTime(minutes)}
        </div>
        <div class="product-detail-item">
          💰 ${formatCurrency(price)}
        </div>
      `;

      // Agregar indicador de personalizado si aplica
      if (pedido.personalizado) {
          detalles += `
            <div class="product-detail-item" style="background: rgba(9, 132, 227, 0.12); border-color: rgba(9, 132, 227, 0.24);">
              ✨ Personalizado
            </div>
          `;
      }

      // Agregar información de seña si existe
      if (pedido.sena && pedido.sena > 0) {
        detalles += `
          <div class="product-detail-item" style="background: rgba(76, 175, 80, 0.2); border-color: rgba(76, 175, 80, 0.4);">
            💵 Seña: ${formatCurrency(pedido.sena)}
          </div>
        `;
        
        if (pedido.restante && pedido.restante > 0) {
            detalles += `
              <div class="product-detail-item" style="background: rgba(9, 132, 227, 0.12); border-color: rgba(9, 132, 227, 0.24);">
                📊 Resta: ${formatCurrency(pedido.restante)}
              </div>
            `;
        }
      }

      // Agregar observaciones si existen
      let observacionesHTML = '';
      if (pedido.observaciones && pedido.observaciones.trim()) {
        observacionesHTML = `
          <div class="product-detail-item full-width" style="grid-column: 1 / -1; background: rgba(33, 150, 243, 0.15); border-color: rgba(33, 150, 243, 0.3);">
            📝 ${escapeHtml(pedido.observaciones)}
          </div>
        `;
      }

      return `
        <div class="day-product-item">
          ${prod.imagen 
            ? `<img src="${prod.imagen}" alt="${escapeHtml(prod.nombre)}" class="product-mini-img">`
            : '<div class="product-mini-placeholder">Sin img</div>'
          }
          <div class="product-info">
            <div class="product-name">${escapeHtml(prod.nombre)}</div>
            <div class="product-details">
              ${detalles}
              ${observacionesHTML}
            </div>
          </div>
          <button class="btn-delete" data-id="${pedido.id}" title="Eliminar pedido">✕</button>
        </div>
      `;
    }).join('');

    // Agregar event listeners a botones de eliminar
    dayProductList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pedidoId = parseInt(btn.dataset.id);
        deletePedido(pedidoId, date);
      });
    });
  }

  // Actualizar resumen del día
  if (dayTotalMin) dayTotalMin.textContent = minutesToTime(totalMinutes);
  if (dayTotalMoney) dayTotalMoney.textContent = formatCurrency(totalPrice);

  // Calcular y mostrar capacidad (8 horas = 480 minutos por día)
  const capacity = (totalMinutes / 480) * 100;
  if (capacityFill) {
    capacityFill.style.width = Math.min(capacity, 100) + '%';
  }
  if (capacityText) {
    const percentage = Math.round(capacity);
    capacityText.textContent = percentage + '%';
    
    if (percentage >= 100) {
      capacityText.style.color = '#f44336';
    } else if (percentage >= 70) {
      capacityText.style.color = '#0984e3';
    } else {
      capacityText.style.color = '#4CAF50';
    }
  }
}

function deletePedido(pedidoId, date) {
  const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
  
  if (pedidoIndex !== -1) {
    const pedido = pedidos[pedidoIndex];
    const producto = productosBase.find(p => p.id === pedido.productoId);
    
    if (confirm(`¿Eliminar pedido de "${producto ? producto.nombre : 'este producto'}"?`)) {
      pedidos.splice(pedidoIndex, 1);
      guardarProductos();
      
      // Actualizar vistas solo si las funciones existen
      if (typeof renderCalendar === 'function') renderCalendar();

    // Helper: mostrar contenido HTML en un modal reutilizable (id: inlineModal)
    function showInlineModal(htmlContent) {
      let modal = document.getElementById('inlineModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'inlineModal';
        modal.className = 'pedido-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
          <div class="modal-content" role="dialog" style="max-width:600px; margin:auto;">
            <button class="close-modal" aria-label="Cerrar">×</button>
            <div id="inlineModalBody"></div>
          </div>`;
        document.body.appendChild(modal);
      }
      const body = modal.querySelector('#inlineModalBody');
      if (body) body.innerHTML = htmlContent;
      modal.style.display = 'flex';
      modal.classList.add('show');
      modal.style.position='fixed'; modal.style.top='50%'; modal.style.left='50%'; modal.style.transform='translate(-50%, -50%)'; modal.style.zIndex='1200';
    }

      if (typeof renderPedidos === 'function') renderPedidos();
      
      updateDayView(date);
      showNotification('Pedido eliminado correctamente', 'success');
    }
  }
}

// ==================== PREVIEW DEL PRODUCTO ====================

function setupProductPreview() {
  const productSelect = document.getElementById('modalProductSelect');
  const preview = document.getElementById('selectedProductPreview');
  const cantidad = document.getElementById('modalCantidad');
  
  if (!preview || !productSelect || !cantidad) return;
  
  const updatePreview = () => {
    const productoId = parseInt(productSelect.value);
    const cantidadVal = parseInt(cantidad.value) || 1;
    
    if (!productoId) {
      preview.classList.remove('show');
      return;
    }
    
    const producto = productosBase.find(p => p.id === productoId);
    if (!producto) return;
    
    const tiempoTotal = timeToMinutes(producto.tiempoUnitario) * cantidadVal;
    const precioTotal = producto.precioUnitario * cantidadVal;
    
    preview.innerHTML = `
      ${producto.imagen 
        ? `<img src="${producto.imagen}" alt="${escapeHtml(producto.nombre)}" class="preview-img">`
        : '<div class="product-mini-placeholder" style="width:90px;height:90px;font-size:0.85rem;">Sin img</div>'
      }
      <div class="preview-info">
        <div class="preview-name">${escapeHtml(producto.nombre)}</div>
        <div class="preview-specs">
          <span>⏱ ${minutesToTime(tiempoTotal)}</span>
          <span>💰 ${formatCurrency(precioTotal)}</span>
          <span>📦 ${cantidadVal} ${cantidadVal === 1 ? 'unidad' : 'unidades'}</span>
        </div>
      </div>
    `;
    preview.classList.add('show');
  };
  
  // Limpiar listeners previos
  const newProductSelect = productSelect.cloneNode(true);
  const newCantidad = cantidad.cloneNode(true);
  productSelect.replaceWith(newProductSelect);
  cantidad.replaceWith(newCantidad);
  
  // Agregar nuevos listeners
  const selectElement = document.getElementById('modalProductSelect');
  const cantidadElement = document.getElementById('modalCantidad');
  if (selectElement) selectElement.addEventListener('change', updatePreview);
  if (cantidadElement) cantidadElement.addEventListener('input', updatePreview);
}

function resetModalForm() {
  const productSelect = document.getElementById('modalProductSelect');
  const cliente = document.getElementById('modalCliente');
  const cantidad = document.getElementById('modalCantidad');
  const preview = document.getElementById('selectedProductPreview');
  const personalizado = document.getElementById('modalPersonalizado');
  const observaciones = document.getElementById('modalObservaciones');
  const sena = document.getElementById('modalSena');
  
  if (productSelect) productSelect.value = '';
  if (cliente) cliente.value = '';
  if (cantidad) cantidad.value = '1';
  if (preview) preview.classList.remove('show');
  if (personalizado) personalizado.checked = false;
  if (observaciones) observaciones.value = '';
  if (sena) sena.value = '';
}

// ==================== GUARDAR PEDIDO ====================

const modalSaveBtn = document.getElementById('modalSaveBtn');
if (modalSaveBtn) {
  modalSaveBtn.addEventListener('click', () => {
    const modal = document.getElementById('calendarModal');
    if (!modal || !modal.dataset.date) return;
    
    const date = modal.dataset.date;
    const productoId = parseInt(document.getElementById('modalProductSelect')?.value);
    const cliente = document.getElementById('modalCliente')?.value.trim() || '';
    const cantidad = parseInt(document.getElementById('modalCantidad')?.value) || 1;
    const personalizado = document.getElementById('modalPersonalizado')?.checked || false;
    const observaciones = document.getElementById('modalObservaciones')?.value.trim() || '';
    const sena = parseFloat(document.getElementById('modalSena')?.value) || 0;

    // Validaciones
    if (!productoId) {
      showNotification('Selecciona un producto', 'error');
      return;
    }

    if (cantidad <= 0) {
      showNotification('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    const producto = productosBase.find(p => p.id === productoId);
    if (!producto) {
      showNotification('Producto no encontrado', 'error');
      return;
    }

    // Calcular totales
    const precioTotal = producto.precioUnitario * cantidad;
    const restante = Math.max(0, precioTotal - sena);

    if (sena > precioTotal) {
      showNotification('La seña no puede ser mayor al total del pedido', 'error');
      return;
    }

    // Crear pedido con los nuevos campos
    const nuevoPedido = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      productoId,
      cliente,
      cantidad,
      fecha: date,
      estado: 'pendiente',
      personalizado,
      observaciones,
      sena,
      precioTotal,
      restante
    };

    pedidos.push(nuevoPedido);
  guardarProductos();
  if (typeof updateTabBadges === 'function') updateTabBadges();
    
    // Actualizar vistas solo si existen
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderPedidos === 'function') renderPedidos();
    
    updateDayView(date);
    resetModalForm();
    
    showNotification('Pedido asignado correctamente', 'success');
    
    setTimeout(() => {
      const select = document.getElementById('modalProductSelect');
      if (select) select.focus();
    }, 100);
  });
}

// Cancelar y cerrar modal
const modalCancelBtn = document.getElementById('modalCancelBtn');
if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', () => {
    resetAccordion();
    closeModal('calendarModal');
  });
}

// ==================== ACCORDION ====================

function initAccordion() {
  const toggleButton = document.getElementById('toggleNewOrder');
  const accordionContent = document.getElementById('newOrderForm');
  
  if (toggleButton && accordionContent) {
    const newToggleButton = toggleButton.cloneNode(true);
    toggleButton.replaceWith(newToggleButton);
    
    const btn = document.getElementById('toggleNewOrder');
    if (btn) {
      btn.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        accordionContent.classList.toggle('open');
        
        if (!isExpanded) {
          setTimeout(() => {
            accordionContent.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest' 
            });
          }, 200);
        }
      });
    }
  }
}

function resetAccordion() {
  const toggleButton = document.getElementById('toggleNewOrder');
  const accordionContent = document.getElementById('newOrderForm');
  
  if (toggleButton && accordionContent) {
    toggleButton.setAttribute('aria-expanded', 'false');
    accordionContent.classList.remove('open');
  }
}