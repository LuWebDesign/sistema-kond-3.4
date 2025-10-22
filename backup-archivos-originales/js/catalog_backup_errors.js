// ====== CATÁLOGO Y CARRITO CON SISTEMA DE PEDIDOS ======

// Carrito en memoria
let cart = JSON.parse(localStorage.getItem('cart')) || [];
// Elemento que tenía el foco antes de abrir un modal (para restaurarlo al cerrar)
let lastFocusedElement = null;

// Cupones disponibles
const coupons = {
  'LASER10': { type: 'percentage', value: 10, minAmount: 10000 },
  '5X1LLAVEROS': { type: 'fixed', value: 0, minQuantity: 5 }
};

let activeCoupon = null;
let selectedDeliveryDate = null;

// Inicializar catálogo
function initCatalog() {
  populateCategories();
  renderCatalog();
  updateCartUI();
  setupCatalogEvents();
  
  window.addEventListener('storage', () => {
    populateCategories();
    renderCatalog();
  });
}

// Poblar categorías
function populateCategories() {
  const productosBase = JSON.parse(localStorage.getItem('productosBase')) || [];
  const validProducts = productosBase.filter(p => 
    p.active && p.publicado && (p.tipo === 'Venta' || p.tipo === 'Stock')
  );
  
  const uniqueCategories = [...new Set(validProducts
    .map(p => p.categoria)
    .filter(cat => cat && cat.trim() !== ''))];

  const filterSelect = document.getElementById('catalogFilter');
  if (!filterSelect) return;

  filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
  uniqueCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    filterSelect.appendChild(option);
  });
}

// Renderizar productos del catálogo
function renderCatalog() {
  const catalogGrid = document.getElementById('catalogGrid');
  if (!catalogGrid) return;

  const productosBase = JSON.parse(localStorage.getItem('productosBase')) || [];
  const searchTerm = document.getElementById('catalogSearch')?.value.toLowerCase() || '';
  const filterCategory = document.getElementById('catalogFilter')?.value || '';

  const catalogProducts = productosBase.filter(p => 
    p.active && 
    p.publicado && 
    (p.tipo === 'Venta' || p.tipo === 'Stock') &&
    (p.nombre.toLowerCase().includes(searchTerm) || 
     (p.medidas && p.medidas.toLowerCase().includes(searchTerm)) ||
     (p.categoria && p.categoria.toLowerCase().includes(searchTerm))) &&
    (!filterCategory || p.categoria === filterCategory)
  );

  if (catalogProducts.length === 0) {
    catalogGrid.innerHTML = '<div class="cart-empty">No se encontraron productos en esta categoría</div>';
    return;
  }

  catalogGrid.innerHTML = catalogProducts.map(product => {
    // Aplicar promociones si el motor está disponible
    let promoResult = null;
    if (window.PromoEngine) {
      promoResult = window.PromoEngine.applyPromotionsToProduct(product);
    }

    const originalPrice = product.precioUnitario || 0;
    const effectivePrice = promoResult ? promoResult.discountedPrice : originalPrice;
    const hasDiscount = promoResult && promoResult.hasPromotion && effectivePrice < originalPrice;
    const badge = promoResult ? promoResult.badge : null;
    const badgeColor = promoResult ? promoResult.badgeColor : null;
    const allBadges = promoResult ? promoResult.badges : [];
    
    // Calcular descuento porcentual
    const discountPercent = hasDiscount ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0;

    return `
      <div class="catalog-product-card modern-card" data-id="${product.id}">
        <div class="catalog-product-image-container">
          ${product.imagen 
            ? `<img src="${product.imagen}" alt="${escapeHtml(product.nombre)}" class="catalog-product-image" loading="lazy">`
            : '<div class="catalog-product-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                   <circle cx="8.5" cy="8.5" r="1.5"></circle>
                   <polyline points="21 15 16 10 5 21"></polyline>
                 </svg>
                 <span>Sin imagen</span>
               </div>'
          }
          
          <!-- Badges de promociones (múltiples) -->
          <div class="catalog-product-badges">
            ${allBadges.length > 0 
              ? allBadges.map(b => `<span class="catalog-product-badge" style="background-color: ${b.color || '#3b82f6'}">${escapeHtml(b.text)}</span>`).join('')
              : (badge ? `<span class="catalog-product-badge" style="background-color: ${badgeColor || '#3b82f6'}">${escapeHtml(badge)}</span>` : '')
            }
            ${hasDiscount && discountPercent > 0 ? `<span class="catalog-product-discount-badge">-${discountPercent}%</span>` : ''}
          </div>
          
          <!-- Quick actions overlay -->
          <div class="catalog-product-quick-actions">
            <button class="quick-action-btn" title="Vista rápida" data-action="quick-view" data-id="${product.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="catalog-product-info">
          <div class="catalog-product-header">
            ${product.categoria ? `<span class="catalog-product-category-tag">${escapeHtml(product.categoria)}</span>` : ''}
            <h3 class="catalog-product-name">${escapeHtml(product.nombre)}</h3>
          </div>
          
          <div class="catalog-product-details">
            <div class="catalog-product-detail-item">
              <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                <rect x="1" y="3" width="22" height="5"></rect>
              </svg>
              <span>${escapeHtml(product.medidas || 'Sin medidas')}</span>
            </div>
          </div>
          
          <div class="catalog-product-pricing">
            ${hasDiscount 
              ? `<div class="pricing-wrapper">
                   <div class="catalog-product-price-original">${formatCurrency(originalPrice)}</div>
                   <div class="catalog-product-price-discounted">${formatCurrency(effectivePrice)}</div>
                   <div class="catalog-product-savings">Ahorras ${formatCurrency(originalPrice - effectivePrice)}</div>
                 </div>`
              : `<div class="catalog-product-price">${formatCurrency(effectivePrice)}</div>`
            }
          </div>
          
          <div class="catalog-product-actions">
            <div class="catalog-quantity-selector">
              <button class="qty-btn qty-decrease" data-id="${product.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <input type="number" class="qty-input" value="1" min="1" max="99" data-id="${product.id}">
              <button class="qty-btn qty-increase" data-id="${product.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
            <button class="btn-add-to-cart" data-id="${product.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>Agregar</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners para botones de agregar al carrito
  document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.closest('.btn-add-to-cart').dataset.id);
      const qtyInput = document.querySelector(`.qty-input[data-id="${productId}"]`);
      const quantity = parseInt(qtyInput.value) || 1;
      addToCart(productId, quantity);
    });
  });

  // Event listeners para botones de cantidad
  document.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.closest('.qty-decrease').dataset.id);
      const input = document.querySelector(`.qty-input[data-id="${productId}"]`);
      const currentValue = parseInt(input.value) || 1;
      if (currentValue > 1) {
        input.value = currentValue - 1;
      }
    });
  });

  document.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.closest('.qty-increase').dataset.id);
      const input = document.querySelector(`.qty-input[data-id="${productId}"]`);
      const currentValue = parseInt(input.value) || 1;
      if (currentValue < 99) {
        input.value = currentValue + 1;
      }
    });
  });

  // Abrir imagen en modal al hacer click sobre la imagen del producto
  document.querySelectorAll('.catalog-product-image').forEach(img => {
    img.addEventListener('click', (e) => {
      const src = e.currentTarget.src;
      if (typeof showImageModal === 'function') {
        showImageModal(src);
      }
    });
  });

  // Quick view (vista rápida) - opcional
  document.querySelectorAll('.quick-action-btn[data-action="quick-view"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = parseInt(e.target.closest('.quick-action-btn').dataset.id);
      const product = catalogProducts.find(p => p.id === productId);
      if (product && product.imagen && typeof showImageModal === 'function') {
        showImageModal(product.imagen);
      }
    });
  });
      }
    });
  });
}

// Agregar producto al carrito
function addToCart(productId, quantity) {
  const productosBase = JSON.parse(localStorage.getItem('productosBase')) || [];
  const product = productosBase.find(p => p.id === productId);
  if (!product) return;

  // Calcular precio efectivo con promociones
  let effectivePrice = product.precioUnitario || 0;
  if (window.PromoEngine) {
    const pricing = window.PromoEngine.calculateDiscountedPrice(product, 1);
    effectivePrice = pricing.unitPrice;
  }

  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      productId,
      idProducto: productId, // Para compatibilidad
      name: product.nombre,
      price: effectivePrice, // Usar precio con promoción aplicada
      originalPrice: product.precioUnitario || 0, // Mantener precio original
      measures: product.medidas || '',
      image: product.imagen,
      quantity,
      tiempoUnitario: product.tiempoUnitario || '00:00:00' // NUEVO: para calcular capacidad
    });
  }

  saveCart();
  updateCartUI();
  
  // Usar notificación persistente mejorada para carrito
  try {
    addNotification({
      title: '🛒 Producto agregado',
      body: `${product.nombre} se añadió al carrito`,
      date: (new Date()).toISOString().slice(0,10),
      meta: { 
        tipo: 'carrito',
        productName: product.nombre,
        cartItems: cart.length
      }
    });
  } catch(e) {
    // Fallback a la notificación simple
    showNotification(`${product.nombre} agregado al carrito`, 'success');
  }
}

// Actualizar UI del carrito
function updateCartUI() {
  const cartBadge = document.getElementById('cartCount');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Actualizar badge del carrito flotante
  if (cartBadge) {
    cartBadge.textContent = totalItems > 0 ? totalItems : '';
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
  }
  
  // Actualizar contador en la navegación
  if (typeof updateNavCartCount === 'function') {
    updateNavCartCount(totalItems);
  }
}

// Mostrar modal del carrito
function showCartModal() {
  const modal = document.getElementById('cartModal');
  if (!modal) return;
  renderCartItems();
  // Guardar foco previo y abrir modal accesiblemente
  try { lastFocusedElement = document.activeElement; } catch (e) { lastFocusedElement = null; }
  modal.style.display = 'flex';
  modal.classList.add('show');
  try { modal.setAttribute('aria-hidden', 'false'); } catch (e) {}
  // Mover foco al botón de cierre si existe
  const closeBtn = document.getElementById('closeCartBtn');
  if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
}

// Renderizar items del carrito
function renderCartItems() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');

  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'block';
    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  if (cartItemsContainer) cartItemsContainer.style.display = 'block';

  const itemsHTML = cart.map((item, index) => `
    <div class="cart-item">
      ${item.image 
        ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" class="cart-item-image">`
        : '<div class="cart-item-image catalog-product-placeholder">Sin img</div>'
      }
      <div class="cart-item-info">
        <h4>${escapeHtml(item.name)}</h4>
        <div class="cart-item-details">
          <span>📏 ${escapeHtml(item.measures)}</span>
          <span class="cart-item-price">${formatCurrency(item.price)}</span>
        </div>
      </div>
      <div class="cart-item-actions">
        <div class="cart-quantity-control">
          <button class="btn-quantity" data-action="decrease" data-index="${index}">-</button>
          <span class="cart-quantity-value">${item.quantity}</span>
          <button class="btn-quantity" data-action="increase" data-index="${index}">+</button>
        </div>
  <div class="cart-item-total cart-item-price">${formatCurrency(item.price * item.quantity)}</div>
        <button class="btn-remove" data-index="${index}">Eliminar</button>
      </div>
    </div>
  `).join('');

  if (cartItemsContainer) cartItemsContainer.innerHTML = itemsHTML;

  document.querySelectorAll('.btn-quantity').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const action = e.target.dataset.action;
      updateCartQuantity(index, action);
    });
  });

  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeFromCart(index);
    });
  });

  const applyBtn = document.getElementById('applyCouponBtn');
  if (applyBtn) {
    applyBtn.removeEventListener('click', applyCoupon);
    applyBtn.addEventListener('click', applyCoupon);
  }

  updateCartSummary();
}

// Actualizar cantidad en carrito
function updateCartQuantity(index, action) {
  if (action === 'increase') {
    cart[index].quantity++;
  } else if (action === 'decrease' && cart[index].quantity > 1) {
    cart[index].quantity--;
  } else if (action === 'decrease') {
    removeFromCart(index);
    return;
  }

  saveCart();
  renderCartItems();
  updateCartUI();
}

// Eliminar del carrito
function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCartItems();
  updateCartUI();
  showNotification('Producto eliminado del carrito', 'success');
}

// Aplicar cupón
function applyCoupon() {
  const couponInput = document.getElementById('couponInput');
  if (!couponInput) return;

  const couponCode = couponInput.value.toUpperCase().trim();

  if (!couponCode) {
    showNotification('Ingresa un código de cupón', 'error');
    return;
  }

  const coupon = coupons[couponCode];
  if (!coupon) {
    showNotification('Cupón inválido', 'error');
    return;
  }

  const subtotal = calculateSubtotal();

  if (coupon.minAmount && subtotal < coupon.minAmount) {
    showNotification(`Compra mínima de ${formatCurrency(coupon.minAmount)} para este cupón`, 'error');
    return;
  }

  if (couponCode === '5X1LLAVEROS') {
    const llaverosQty = cart.reduce((sum, item) => sum + (item.name.toLowerCase().includes('llavero') ? item.quantity : 0), 0);
    if (llaverosQty < 5) {
      showNotification('Necesitas al menos 5 llaveros para este cupón', 'error');
      return;
    }
    const llaveroPrice = (JSON.parse(localStorage.getItem('productosBase')) || []).find(p => p.nombre.toLowerCase().includes('llavero'))?.precioUnitario || 0;
    coupon.value = llaveroPrice;
  }

  activeCoupon = { code: couponCode, ...coupon };
  updateCartSummary();
  showNotification(`Cupón ${couponCode} aplicado correctamente`, 'success');
  couponInput.value = '';
}

// Calcular subtotal
function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Calcular descuento
function calculateDiscount() {
  if (!activeCoupon) return 0;
  const subtotal = calculateSubtotal();
  if (activeCoupon.type === 'percentage') {
    return subtotal * (activeCoupon.value / 100);
  }
  return activeCoupon.value;
}

// Actualizar resumen del carrito
function updateCartSummary() {
  const subtotalEl = document.getElementById('cartSubtotal');
  const discountEl = document.getElementById('cartDiscount');
  const totalEl = document.getElementById('cartTotal');
  const discountRow = document.getElementById('cartDiscountRow');
  const ticketEl = document.getElementById('cartDiscountTicket');
  const ticketCodeEl = document.getElementById('ticketCode');
  const ticketDescEl = document.getElementById('ticketDesc');
  const ticketAmountEl = document.getElementById('ticketAmount');

  if (!subtotalEl || !totalEl) return;

  const subtotal = calculateSubtotal();
  // Primero, aplicar descuentos por promociones (Marketing) si el motor está disponible
  let promoInfo = null;
  let promoDiscount = 0;
  if (window.PromoEngine && typeof window.PromoEngine.applyPromotionsToCart === 'function') {
    try {
      promoInfo = window.PromoEngine.applyPromotionsToCart(cart);
      promoDiscount = promoInfo.totalDiscount || 0;
    } catch (e) {
      console.warn('Error aplicando promociones al carrito', e);
      promoInfo = null;
      promoDiscount = 0;
    }
  }

  const couponDiscount = calculateDiscount();
  const discount = (promoDiscount || 0) + (couponDiscount || 0);
  const total = Math.max(0, subtotal - discount);

  subtotalEl.textContent = formatCurrency(subtotal);

  // Mostrar ticket de descuento cuando exista un cupón activo
  if (activeCoupon && ticketEl && ticketCodeEl && ticketDescEl && ticketAmountEl) {
    ticketEl.style.display = 'block';
    ticketCodeEl.textContent = activeCoupon.code || '';
    if (activeCoupon.type === 'percentage') {
      ticketDescEl.textContent = `${activeCoupon.value}% de descuento`;
      ticketAmountEl.textContent = `- ${formatCurrency(discount)}`;
    } else {
      ticketDescEl.textContent = `Descuento fijo`;
      ticketAmountEl.textContent = `- ${formatCurrency(discount)}`;
    }
  } else if (ticketEl) {
    ticketEl.style.display = 'none';
  }

  // Mostrar ticket de promociones (Marketing)
  const promoTicketEl = document.getElementById('cartPromoTicket');
  const promoNamesEl = document.getElementById('promoNames');
  const promoAmountEl = document.getElementById('promoAmount');
  if (promoInfo && promoInfo.totalDiscount > 0 && promoTicketEl && promoNamesEl && promoAmountEl) {
    promoTicketEl.style.display = 'block';
    const names = (promoInfo.appliedPromotions || []).map(p => p.title || p.badge || p.type);
    promoNamesEl.textContent = names.length ? names.join(', ') : '-';
    promoAmountEl.textContent = `- ${formatCurrency(promoInfo.totalDiscount)}`;
  } else if (promoTicketEl) {
    promoTicketEl.style.display = 'none';
  }

  if (discount > 0 && discountRow && discountEl) {
    discountRow.style.display = 'flex';
    discountEl.textContent = '- ' + formatCurrency(discount);
  } else if (discountRow) {
    discountRow.style.display = 'none';
  }

  totalEl.textContent = formatCurrency(total);
}

// ====== NUEVO: SISTEMA DE PEDIDOS COMPLETO ======

// Proceder al checkout con calendario
function proceedToCheckout() {
  if (cart.length === 0) {
    showNotification('El carrito está vacío', 'error');
    return;
  }

  // Copiar notas del carrito al checkout
  const notes = document.getElementById('cartNotes')?.value || '';
  const notesCheckout = document.getElementById('checkoutNotes');
  if (notesCheckout) notesCheckout.value = notes;

  // Resetear selección de fecha
  selectedDeliveryDate = null;

  const modal = document.getElementById('checkoutModal');
  // Prefill checkout inputs from logged user if available
  try {
    const user = (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? window.KONDAuth.currentUser() : null;
    if (user) {
      const nameInput = document.getElementById('checkoutName');
      const phoneInput = document.getElementById('checkoutPhone');
      const addressInput = document.getElementById('checkoutAddress');
      const notesInput = document.getElementById('checkoutNotes');
      if (nameInput && !nameInput.value) nameInput.value = user.nombre || user.email || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = user.telefono || '';
      if (addressInput && !addressInput.value) {
        // Construir dirección con localidad/cp/provincia si están disponibles
        const parts = [];
        if (user.direccion) parts.push(user.direccion);
        if (user.localidad) parts.push(user.localidad);
        if (user.cp) parts.push(user.cp);
        if (user.provincia) parts.push(user.provincia);
        addressInput.value = parts.join(', ');
      }
      if (notesInput && !notesInput.value) notesInput.value = '';
      // Prefill transferencia fields
      const transferName = document.getElementById('transferName');
      const transferPhone = document.getElementById('transferPhone');
      const transferEmail = document.getElementById('transferEmail');
      const transferAddress = document.getElementById('transferAddress');
      if (transferName && !transferName.value) transferName.value = user.nombre || user.email || '';
      if (transferPhone && !transferPhone.value) transferPhone.value = user.telefono || '';
      if (transferEmail && !transferEmail.value) transferEmail.value = user.email || '';
      if (transferAddress && !transferAddress.value) {
        const tparts = [];
        if (user.direccion) tparts.push(user.direccion);
        if (user.localidad) tparts.push(user.localidad);
        if (user.cp) tparts.push(user.cp);
        if (user.provincia) tparts.push(user.provincia);
        transferAddress.value = tparts.join(', ');
      }
    }
  } catch (e) {}
  // Guardar foco previo y abrir modal de forma accesible
  try { lastFocusedElement = document.activeElement; } catch (e) { lastFocusedElement = null; }
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('show');
    try { modal.setAttribute('aria-hidden', 'false'); } catch (e) {}
    // Mover foco al botón de cierre para accesibilidad
    const closeBtn = document.getElementById('closeCheckoutBtn');
    if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
  }
}

// NUEVO: Calcular tiempo total de producción del carrito
function calculateTotalProductionTime() {
  let totalMinutes = 0;
  
  cart.forEach(item => {
    const time = item.tiempoUnitario || '00:00:00';
    const minutes = timeToMinutes(time);
    totalMinutes += minutes * item.quantity;
  });
  
  return totalMinutes;
}

// Convertir tiempo HH:MM:SS a minutos
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

// NUEVO: Obtener capacidad disponible por día
function getAvailableCapacityPerDay() {
  const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
  const productosBase = JSON.parse(localStorage.getItem('productosBase')) || [];
  const capacityPerDay = {}; // { 'YYYY-MM-DD': minutosUsados }

  // Calcular tiempo usado por día
  pedidos.forEach(pedido => {
    if (!pedido.fecha) return;
    
    const producto = productosBase.find(p => p.id === pedido.productoId);
    if (!producto) return;
    
    const minutes = timeToMinutes(producto.tiempoUnitario) * pedido.cantidad;
    capacityPerDay[pedido.fecha] = (capacityPerDay[pedido.fecha] || 0) + minutes;
  });

  return capacityPerDay;
}

// NUEVO: Renderizar calendario de disponibilidad para clientes
function renderAvailabilityCalendar(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const capacityPerDay = getAvailableCapacityPerDay();
  const cartTime = calculateTotalProductionTime();
  const maxDailyCapacity = 480; // 8 horas
  // Usar una referencia fija al inicio del día para comparaciones (no mutar `today` en el loop)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  // Determinar la fecha mínima selectable consultando el helper (toma en cuenta método)
  const minSelectable = getMinSelectableDateForTransfer();

  let calendarHTML = '<div class="availability-calendar">';
  calendarHTML += '<div class="calendar-header">';
  calendarHTML += `<h4>${new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(today)}</h4>`;
  calendarHTML += '</div>';
  calendarHTML += '<div class="calendar-days-header">';
  ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
    calendarHTML += `<div class="calendar-day-name">${day}</div>`;
  });
  calendarHTML += '</div>';
  calendarHTML += '<div class="calendar-days-grid">';

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDay = firstDay.getDay();

  // Días vacíos al inicio
  for (let i = 0; i < startDay; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }

  // Días del mes
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = date.toISOString().split('T')[0];
    const usedCapacity = capacityPerDay[dateStr] || 0;
    const availableCapacity = maxDailyCapacity - usedCapacity;
    const canFit = availableCapacity >= cartTime;
    // Comparar con inicio del día sin mutar la variable original
  // Considerar pasado si es anterior al mínimo selectable (esto también bloquea el día presente)
  const isPast = date < minSelectable;
    // Sólo domingo se considera cerrado/fin de semana para clientes; el sábado puede seleccionarse si hay capacidad
    const isWeekend = date.getDay() === 0;

    let dayClass = 'calendar-day';
    // Mostrar solo etiquetas genéricas al cliente (no exponer minutos)
    let dayTitle = 'Disponible';

    if (isPast) {
      dayClass += ' past';
      dayTitle = 'Fecha pasada';
    } else if (isWeekend) {
      dayClass += ' weekend';
      dayTitle = 'Fin de semana';
    } else if (!canFit) {
      dayClass += ' full';
      dayTitle = 'Sin capacidad';
    } else {
      dayClass += ' available';
    }

    if (selectedDeliveryDate === dateStr) {
      dayClass += ' selected';
    }

    const isClickable = !isPast && !isWeekend && canFit;
    const clickAttr = isClickable ? `data-date="${dateStr}"` : '';

    calendarHTML += `<div class="${dayClass}" ${clickAttr} title="${dayTitle}">`;
    calendarHTML += `<span class="day-number">${day}</span>`;
    // Nota: ocultamos el indicador de capacidad y los minutos al cliente por privacidad/operación.
    calendarHTML += '</div>';
  }

  calendarHTML += '</div>';
  calendarHTML += '<div class="calendar-legend">';
  calendarHTML += '<div><span class="legend-dot available"></span> Disponible</div>';
  calendarHTML += '<div><span class="legend-dot full"></span> Sin capacidad</div>';
  calendarHTML += '<div><span class="legend-dot weekend"></span> Fin de semana</div>';
  calendarHTML += '</div>';
  calendarHTML += '</div>';

  container.innerHTML = calendarHTML;

  // Event listeners para días seleccionables -> abrir modal de confirmación
  container.querySelectorAll('.calendar-day.available').forEach(dayEl => {
    dayEl.addEventListener('click', (e) => {
      const date = e.currentTarget.dataset.date;
      if (!date) return;

      // Preparar mensaje amigable
      const dateObj = new Date(date + 'T00:00:00');
      const formatted = dateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const modal = document.getElementById('dateConfirmModal');
      const body = document.getElementById('dateConfirmBody');
      const confirmBtn = document.getElementById('confirmDateBtn');
      const already = selectedDeliveryDate && selectedDeliveryDate !== '';
      if (body) {
        if (!already) {
          body.textContent = `¿Solicitar la fecha ${formatted} para la entrega de tu producto? Si confirmás, guardaremos esta fecha como solicitud de entrega.`;
        } else {
          const prevDateObj = new Date(selectedDeliveryDate + 'T00:00:00');
          const prevFormatted = prevDateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          body.textContent = `Ya solicitaste la fecha ${prevFormatted}. ¿Deseás solicitar cambiar la fecha a ${formatted}? Al confirmar solicitaremos este cambio.`;
        }
      }
      if (confirmBtn) confirmBtn.textContent = already ? 'Solicitar cambio de fecha' : 'Solicitar esta fecha';
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
      }

      // Guardar la fecha temporal en dataset del modal
      if (modal) modal.dataset.pendingDate = date;
    });
  });
}

// NUEVO: Mostrar opción de transferencia con calendario
function showTransferOption() {
  const transferSection = document.getElementById('transferSection');
  if (transferSection) transferSection.style.display = 'block';

  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const total = subtotal - discount;
  const deposit = total * 0.5; // Seña del 50%

  const totalEl = document.getElementById('transferTotal');
  const depositEl = document.getElementById('transferDeposit');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (depositEl) depositEl.textContent = formatCurrency(deposit);

  const waSection = document.getElementById('whatsappSection');
  if (waSection) waSection.style.display = 'none';

  // Renderizar calendario de disponibilidad
  renderAvailabilityCalendar('deliveryCalendar');

  // Auto-seleccionar la primera fecha disponible para mejorar UX.
  // En lugar de depender de un click sintético, asignamos directamente selectedDeliveryDate
  // y actualizamos la UI para evitar problemas de timing.
  // No auto-seleccionamos la primera fecha para evitar marcarla como confirmada.
  // Si ya existe una fecha confirmada (selectedDeliveryDate), la marcamos visualmente.
  const container = document.getElementById('deliveryCalendar');
  if (container && selectedDeliveryDate) {
    const sel = container.querySelector(`.calendar-day[data-date="${selectedDeliveryDate}"]`);
    if (sel) {
      container.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
      sel.classList.add('selected');
    }
  }

  // Registrar listeners para los radios de método dentro de transferencia (si existen)
  const transferRadios = document.getElementsByName('deliveryMethodTransfer') || [];
  Array.from(transferRadios).forEach(r => {
    r.removeEventListener && r.removeEventListener('change', handleDeliveryMethodTransferChange);
    r.addEventListener('change', handleDeliveryMethodTransferChange);
  });

  // Registrar botón de copiar para la sección de transferencia
  const btnCopyT = document.getElementById('btnCopyPickupTransfer');
  if (btnCopyT) {
    try { btnCopyT.removeEventListener('click', copyPickupAddressTransfer); } catch (e) {}
    btnCopyT.addEventListener('click', copyPickupAddressTransfer);
  }

  // Prefill de datos del usuario (si hay sesión)
  try {
    const user = (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? window.KONDAuth.currentUser() : null;
    if (user) {
      const tn = document.getElementById('transferName');
      const tp = document.getElementById('transferPhone');
      const te = document.getElementById('transferEmail');
      if (tn && user.nombre) tn.value = user.nombre;
      if (tp && user.telefono) tp.value = user.telefono;
      if (te && user.email) te.value = user.email;
    }
  } catch (e) {}

  // Toggle "Mis datos" collapse
  try {
    const toggle = document.getElementById('misDatosToggle');
    const body = document.getElementById('misDatosBody');
    if (toggle && body) {
      toggle.addEventListener('click', () => {
        const isOpen = body.style.display === 'block';
        body.style.display = isOpen ? 'none' : 'block';
        toggle.textContent = isOpen ? 'Mis datos ▾' : 'Mis datos ▴';
      });
    }
  } catch (e) {}

  // Copy buttons para CBU y Alias
  const btnCopyCbu = document.getElementById('copyCbu');
  const btnCopyAlias = document.getElementById('copyAlias');
  if (btnCopyCbu) {
    btnCopyCbu.removeEventListener && btnCopyCbu.removeEventListener('click', copyCbu);
    btnCopyCbu.addEventListener('click', copyCbu);
  }
  if (btnCopyAlias) {
    btnCopyAlias.removeEventListener && btnCopyAlias.removeEventListener('click', copyAlias);
    btnCopyAlias.addEventListener('click', copyAlias);
  }

  // Edit toggles para campos prefijados
  const editNameBtn = document.getElementById('editTransferName');
  const editPhoneBtn = document.getElementById('editTransferPhone');
  const editEmailBtn = document.getElementById('editTransferEmail');
  if (editNameBtn) { editNameBtn.addEventListener('click', () => toggleEditable('transferName', editNameBtn)); }
  if (editPhoneBtn) { editPhoneBtn.addEventListener('click', () => toggleEditable('transferPhone', editPhoneBtn)); }
  if (editEmailBtn) { editEmailBtn.addEventListener('click', () => toggleEditable('transferEmail', editEmailBtn)); }

  // Handlers para modal de confirmación de fecha
  const confirmBtn = document.getElementById('confirmDateBtn');
  const cancelBtn = document.getElementById('cancelDateBtn');
  const closeBtn = document.getElementById('closeDateConfirm');
  const dateModal = document.getElementById('dateConfirmModal');

  function closeDateModal() {
    if (dateModal) { dateModal.style.display = 'none'; dateModal.classList.remove('show'); dateModal.dataset.pendingDate = '';
      const body = document.getElementById('dateConfirmBody'); if (body) body.textContent = '';
    }
  }

  if (confirmBtn) {
    try { confirmBtn.removeEventListener && confirmBtn.removeEventListener('click', () => {}); } catch(e){}
    confirmBtn.addEventListener('click', () => {
      if (!dateModal) return;
      const pending = dateModal.dataset.pendingDate;
      if (!pending) return closeDateModal();
      // Validar que la fecha pendiente cumple el mínimo de anticipación
      const minSelectable = getMinSelectableDateForTransfer();
      const pendingDateObj = new Date(pending + 'T00:00:00');
      if (pendingDateObj < minSelectable) {
        const formattedMin = minSelectable.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        console.warn('Pending date below minSelectable', { pending, minSelectable: minSelectable.toISOString().slice(0,10) });
        showInfoModal('Fecha no disponible', `La fecha que elegiste no está disponible para envío. El primer día disponible para envío es <strong>${formattedMin}</strong>. Por favor elegí otra fecha.`);
        // Cerrar el modal de confirmación de fecha para que el usuario pueda volver a abrir el calendario
        closeDateModal();
        return;
      }
  selectedDeliveryDate = pending;
  console.log('selectedDeliveryDate set to', selectedDeliveryDate);
      // Actualizar UI
      const selectedDateDisplay = document.getElementById('selectedDateDisplay');
      if (selectedDateDisplay) {
        const dateObj = new Date(pending + 'T00:00:00');
        const formatted = dateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        selectedDateDisplay.textContent = `Fecha seleccionada: ${formatted}`;
        selectedDateDisplay.style.display = 'block';
      }
      // Re-render del calendario para marcar la selección
      renderAvailabilityCalendar('deliveryCalendar');
      closeDateModal();
    });
  }

  if (cancelBtn) { cancelBtn.addEventListener('click', closeDateModal); }
  if (closeBtn) { closeBtn.addEventListener('click', closeDateModal); }
}

function toggleEditable(fieldId, btn) {
  const fld = document.getElementById(fieldId);
  if (!fld) return;
  if (fld.hasAttribute('readonly')) {
    fld.removeAttribute('readonly');
    fld.focus();
    if (btn) btn.textContent = 'Guardar';
  } else {
    fld.setAttribute('readonly', 'true');
    if (btn) btn.textContent = 'Editar';
  }
}

function copyCbu() {
  const text = document.getElementById('bankCbu')?.textContent || '';
  if (!text) return showNotification('CBU no disponible', 'error');
  copyTextToClipboard(text, 'CBU copiado');
}

function copyAlias() {
  const text = document.getElementById('bankAlias')?.textContent || '';
  if (!text) return showNotification('Alias no disponible', 'error');
  copyTextToClipboard(text, 'Alias copiado');
}

function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showNotification(successMsg || 'Copiado', 'success')).catch(() => {
      const tmp = document.createElement('textarea'); tmp.value = text; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp); showNotification(successMsg || 'Copiado (fallback)', 'success');
    });
  } else {
    const tmp = document.createElement('textarea'); tmp.value = text; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp); showNotification(successMsg || 'Copiado (fallback)', 'success');
  }
}

// Maneja el cambio entre 'retiro' y 'envío' en la sección de Transferencia
function handleDeliveryMethodTransferChange(e) {
  const val = e.target.value;
  const pickupBlock = document.getElementById('pickupInfoTransfer');
  const transferAddress = document.getElementById('transferAddress');
  if (val === 'retiro') {
    if (pickupBlock) pickupBlock.style.display = 'block';
    if (transferAddress) {
      transferAddress.value = document.getElementById('pickupAddressTextTransfer')?.textContent || transferAddress.value;
      transferAddress.setAttribute('readonly', 'true');
    }
  } else {
    if (pickupBlock) pickupBlock.style.display = 'none';
    if (transferAddress) {
      transferAddress.removeAttribute('readonly');
      const user = (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') ? window.KONDAuth.currentUser() : null;
      if (user && user.direccion) transferAddress.value = user.direccion;
    }
  }
  // Re-renderizar calendario para aplicar la nueva regla de mínimo selectable
  try { renderAvailabilityCalendar('deliveryCalendar'); } catch (e) {}
}

// Devuelve la fecha mínima selectable teniendo en cuenta el método seleccionado
function getMinSelectableDateForTransfer() {
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const min = new Date(todayStart);
  // Por defecto no permitimos hoy
  min.setDate(min.getDate() + 1);
  try {
    const radios = document.getElementsByName('deliveryMethodTransfer') || [];
    const sel = Array.from(radios).find(r => r.checked);
    if (sel && sel.value === 'envio') {
      // Envío: mínimo 2 días de anticipación (hoy + 2)
      min.setDate(min.getDate() + 1);
    }
  } catch (e) {}
  return min;
}

function copyPickupAddressTransfer() {
  const text = document.getElementById('pickupAddressTextTransfer')?.textContent || '';
  if (!text) return showNotification('No hay dirección para copiar', 'error');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showNotification('Dirección copiada al portapapeles', 'success')).catch(() => {
      // fallback
      const tmp = document.createElement('textarea'); tmp.value = text; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp); showNotification('Dirección copiada (fallback)', 'success');
    });
  } else {
    const tmp = document.createElement('textarea'); tmp.value = text; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp); showNotification('Dirección copiada (fallback)', 'success');
  }
}

// NUEVO: Guardar pedido completo
function savePedidoCatalogo(pedidoData) {
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
  
  const nuevoPedido = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    tipo: 'catalogo',
    cliente: pedidoData.cliente,
  // Si se pasó explícitamente, respetar userId/userEmail; si no, intentar obtener de la sesión
  userId: pedidoData.userId !== undefined ? pedidoData.userId : ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function' && window.KONDAuth.currentUser()) ? (window.KONDAuth.currentUser() || {}).id : undefined),
  userEmail: pedidoData.userEmail !== undefined ? pedidoData.userEmail : ((window.KONDAuth && typeof window.KONDAuth.currentUser === 'function' && window.KONDAuth.currentUser()) ? (window.KONDAuth.currentUser() || {}).email : undefined),
    productos: cart.map(item => ({
      productId: item.productId,
      nombre: item.name,
      cantidad: item.quantity,
      precioUnitario: item.price,
      medidas: item.measures,
      tiempoUnitario: item.tiempoUnitario,
      subtotal: item.price * item.quantity
    })),
    subtotal: calculateSubtotal(),
    descuento: calculateDiscount(),
    descuentoCode: activeCoupon?.code || null,
    total: calculateSubtotal() - calculateDiscount(),
    metodoPago: pedidoData.metodoPago,
    estadoPago: pedidoData.estadoPago,
    comprobante: pedidoData.comprobante || null,
    estado: 'pendiente',
    fechaSolicitudEntrega: pedidoData.fechaSolicitudEntrega || null,
    fechaConfirmadaEntrega: null,
    fechaCreacion: new Date().toISOString(),
    notas: pedidoData.notas || '',
    tiempoTotalProduccion: calculateTotalProductionTime()
  };

  // Guardar monto recibido si corresponde (p. ej. seña pagada)
  if (pedidoData.montoRecibido !== undefined && pedidoData.montoRecibido !== null) {
    nuevoPedido.montoRecibido = Number(pedidoData.montoRecibido);
  } else if (pedidoData.estadoPago === 'seña_pagada') {
    // Convención: si se indica seña_pagada y no se pasa monto, asumimos 50%
    nuevoPedido.montoRecibido = Number((nuevoPedido.total || 0) * 0.5);
  }

  pedidosCatalogo.push(nuevoPedido);
  try {
    localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo));
  } catch (err) {
    console.warn('localStorage.setItem failed for pedidosCatalogo', err);
    // Si la causa fue QuotaExceeded, intentamos guardar sin el comprobante (es probable que la imagen base64 sea muy grande)
    try {
      if (nuevoPedido.comprobante) {
        nuevoPedido._comprobanteOmitted = true; // marca que omitimos el comprobante
        nuevoPedido.comprobante = null;
      }
      localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo));
      // Informar al usuario que el comprobante no pudo almacenarse localmente
      try { showInfoModal('Comprobante no guardado', 'El comprobante que subiste es demasiado grande para almacenarse localmente. Guardamos el pedido sin el comprobante. Por favor conservá tu comprobante y, si es necesario, envialo por WhatsApp o correo al comercio.'); } catch (e) { console.warn('No se pudo mostrar info modal', e); }
    } catch (err2) {
      console.error('Reintento de guardado sin comprobante falló', err2);
      // Intento final: eliminar pedido en memoria para evitar inconsistencia
      pedidosCatalogo.pop();
      try { localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo)); } catch (e) {}
      throw err2; // dejar que el llamador capture el error si lo desea
    }
  }
  if (typeof updateTabBadges === 'function') updateTabBadges();
  if (typeof updatePedidosStats === 'function') updatePedidosStats();
  if (typeof renderPedidosCatalogo === 'function') renderPedidosCatalogo();

  // Notificar nuevo pedido de catálogo - mejorado
  try {
    const clienteNombre = nuevoPedido.cliente.nombre || nuevoPedido.cliente.telefono || 'Cliente';
    const totalFormateado = formatCurrency(nuevoPedido.total);
    
    addNotification({ 
      title: `✅ Pedido realizado #${nuevoPedido.id}`, 
      body: `${clienteNombre} realizó un pedido por ${totalFormateado} (${nuevoPedido.metodoPago})`, 
      date: (new Date()).toISOString().slice(0,10), 
      meta: { 
        pedidoId: nuevoPedido.id,
        tipo: 'pedido_nuevo',
        clienteName: clienteNombre,
        metodoPago: nuevoPedido.metodoPago,
        total: nuevoPedido.total
      } 
    });
  } catch(e) {}

  return nuevoPedido;
}

// NUEVO: Enviar por WhatsApp (sin seña)
function sendToWhatsApp() {
  const nombre = document.getElementById('checkoutName')?.value.trim() || '';
  const telefono = document.getElementById('checkoutPhone')?.value.trim() || '';
  const direccion = document.getElementById('checkoutAddress')?.value.trim() || '';
  const notas = document.getElementById('checkoutNotes')?.value.trim() || '';

  if (!nombre || !telefono) {
    showNotification('Completa los campos obligatorios: Nombre y Teléfono', 'error');
    return;
  }

  // Validar carrito
  if (!Array.isArray(cart) || cart.length === 0) {
    showNotification('El carrito está vacío. Agrega productos antes de enviar el pedido.', 'error');
    return;
  }

  // Guardar pedido (usar sólo los campos realmente disponibles)
  const clienteObj = { nombre, telefono };
  if (direccion) clienteObj.direccion = direccion;

  const pedido = savePedidoCatalogo({
    cliente: clienteObj,
    metodoPago: 'whatsapp',
    estadoPago: 'sin_seña',
    notas,
    fechaSolicitudEntrega: selectedDeliveryDate || null // Si el cliente eligió fecha, guardarla
  });

  // Crear mensaje de WhatsApp
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const total = subtotal - discount;

  let message = `¡Hola! Solicitud de pedido #${pedido.id}:\n\n`;
  message += `👤 Cliente: ${pedido.cliente.nombre || ''}\n`;
  message += `📞 Teléfono: ${pedido.cliente.telefono || ''}\n`;
  if (pedido.cliente.direccion) message += `📍 Dirección: ${pedido.cliente.direccion}\n`;
  if (pedido.cliente.email) message += `📧 Email: ${pedido.cliente.email}\n\n`;
  
  message += `📦 PRODUCTOS:\n`;
  cart.forEach(item => {
    message += `• ${item.name}\n`;
    message += `  Cantidad: ${item.quantity} | ${item.measures}\n`;
    message += `  Subtotal: ${formatCurrency(item.price * item.quantity)}\n\n`;
  });

  message += `💰 RESUMEN:\n`;
  message += `Subtotal: ${formatCurrency(subtotal)}\n`;
  if (discount > 0) {
    const couponCode = activeCoupon && activeCoupon.code ? activeCoupon.code : '';
    message += `Descuento${couponCode ? ` (${couponCode})` : ''}: -${formatCurrency(discount)}\n`;
  }
  message += `TOTAL: ${formatCurrency(total)}\n\n`;
  
  if (notas) message += `📝 Notas: ${notas}\n\n`;
  if (pedido.fechaSolicitudEntrega) message += `📆 Fecha solicitada: ${pedido.fechaSolicitudEntrega}\n\n`;
  message += `⚠️ IMPORTANTE: Este pedido está pendiente de confirmación. Te contactaremos para confirmar fecha de entrega y coordinar el pago.`;

  // Construir URL WhatsApp: usar api.whatsapp.com como alternativa más compatible
  // Preparar datos para el modal de confirmación
  const whatsappNumber = '5491136231857'; // Cambia por tu número real
  const baseUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=`;
  const whatsappURL = baseUrl + encodeURIComponent(message);

  // Rellenar modal de confirmación
  const waModal = document.getElementById('waConfirmModal');
  const waBody = document.getElementById('waConfirmBody');
  if (waBody) {
    waBody.innerHTML = `
      <p>Vas a enviar el pedido <strong>#${pedido.id}</strong> por WhatsApp.</p>
      <p><strong>Total:</strong> ${formatCurrency(total)}</p>
      ${pedido.fechaSolicitudEntrega ? `<p><strong>Fecha solicitada:</strong> ${pedido.fechaSolicitudEntrega}</p>` : ''}
      <p>Se abrirá WhatsApp en una nueva pestaña para enviar el mensaje al comercio.</p>
    `;
  }

  // Mostrar modal
  if (waModal) {
    waModal.style.display = 'flex';
    waModal.classList.add('show');
  }

  // Setear handlers de confirmación/cancel
  const confirmBtn = document.getElementById('confirmOpenWhatsApp');
  const cancelBtn = document.getElementById('cancelOpenWhatsApp');
  const closeBtn = document.getElementById('closeWaConfirm');

  function cleanupAfterSend() {
    // Limpiar y cerrar
    cart = [];
    activeCoupon = null;
    saveCart();
    updateCartUI();
    closeModal('checkoutModal');
    closeModal('cartModal');
    // Actualizar vistas administrativas si están disponibles
    if (typeof renderPedidosCatalogo === 'function') renderPedidosCatalogo();
    if (typeof updatePedidosStats === 'function') updatePedidosStats();
    if (typeof updateTabBadges === 'function') updateTabBadges();
    showNotification('¡Pedido enviado! Te contactaremos pronto para confirmar.', 'success');
  }

  function openWhatsAppAndCleanup() {
    try {
      window.open(whatsappURL, '_blank');
    } catch (err) {
      window.location.href = whatsappURL;
    }
    // cerrar modal
    if (waModal) { waModal.style.display = 'none'; waModal.classList.remove('show'); }
    cleanupAfterSend();
    // remover listeners para evitar duplicados
    confirmBtn && confirmBtn.removeEventListener('click', openWhatsAppAndCleanup);
    cancelBtn && cancelBtn.removeEventListener('click', cancelHandler);
    closeBtn && closeBtn.removeEventListener('click', cancelHandler);
  }

  function cancelHandler() {
    if (waModal) { waModal.style.display = 'none'; waModal.classList.remove('show'); }
    // remover listeners
    confirmBtn && confirmBtn.removeEventListener('click', openWhatsAppAndCleanup);
    cancelBtn && cancelBtn.removeEventListener('click', cancelHandler);
    closeBtn && closeBtn.removeEventListener('click', cancelHandler);
  }

  confirmBtn && confirmBtn.addEventListener('click', openWhatsAppAndCleanup);
  cancelBtn && cancelBtn.addEventListener('click', cancelHandler);
  closeBtn && closeBtn.addEventListener('click', cancelHandler);
}

// NUEVO: Enviar comprobante (con seña)
function sendTransferProof() {
  console.log('sendTransferProof invoked');
  const btn = document.getElementById('btnSendProof');
  if (btn) btn.disabled = true;
  const nombre = (document.getElementById('transferName')?.value || '').trim();
  // El formulario de transferencia no incluye campo 'transferApellido'
  const apellido = (document.getElementById('transferApellido')?.value || '').trim();
  const telefono = (document.getElementById('transferPhone')?.value || '').trim();
  const email = (document.getElementById('transferEmail')?.value || '').trim();
  const direccion = (document.getElementById('transferAddress')?.value || '').trim();
  const file = document.getElementById('transferFile')?.files[0];

  // Validaciones: nombre, teléfono, email y comprobante son obligatorios
  const missing = [];
  if (!nombre) missing.push('nombre');
  if (!telefono) missing.push('teléfono');
  if (!email) missing.push('email');
  if (!file) missing.push('comprobante');
  if (missing.length > 0) {
    console.warn('Validación fallida: campos faltantes', { missing, nombre, telefono, email, file });
    const humanList = missing.map((s) => `<strong>${s}</strong>`).join(', ');
    const message = `Faltan los siguientes datos obligatorios: ${humanList}. Por favor completalos antes de continuar.`;
    showInfoModal('Campos incompletos', message);
    if (btn) btn.disabled = false;
    return;
  }

  // Fecha de entrega debe seleccionarse cuando se exige en UI
  if (!selectedDeliveryDate) {
    console.warn('Validación fallida: no hay selectedDeliveryDate');
    showInfoModal('Fecha faltante', 'Selecciona una fecha de entrega en el calendario antes de enviar el comprobante.');
    if (btn) btn.disabled = false;
    return;
  }

  // Validar que la fecha seleccionada cumple el mínimo de anticipación
  try {
    const minSelectable = getMinSelectableDateForTransfer();
    const selDate = new Date(selectedDeliveryDate + 'T00:00:00');
    if (selDate < minSelectable) {
      const formattedMin = minSelectable.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const formattedSel = selDate.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      console.warn('Fecha seleccionada no cumple mínimo', { selectedDeliveryDate, minSelectable: minSelectable.toISOString().slice(0,10) });
      showInfoModal('Fecha no permitida', `La fecha seleccionada (<strong>${formattedSel}</strong>) no cumple el tiempo mínimo para el método de envío. El primer día disponible es <strong>${formattedMin}</strong>. Cambiá el método a <strong>retiro</strong> o elegí otra fecha.`);
      // Evitar estado repetido: limpiar la selección para que el usuario deba elegir otra
      selectedDeliveryDate = null;
  const selectedDateDisplay = document.getElementById('selectedDateDisplay'); if (selectedDateDisplay) selectedDateDisplay.style.display = 'none';
  try { renderAvailabilityCalendar('deliveryCalendar'); } catch(e) {}
      if (btn) btn.disabled = false;
      return;
    }
  } catch (e) {}

  if (!email.includes('@')) {
    console.warn('Validación fallida: email inválido', { email });
    showInfoModal('Email inválido', 'El email proporcionado no parece válido. Revisa y corrige antes de continuar.');
    if (btn) btn.disabled = false;
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    console.warn('Validación fallida: archivo demasiado grande', { size: file.size });
    showInfoModal('Archivo muy grande', 'El comprobante debe ser menor a 5MB. Comprimí la imagen o subí un PDF si es posible.');
    if (btn) btn.disabled = false;
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    console.warn('Validación fallida: tipo de archivo no permitido', { type: file.type });
    showInfoModal('Tipo de archivo inválido', 'Solo se permiten archivos JPG, PNG o PDF como comprobante.');
    if (btn) btn.disabled = false;
    return;
  }
  // Si es imagen muy grande, intentar comprimirla en el cliente para ahorrar espacio en localStorage
  const isImage = file.type.startsWith('image/');
  const processFileToDataURL = () => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const prepareComprobante = async () => {
    try {
      if (isImage && file.size > 1024 * 1024) {
        // comprimir imagen (max width 1200px, calidad 0.75)
        try {
          const compressed = await compressImageFile(file, 1200, 0.75);
          return compressed;
        } catch (compErr) {
          console.warn('No se pudo comprimir imagen, se usará original', compErr);
          return await processFileToDataURL();
        }
      }
      return await processFileToDataURL();
    } catch (e) {
      throw e;
    }
  };

  // Convertir (o comprimir) a base64 y procesar el pedido
  prepareComprobante().then((comprobanteBase64) => {

    // Guardar pedido con seña
    let pedido;
    try {
      pedido = savePedidoCatalogo({
        cliente: { nombre, apellido, telefono, email, direccion },
        metodoPago: 'transferencia',
        estadoPago: 'seña_pagada',
        comprobante: comprobanteBase64,
        notas: '',
        fechaSolicitudEntrega: selectedDeliveryDate // Con seña = puede elegir fecha
      });
    } catch (saveErr) {
      console.error('Error al guardar el pedido', saveErr);
      try { showInfoModal('Error al guardar pedido', 'Ocurrió un error al intentar guardar tu pedido localmente. Probá reducir el tamaño del comprobante o contactanos por WhatsApp.'); } catch(e){}
      // Re-enable button
      const btn = document.getElementById('btnSendProof'); if (btn) btn.disabled = false;
      return;
    }

    // Registrar movimiento financiero por la seña
    if (typeof registrarMovimiento === 'function') {
      const clienteName = (pedido.cliente && (pedido.cliente.nombre || pedido.cliente.apellido)) 
        ? `${(pedido.cliente.nombre||'').trim()} ${(pedido.cliente.apellido||'').trim()}`.trim() 
        : pedido.cliente?.telefono || 'Cliente';
      
      registrarMovimiento({ 
        tipo: 'ingreso', 
        monto: pedido.total * 0.5, 
        categoria: 'Señas', 
        descripcion: `Seña pedido #${pedido.id} (catálogo)`, 
        fecha: pedido.fechaCreacion.slice(0,10),
        clienteName: clienteName,
        pedidoId: pedido.id
      });
    }

    // Mostrar modal de confirmación con código de pedido (mejor diseño que un alert)
    try {
      // Limpiar y cerrar vistas previas
      cart = [];
      activeCoupon = null;
      selectedDeliveryDate = null;
      saveCart();
      updateCartUI();
      closeModal('checkoutModal');
      closeModal('cartModal');

      // Actualizar vistas administrativas si existen
      if (typeof renderPedidosCatalogo === 'function') renderPedidosCatalogo();
      if (typeof updatePedidosStats === 'function') updatePedidosStats();
      if (typeof updateTabBadges === 'function') updateTabBadges();

      const confModal = document.getElementById('confirmationModal');
      const trackingEl = document.getElementById('trackingCodeDisplay');
      if (trackingEl) trackingEl.textContent = `#${pedido.id}`;
      if (confModal) {
        confModal.style.display = 'flex';
        confModal.classList.add('show');
        try { confModal.setAttribute('aria-hidden', 'false'); } catch (e) {}
      }

      const closeConf = document.getElementById('closeConfirmationBtn');
      if (closeConf) {
        closeConf.onclick = () => closeModal('confirmationModal');
      }

    } catch (err) {
      console.error('Error mostrando modal de confirmación', err);
      showNotification(`¡Pedido #${pedido.id} registrado! Revisaremos tu comprobante y te confirmaremos pronto.`, 'success');
      if (btn) btn.disabled = false;
    }
    // re-enable send button after processing
    if (btn) btn.disabled = false;
  }).catch((err) => {
    console.error('Error preparando/comprobando el comprobante', err);
    try { showInfoModal('Error procesando comprobante', 'Ocurrió un error al procesar el comprobante. Probá con otro archivo o contactanos.'); } catch(e){}
    if (btn) btn.disabled = false;
  });
}

// Comprimir imagen en el cliente usando canvas, devuelve dataURL
function compressImageFile(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // extraer como JPEG para mejor compresión
        const mime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    } catch (err) { reject(err); }
  });
}

// Funciones auxiliares
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(amount);
}

function showNotification(message, type = 'info') {
  // Puedes reemplazar con un toast más elegante
  const color = type === 'success' ? '#4CAF50' : type === 'error' ? '#e53935' : '#0984e3';
  console.log(`[${type.toUpperCase()}]: ${message}`);
  alert(message); // Temporal
}

// Mostrar el modal de información estilizado (#infoModal) con título y mensaje (HTML permitido)
function showInfoModal(title, htmlMessage) {
  const modal = document.getElementById('infoModal');
  if (!modal) {
    // Fallback a showNotification si modal no existe
    showNotification(stripHtml(htmlMessage), 'info');
    return;
  }
  const titleEl = document.getElementById('infoModalTitle') || modal.querySelector('.info-modal-title');
  const bodyEl = document.getElementById('infoModalBody') || modal.querySelector('.info-modal-body');
  const closeBtn = document.getElementById('closeInfoModal') || modal.querySelector('.info-modal-close');
  const okBtn = document.getElementById('infoModalOk');
  if (titleEl) titleEl.innerText = title || '';
  if (bodyEl) bodyEl.innerHTML = htmlMessage || '';
  // Mostrar modal de forma consistente
  modal.style.display = 'flex';
  modal.classList.add('show');
  try { modal.setAttribute('aria-hidden', 'false'); } catch (e) {}
  // attach close handlers (use addEventListener and keep references so we can remove them)
  const hide = () => {
    modal.style.display = 'none';
    modal.classList.remove('show');
    try { modal.setAttribute('aria-hidden', 'true'); } catch(e){}
    // cleanup
    if (closeBtn && closeHandlerRef) closeBtn.removeEventListener('click', closeHandlerRef);
    if (okBtn && okHandlerRef) okBtn.removeEventListener('click', okHandlerRef);
    modal.removeEventListener('click', outsideHandlerRef);
    document.removeEventListener('keydown', escHandlerRef);
    // clear refs
    closeHandlerRef = null; okHandlerRef = null; outsideHandlerRef = null; escHandlerRef = null;
  };

  let closeHandlerRef = null;
  let okHandlerRef = null;
  let outsideHandlerRef = null;
  let escHandlerRef = null;

  if (closeBtn) {
    closeHandlerRef = () => hide();
    closeBtn.addEventListener('click', closeHandlerRef);
  }
  if (okBtn) {
    okHandlerRef = () => hide();
    okBtn.addEventListener('click', okHandlerRef);
  }

  // cerrar al hacer click fuera del modal-content
  outsideHandlerRef = (ev) => {
    const content = modal.querySelector('.modal-content');
    if (content && !content.contains(ev.target)) hide();
  };
  modal.addEventListener('click', outsideHandlerRef);

  // cerrar con Escape
  escHandlerRef = (ev) => { if (ev.key === 'Escape') hide(); };
  document.addEventListener('keydown', escHandlerRef);
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    // Asegurar que también se oculte el elemento (algunos modales usan display:flex inline)
    modal.style.display = 'none';
    // Marcar como oculto para tecnologías asistivas
    try { modal.setAttribute('aria-hidden', 'true'); } catch (e) {}
    // Restaurar foco al elemento que lo abrió (si existe)
    try {
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    } catch (err) {}
    lastFocusedElement = null;
  }
}

function setupCatalogEvents() {
  const searchInput = document.getElementById('catalogSearch');
  if (searchInput) searchInput.addEventListener('input', renderCatalog);

  const filterSelect = document.getElementById('catalogFilter');
  if (filterSelect) filterSelect.addEventListener('change', renderCatalog);

  const cartFloat = document.getElementById('cartFloat');
  if (cartFloat) cartFloat.addEventListener('click', showCartModal);

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('cart-modal') || e.target.id === 'closeCartBtn' || e.target.id === 'closeCartBtnFooter') {
      closeModal('cartModal');
    }
    if (e.target.classList.contains('checkout-modal') || e.target.id === 'closeCheckoutBtn') {
      closeModal('checkoutModal');
    }
  });

  const btnWhatsApp = document.getElementById('btnWhatsApp');
  if (btnWhatsApp) {
    btnWhatsApp.removeEventListener('click', sendToWhatsApp);
    btnWhatsApp.addEventListener('click', sendToWhatsApp);
  }

  // Mostrar / ocultar info de pickup cuando cambia el método de entrega
  document.querySelectorAll('input[name="deliveryMethod"]').forEach(r => {
    r.addEventListener('change', (e) => {
      const val = e.target.value;
      const pickup = document.getElementById('pickupInfo');
      const addressInput = document.getElementById('checkoutAddress');
      if (pickup) pickup.style.display = val === 'retiro' ? 'block' : 'none';
      // Si retiro, mostrar la dirección del local en el campo de dirección (no obligatorio)
      if (val === 'retiro') {
        if (addressInput) addressInput.value = document.getElementById('pickupAddressText')?.textContent || addressInput.value;
      }
    });
  });

  // Registrar listeners para radios de la sección de Transferencia (por si se abre directamente)
  document.querySelectorAll('input[name="deliveryMethodTransfer"]').forEach(r => {
    try { r.removeEventListener('change', handleDeliveryMethodTransferChange); } catch (e) {}
    r.addEventListener('change', handleDeliveryMethodTransferChange);
  });

  // Registrar copia de pickup transfer si existe
  const btnCopyPickupT = document.getElementById('btnCopyPickupTransfer');
  if (btnCopyPickupT) {
    try { btnCopyPickupT.removeEventListener('click', copyPickupAddressTransfer); } catch (e) {}
    btnCopyPickupT.addEventListener('click', copyPickupAddressTransfer);
  }

  // Inicializar texto de pickup (dirección del local y link compartido)
  const pickupAddressText = document.getElementById('pickupAddressText');
  if (pickupAddressText) {
    // Texto visible para el usuario; cambialo por la dirección real de tu local
    pickupAddressText.textContent = 'Av. Siempre Viva 742, Barrio Centro, Ciudad - Provincia (Lun-Vie 9:00-18:00)';
  }

  const btnCopyPickup = document.getElementById('btnCopyPickup');
  if (btnCopyPickup) {
    btnCopyPickup.addEventListener('click', () => {
      const txt = document.getElementById('pickupAddressText')?.textContent || '';
      try { navigator.clipboard.writeText(txt); if (typeof showNotification === 'function') showNotification('Dirección copiada al portapapeles', 'success'); } catch (e) { alert('No se pudo copiar'); }
    });
  }

  const transferOption = document.getElementById('transferOption');
  if (transferOption) {
    transferOption.removeEventListener('click', showTransferOption);
    transferOption.addEventListener('click', showTransferOption);
  }

  const btnSendProof = document.getElementById('btnSendProof');
  if (btnSendProof) {
    btnSendProof.removeEventListener('click', sendTransferProof);
    btnSendProof.addEventListener('click', sendTransferProof);
  }

  const btnCheckout = document.getElementById('btnCheckout');
  if (btnCheckout) {
    btnCheckout.removeEventListener('click', proceedToCheckout);
    btnCheckout.addEventListener('click', proceedToCheckout);
  }

  const whatsappOption = document.getElementById('whatsappOption');
  if (whatsappOption) {
    whatsappOption.addEventListener('click', () => {
      const waSection = document.getElementById('whatsappSection');
      const transferSection = document.getElementById('transferSection');
      if (waSection) waSection.style.display = 'block';
      if (transferSection) transferSection.style.display = 'none';
    });
  }

  const closeDetallePedidoBtn = document.querySelector('#detallePedidoModal .close-modal');
  if (closeDetallePedidoBtn) {
    closeDetallePedidoBtn.addEventListener('click', () => closeModal('detallePedidoModal'));
  }

  const closeConfirmationBtn = document.getElementById('closeConfirmationBtn');
  if (closeConfirmationBtn) {
    try { closeConfirmationBtn.removeEventListener && closeConfirmationBtn.removeEventListener('click', () => {}); } catch(e){}
    closeConfirmationBtn.addEventListener('click', () => closeModal('confirmationModal'));
  }

  // Listener delegado: cerrar cualquier modal cuando se clickea un .close-modal dentro de un modal
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.close-modal');
    if (!btn) return;
    const modalParent = btn.closest && btn.closest('.pedido-modal, .image-modal, .calendar-modal');
    if (modalParent && modalParent.id) {
      closeModal(modalParent.id);
    }
  });
}

// Inicialización automática al cargar DOM
document.addEventListener('DOMContentLoaded', initCatalog);