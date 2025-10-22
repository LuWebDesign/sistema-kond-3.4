// marketing.js - Central de Promociones y Cupones
(function(){
  const STORAGE_KEY = 'marketing_promotions';
  const COUPONS_KEY = 'marketing_coupons';
  let searchQuery = '';
  let currentTab = 'promotions'; // 'promotions' o 'coupons'

  // Persistencia promociones
  function loadPromos(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; }
  }
  function savePromos(list){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
    } catch (err) {
      console.error('Error guardando promociones:', err);
      alert('No se pudo guardar la promoción. El almacenamiento local puede estar lleno.');
    }
  }

  // Persistencia cupones
  function loadCoupons(){
    try { return JSON.parse(localStorage.getItem(COUPONS_KEY) || '[]'); } catch(e){ return []; }
  }
  function saveCoupons(list){
    try {
      localStorage.setItem(COUPONS_KEY, JSON.stringify(list || []));
      // Actualizar cupones en catalog.js (sincronización)
      window.dispatchEvent(new CustomEvent('coupons:updated'));
    } catch (err) {
      console.error('Error guardando cupones:', err);
      alert('No se pudo guardar el cupón. El almacenamiento local puede estar lleno.');
    }
  }

  // Acceso a productos
  function getProducts(){
    try { 
      const products = JSON.parse(localStorage.getItem('productosBase') || '[]');
      // Permitir productos que no tengan el campo o que tengan allowPromotions !== false
      return products.filter(p => p.allowPromotions !== false);
    } catch(e){ 
      return []; 
    }
  }

  // Utils
  function el(sel){ return document.querySelector(sel); }
  function escapeHtml(str){
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function toTags(str){
    const raw = String(str || '').trim();
    return raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : [];
  }
  function fmtRange(a,b){
    const s = (a||''); const e = (b||'');
    if (!s && !e) return '—';
    if (s && !e) return `${s} →`;
    if (!s && e) return `→ ${e}`;
    return `${s} → ${e}`;
  }

  // Tipos de promoción y sus campos específicos
  const PROMO_TYPES = {
    percentage_discount: {
      label: 'Descuento Porcentual',
      fields: ['percentage'],
      description: 'Reducir precio en % del original'
    },
    fixed_price: {
      label: 'Precio Fijo',
      fields: ['newPrice'],
      description: 'Establecer precio fijo específico'
    },
    buy_x_get_y: {
      label: '2x1 / Lleva X Paga Y',
      fields: ['buyQuantity', 'payQuantity'],
      description: 'Oferta de cantidad: lleva X unidades y paga Y'
    },
    free_shipping: {
      label: 'Envío Gratis',
      fields: ['minAmount'],
      description: 'Envío gratuito con compra mínima'
    },
    badge_only: {
      label: 'Solo Insignia',
      fields: [],
      description: 'Solo mostrar badge sin cambio de precio'
    }
  };

  // Modal dinámico para crear/editar promoción
  function openCreateModal(editPromo) {
    // Si editPromo es un Event, establecerlo como null
    if (editPromo && editPromo.type && editPromo.target) {
      editPromo = null;
    }
    
    console.log('[DEBUG] openCreateModal llamado con:', editPromo);
    closeModal();
    const isEdit = !!editPromo;
    console.log('[DEBUG] isEdit:', isEdit);
    const products = getProducts();
    
    const modal = document.createElement('div');
    modal.id = 'mkPromoModal';
    modal.className = 'pedido-modal show';
    
    // Generar opciones de productos
    let productOptions = '';
    if (products.length === 0) {
      productOptions = `<option disabled>No hay productos disponibles para promociones</option>`;
    } else {
      productOptions = products.map(p => 
        `<option value="${p.id}" ${editPromo?.productIds?.includes(p.id) ? 'selected' : ''}>${escapeHtml(p.nombre)} (#${p.id})</option>`
      ).join('');
    }
    
    // Generar opciones de tipo
    const typeOptions = Object.entries(PROMO_TYPES).map(([key, config]) => 
      `<option value="${key}" ${editPromo?.type === key ? 'selected' : ''}>${escapeHtml(config.label)}</option>`
    ).join('');

    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="mkPromoTitle" style="max-width: 800px;">
        <button class="close-modal" id="mkPromoClose" aria-label="Cerrar">×</button>
        <div class="modal-header">
          <h3 id="mkPromoTitle">${isEdit ? 'Editar' : 'Nueva'} promoción</h3>
        </div>
        <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
          <form id="mkPromoForm" class="mk-form" autocomplete="off">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 16px;">
              <div class="info-block">
                <label class="label required" for="mkTitle">Título</label>
                <input id="mkTitle" class="edit-input" type="text" placeholder="Ej: Semana del Cliente" value="${escapeHtml(editPromo?.title || '')}" required>
                <span class="error-message" id="mkTitleError"></span>
              </div>
              <div class="info-block">
                <label class="label" for="mkType">Tipo de promoción</label>
                <select id="mkType" class="edit-input">
                  ${typeOptions}
                </select>
                <span id="mkTypeDesc" class="mk-type-desc"></span>
              </div>
              <div class="info-block" style="grid-column: 1 / -1;">
                <label class="label" for="mkSummary">Descripción</label>
                <input id="mkSummary" class="edit-input" type="text" placeholder="Resumen corto de la promoción" value="${escapeHtml(editPromo?.summary || '')}">
              </div>
              <div class="info-block">
                <label class="label" for="mkStart">Inicio</label>
                <input id="mkStart" class="edit-input" type="date" value="${editPromo?.start || ''}">
              </div>
              <div class="info-block">
                <label class="label" for="mkEnd">Fin</label>
                <input id="mkEnd" class="edit-input" type="date" value="${editPromo?.end || ''}">
              </div>
              <div class="info-block">
                <label class="label" for="mkBadge">Insignia (texto del badge)</label>
                <input id="mkBadge" class="edit-input" type="text" placeholder="Ej: PROMO" value="${escapeHtml(editPromo?.badge || '')}">
              </div>
              <div class="info-block" style="grid-column: 1 / -1;">
                <label class="label" for="mkColor">Color del badge</label>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px;">
                  <button type="button" class="mk-color-preset" data-color="#ef4444" style="background: #ef4444;" title="Rojo">🔴</button>
                  <button type="button" class="mk-color-preset" data-color="#f97316" style="background: #f97316;" title="Naranja">🟠</button>
                  <button type="button" class="mk-color-preset" data-color="#eab308" style="background: #eab308;" title="Amarillo">🟡</button>
                  <button type="button" class="mk-color-preset" data-color="#22c55e" style="background: #22c55e;" title="Verde">🟢</button>
                  <button type="button" class="mk-color-preset" data-color="#3b82f6" style="background: #3b82f6;" title="Azul">🔵</button>
                  <button type="button" class="mk-color-preset" data-color="#a855f7" style="background: #a855f7;" title="Morado">🟣</button>
                  <button type="button" class="mk-color-preset" data-color="#ec4899" style="background: #ec4899;" title="Rosa">💗</button>
                  <button type="button" class="mk-color-preset" data-color="#6b7280" style="background: #6b7280;" title="Gris">⚫</button>
                  <button type="button" class="mk-color-preset" data-color="#ffffff" style="background: #ffffff; border: 2px solid #374151;" title="Blanco">⚪</button>
                  <button type="button" class="mk-color-preset" data-color="#000000" style="background: #000000;" title="Negro">⚫</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: end;">
                  <div>
                    <label class="label" style="font-size: 0.85rem; margin-bottom: 4px;">Color de fondo</label>
                    <input id="mkColor" class="edit-input" type="color" value="${editPromo?.color || '#3b82f6'}" style="height: 40px; padding: 4px; width: 100%;">
                  </div>
                  <div>
                    <label class="label" style="font-size: 0.85rem; margin-bottom: 4px;">Color del texto</label>
                    <select id="mkTextColor" class="edit-input" style="height: 40px;">
                      <option value="auto" ${!editPromo?.textColor || editPromo?.textColor === 'auto' ? 'selected' : ''}>Auto (detectar contraste)</option>
                      <option value="#ffffff" ${editPromo?.textColor === '#ffffff' ? 'selected' : ''}>⚪ Blanco</option>
                      <option value="#000000" ${editPromo?.textColor === '#000000' ? 'selected' : ''}>⚫ Negro</option>
                      <option value="#1f2937" ${editPromo?.textColor === '#1f2937' ? 'selected' : ''}>Gris oscuro</option>
                      <option value="#f3f4f6" ${editPromo?.textColor === '#f3f4f6' ? 'selected' : ''}>Gris claro</option>
                    </select>
                  </div>
                  <div id="mkColorPreview" style="padding: 10px 16px; border-radius: 6px; color: white; font-weight: 600; font-size: 0.875rem; background: ${editPromo?.color || '#3b82f6'}; white-space: nowrap; min-width: 100px; text-align: center;">
                    ${escapeHtml(editPromo?.badge || 'PROMO')}
                  </div>
                </div>
              </div>
              <div class="info-block">
                <label class="label" for="mkTags">Tags (coma separada)</label>
                <input id="mkTags" class="edit-input" type="text" placeholder="verano, outlet" value="${escapeHtml((editPromo?.tags || []).join(', '))}">
              </div>
              <div class="info-block" style="display:flex; align-items:center; gap:8px;">
                <label class="label" for="mkActive" style="margin:0;">Activa</label>
                <input id="mkActive" type="checkbox" ${editPromo?.active !== false ? 'checked' : ''}>
              </div>
            </div>
            
            <!-- Campos específicos por tipo -->
            <div id="mkSpecificFields" class="mk-specific-fields" style="margin-bottom: 16px; padding: 16px; background: rgba(55,65,81,0.3); border-radius: 8px;">
              <!-- Se llena dinámicamente -->
            </div>
            
            <!-- Selección de productos -->
            <div class="info-block" style="margin-bottom: 16px;">
              <label class="label" for="mkProducts">Productos incluidos (${products.length} disponibles)</label>
              <select id="mkProducts" class="edit-input" multiple size="6" style="height: auto;">
                ${productOptions}
              </select>
              <div style="font-size: 0.85rem; color: #9ca3af; margin-top: 4px;">
                Mantén Ctrl/Cmd presionado para seleccionar múltiples productos
              </div>
            </div>
            
            <div class="action-buttons">
              <button type="button" class="primary" id="mkPromoCancel">Cancelar</button>
              <button type="submit" class="secondary" id="mkPromoSave">${isEdit ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    modal.querySelector('#mkPromoClose').addEventListener('click', closeModal);
    modal.querySelector('#mkPromoCancel').addEventListener('click', closeModal);
    modal.querySelector('#mkPromoForm').addEventListener('submit', (e) => onCreateSubmit(e, editPromo));
    
    // Cambio de tipo de promoción
    const typeSelect = modal.querySelector('#mkType');
    typeSelect.addEventListener('change', () => updateSpecificFields(typeSelect.value, true)); // preservar valores al cambiar tipo
    
    // Vista previa del color y badge
    const colorInput = modal.querySelector('#mkColor');
    const textColorInput = modal.querySelector('#mkTextColor');
    const badgeInput = modal.querySelector('#mkBadge');
    const colorPreview = modal.querySelector('#mkColorPreview');
    
    // Función para calcular contraste y elegir color de texto automáticamente
    function getContrastColor(hexColor) {
      // Convertir hex a RGB
      const r = parseInt(hexColor.substr(1, 2), 16);
      const g = parseInt(hexColor.substr(3, 2), 16);
      const b = parseInt(hexColor.substr(5, 2), 16);
      
      // Calcular luminosidad (fórmula WCAG)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Si el fondo es claro (luminance > 0.5), usar texto oscuro
      return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    function updateColorPreview() {
      const bgColor = colorInput.value;
      const textColorMode = textColorInput.value;
      const badgeText = badgeInput.value.trim() || 'PROMO';
      
      // Determinar color de texto
      let textColor;
      if (textColorMode === 'auto') {
        textColor = getContrastColor(bgColor);
      } else {
        textColor = textColorMode;
      }
      
      colorPreview.style.background = bgColor;
      colorPreview.style.color = textColor;
      colorPreview.textContent = badgeText;
    }
    
    colorInput.addEventListener('input', updateColorPreview);
    textColorInput.addEventListener('change', updateColorPreview);
    badgeInput.addEventListener('input', updateColorPreview);
    
    // Botones de colores predefinidos (solo afectan el fondo)
    modal.querySelectorAll('.mk-color-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const color = btn.dataset.color;
        colorInput.value = color;
        updateColorPreview();
      });
    });
    
    // Inicializar campos específicos
    updateSpecificFields(typeSelect.value, false); // NO preservar en la primera carga
    
    // Si estamos editando, cargar los valores de config
    if (editPromo && editPromo.config) {
      setTimeout(() => {
        if (editPromo.config.percentage) el('#mkPercentage').value = editPromo.config.percentage;
        if (editPromo.config.newPrice) el('#mkNewPrice').value = editPromo.config.newPrice;
        if (editPromo.config.buyQuantity) el('#mkBuyQuantity').value = editPromo.config.buyQuantity;
        if (editPromo.config.payQuantity) el('#mkPayQuantity').value = editPromo.config.payQuantity;
        if (editPromo.config.minAmount) el('#mkMinAmount').value = editPromo.config.minAmount;
        if (editPromo.config.discountBadgeColor) el('#mkDiscountBadgeColor').value = editPromo.config.discountBadgeColor;
        if (editPromo.config.discountBadgeTextColor) el('#mkDiscountBadgeTextColor').value = editPromo.config.discountBadgeTextColor;
      }, 50); // Pequeño delay para asegurar que el DOM esté listo
    }
  }

  function updateSpecificFields(type, preserveValues = true) {
    const container = el('#mkSpecificFields');
    const descEl = el('#mkTypeDesc');
    if (!container) return;
    
    const config = PROMO_TYPES[type];
    if (!config) return;
    
    // Guardar valores actuales ANTES de regenerar el HTML
    const currentValues = {};
    if (preserveValues) {
      currentValues.percentage = el('#mkPercentage')?.value || '';
      currentValues.newPrice = el('#mkNewPrice')?.value || '';
      currentValues.buyQuantity = el('#mkBuyQuantity')?.value || '';
      currentValues.payQuantity = el('#mkPayQuantity')?.value || '';
      currentValues.minAmount = el('#mkMinAmount')?.value || '';
      currentValues.discountBadgeColor = el('#mkDiscountBadgeColor')?.value || '';
      currentValues.discountBadgeTextColor = el('#mkDiscountBadgeTextColor')?.value || '';
    }
    
    descEl.textContent = config.description;
    descEl.style.fontSize = '0.85rem';
    descEl.style.color = '#9ca3af';
    descEl.style.fontStyle = 'italic';
    
    let html = `<h4 style="margin: 0 0 12px; color: #e5e7eb;">Configuración específica</h4>`;
    
    if (config.fields.length === 0) {
      html += `<p style="color: #9ca3af; font-style: italic;">No requiere configuración adicional</p>`;
    } else {
      html += `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">`;
      
      config.fields.forEach(field => {
        switch (field) {
          case 'percentage':
            html += `
              <div class="info-block">
                <label class="label" for="mkPercentage">Descuento (%)</label>
                <input id="mkPercentage" class="edit-input" type="number" min="1" max="99" placeholder="20" value="${currentValues.percentage || ''}">
              </div>`;
            break;
          case 'newPrice':
            html += `
              <div class="info-block">
                <label class="label" for="mkNewPrice">Precio nuevo ($)</label>
                <input id="mkNewPrice" class="edit-input" type="number" min="1" placeholder="5000" value="${currentValues.newPrice || ''}">
              </div>`;
            break;
          case 'buyQuantity':
            html += `
              <div class="info-block">
                <label class="label" for="mkBuyQuantity">Cantidad a llevar</label>
                <input id="mkBuyQuantity" class="edit-input" type="number" min="1" placeholder="2" value="${currentValues.buyQuantity || ''}">
              </div>`;
            break;
          case 'payQuantity':
            html += `
              <div class="info-block">
                <label class="label" for="mkPayQuantity">Cantidad a pagar</label>
                <input id="mkPayQuantity" class="edit-input" type="number" min="1" placeholder="1" value="${currentValues.payQuantity || ''}">
              </div>`;
            break;
          case 'minAmount':
            html += `
              <div class="info-block">
                <label class="label" for="mkMinAmount">Compra mínima ($)</label>
                <input id="mkMinAmount" class="edit-input" type="number" min="1" placeholder="10000" value="${currentValues.minAmount || ''}">
              </div>`;
            break;
        }
      });
      
      html += `</div>`;
    }
    
    // Agregar configuración de colores del badge de descuento (siempre visible)
    html += `
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #374151;">
        <h4 style="margin: 0 0 8px; color: #e5e7eb; font-size: 0.9rem;">🎨 Badge de descuento porcentual</h4>
        <p style="color: #9ca3af; font-size: 0.8rem; margin: 0 0 12px;">Personaliza el badge verde con el % (ej: -10%) que aparece cuando hay descuento</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="info-block">
            <label class="label" for="mkDiscountBadgeColor">Color de fondo</label>
            <input id="mkDiscountBadgeColor" class="edit-input" type="color" value="${currentValues.discountBadgeColor || '#10b981'}" style="height: 40px; padding: 4px;">
            <small style="color: #9ca3af; font-size: 0.75rem;">Por defecto: verde (#10b981)</small>
          </div>
          <div class="info-block">
            <label class="label" for="mkDiscountBadgeTextColor">Color del texto</label>
            <select id="mkDiscountBadgeTextColor" class="edit-input" style="height: 40px;">
              <option value="auto" ${!currentValues.discountBadgeTextColor || currentValues.discountBadgeTextColor === 'auto' ? 'selected' : ''}>Auto (detectar contraste)</option>
              <option value="#ffffff" ${currentValues.discountBadgeTextColor === '#ffffff' ? 'selected' : ''}>⚪ Blanco</option>
              <option value="#000000" ${currentValues.discountBadgeTextColor === '#000000' ? 'selected' : ''}>⚫ Negro</option>
            </select>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }

  function closeModal(){
    const modal = document.getElementById('mkPromoModal');
    if (modal) modal.remove();
  }

  function onCreateSubmit(e, editPromo = null){
    e.preventDefault();
    const title = el('#mkTitle').value.trim();
    const type = el('#mkType').value;
    const summary = el('#mkSummary').value.trim();
    const start = el('#mkStart').value;
    const end = el('#mkEnd').value;
    const badge = el('#mkBadge').value.trim();
    const color = el('#mkColor').value || '#3b82f6';
    const textColor = el('#mkTextColor').value || 'auto';
    const tags = toTags(el('#mkTags').value);
    const active = el('#mkActive').checked;
    
    // Productos seleccionados
    const productSelect = el('#mkProducts');
    const productIds = Array.from(productSelect.selectedOptions).map(opt => parseInt(opt.value, 10)).filter(Boolean);
    
    // Campos específicos según tipo
    const config = {};
    const typeConfig = PROMO_TYPES[type];
    if (typeConfig && typeConfig.fields) {
      typeConfig.fields.forEach(field => {
        switch (field) {
          case 'percentage':
            config.percentage = parseFloat(el('#mkPercentage')?.value) || 0;
            break;
          case 'newPrice':
            config.newPrice = parseFloat(el('#mkNewPrice')?.value) || 0;
            break;
          case 'buyQuantity':
            config.buyQuantity = parseInt(el('#mkBuyQuantity')?.value) || 1;
            break;
          case 'payQuantity':
            config.payQuantity = parseInt(el('#mkPayQuantity')?.value) || 1;
            break;
          case 'minAmount':
            config.minAmount = parseFloat(el('#mkMinAmount')?.value) || 0;
            break;
        }
      });
    }
    
    // Configuración de colores del badge de descuento (aplicable a todos los tipos)
    const discountBadgeColor = el('#mkDiscountBadgeColor')?.value || '#10b981';
    const discountBadgeTextColor = el('#mkDiscountBadgeTextColor')?.value || 'auto';
    config.discountBadgeColor = discountBadgeColor;
    config.discountBadgeTextColor = discountBadgeTextColor;

    // Validaciones
    el('#mkTitleError').textContent = '';
    if (!title){
      el('#mkTitleError').textContent = 'El título es obligatorio';
      return;
    }
    
    if (productIds.length === 0 && type !== 'free_shipping') {
      showNotification('Selecciona al menos un producto para la promoción', 'error');
      return;
    }

    const promo = {
      id: editPromo ? editPromo.id : Date.now() + Math.floor(Math.random()*100000),
      title, type, summary,
      start, end,
      badge, color, textColor,
      tags,
      active,
      productIds,
      config,
      createdAt: editPromo ? editPromo.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const list = loadPromos();
    if (editPromo) {
      const idx = list.findIndex(p => p.id === editPromo.id);
      if (idx !== -1) {
        list[idx] = promo;
      }
    } else {
      list.unshift(promo);
    }
    
    try {
      savePromos(list);
    } catch (e) {
      console.error('Error guardando la promoción:', e);
      showNotification('No se pudo guardar la promoción. Revisa el almacenamiento del navegador.', 'error');
      return;
    }
    closeModal();
    
    // Asegurar que el render se ejecute después del cierre del modal
    setTimeout(() => {
      render();
      showNotification(`Promoción ${editPromo ? 'actualizada' : 'creada'} correctamente`, 'success');
    }, 100);
  }

  // Render de la grilla
  function render(){
    console.log('[DEBUG] render() llamado, currentTab:', currentTab);
    const grid = el('#mkPromosContainer');
    const empty = el('#mkEmptyState');
    console.log('[DEBUG] grid:', grid, 'empty:', empty);
    if (!grid || !empty) return;

    // Renderizar según la pestaña activa
    if (currentTab === 'coupons') {
      const html = renderCoupons();
      grid.innerHTML = html;
      empty.style.display = 'none';
      return;
    }

    // Renderizar promociones (pestaña por defecto)
    const list = loadPromos();
    console.log('[DEBUG] Promociones cargadas:', list);
    const products = getProducts();
    const filtered = list.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.title||'').toLowerCase().includes(q) ||
        (p.summary||'').toLowerCase().includes(q) ||
        (p.badge||'').toLowerCase().includes(q) ||
        (p.tags||[]).some(t => (t||'').toLowerCase().includes(q))
      );
    });

    console.log('[DEBUG] Promociones filtradas:', filtered.length, 'de', list.length);

    if (!filtered.length){
      grid.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = filtered.map(p => {
      const typeConfig = PROMO_TYPES[p.type] || {};
      const productCount = (p.productIds || []).length;
      const productNames = (p.productIds || []).map(id => {
        const prod = products.find(pr => pr.id === id);
        return prod ? prod.nombre : `#${id}`;
      }).slice(0, 3);
      
      // Generar descripción de configuración
      let configDesc = '';
      if (p.config) {
        const cfg = p.config;
        switch (p.type) {
          case 'percentage_discount':
            configDesc = `${cfg.percentage || 0}% de descuento`;
            break;
          case 'fixed_price':
            configDesc = `Precio fijo: $${(cfg.newPrice || 0).toLocaleString()}`;
            break;
          case 'buy_x_get_y':
            configDesc = `Lleva ${cfg.buyQuantity || 1}, paga ${cfg.payQuantity || 1}`;
            break;
          case 'free_shipping':
            configDesc = `Envío gratis desde $${(cfg.minAmount || 0).toLocaleString()}`;
            break;
          case 'badge_only':
            configDesc = 'Solo insignia decorativa';
            break;
        }
      }
      
      // Calcular color de texto del badge
      let badgeTextColor = p.textColor || '#ffffff';
      if (badgeTextColor === 'auto') {
        const bgColor = p.color || '#3b82f6';
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        badgeTextColor = luminance > 0.5 ? '#000000' : '#ffffff';
      }
      
      return `
        <article class="mk-promo-card" data-id="${p.id}">
          <!-- Header con tipo y estado -->
          <div class="mk-promo-header">
            <span class="mk-promo-type">${escapeHtml(typeConfig.label || p.type)}</span>
            <span class="mk-promo-status ${p.active ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              ${p.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          
          <!-- Título con badge -->
          <div class="mk-promo-title-container">
            ${p.badge ? `<span class="mk-promo-badge" style="background: ${escapeHtml(p.color || '#3b82f6')}; color: ${badgeTextColor};">${escapeHtml(p.badge)}</span>` : ''}
            <h3 class="mk-promo-title">${escapeHtml(p.title || 'Promoción sin título')}</h3>
          </div>
          
          ${p.summary ? `<p class="mk-promo-summary">${escapeHtml(p.summary)}</p>` : ''}
          
          ${configDesc ? `<div class="mk-promo-config">${escapeHtml(configDesc)}</div>` : ''}
          
          <!-- Detalles -->
          <div class="mk-promo-details">
            <div class="mk-promo-detail">
              <span class="detail-icon">📅</span>
              <span class="detail-text">${escapeHtml(fmtRange(p.start, p.end))}</span>
            </div>
            <div class="mk-promo-detail">
              <span class="detail-icon">🎯</span>
              <span class="detail-text">${productCount} producto${productCount !== 1 ? 's' : ''}${productNames.length > 0 ? `: ${productNames.join(', ')}${productCount > 3 ? '...' : ''}` : ''}</span>
            </div>
            ${p.tags && p.tags.length ? `
            <div class="mk-promo-detail">
              <span class="detail-icon">🏷️</span>
              <span class="detail-text">${escapeHtml(p.tags.join(', '))}</span>
            </div>
            ` : ''}
          </div>
          
          <!-- Botones de acción -->
          <div class="mk-promo-actions">
            <button class="mk-card-btn mk-btn-edit" data-action="edit" data-id="${p.id}">
              <span class="btn-icon">✏️</span>
              Editar
            </button>
            <button class="mk-card-btn mk-btn-toggle ${p.active ? 'deactivate' : 'activate'}" data-action="toggle" data-id="${p.id}">
              <span class="btn-icon">${p.active ? '⏸️' : '▶️'}</span>
              ${p.active ? 'Desactivar' : 'Activar'}
            </button>
            <button class="mk-card-btn mk-btn-delete" data-action="delete" data-id="${p.id}">
              <span class="btn-icon">🗑️</span>
              Eliminar
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  // Acciones tarjeta
  function onCardClick(e){
    const btn = e.target.closest('button.mk-card-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);
    if (!id) return;
    const list = loadPromos();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return;
    
    if (action === 'edit'){
      openCreateModal(list[idx]);
    } else if (action === 'toggle'){
      list[idx].active = !list[idx].active;
      savePromos(list);
      render();
      showNotification(`Promoción ${list[idx].active ? 'activada' : 'desactivada'}`, 'success');
    } else if (action === 'delete'){
      if (confirm('¿Eliminar esta promoción permanentemente?')){
        const title = list[idx].title;
        list.splice(idx,1);
        savePromos(list);
        render();
        showNotification(`Promoción "${title}" eliminada`, 'success');
      }
    }
  }

  // ========== GESTIÓN DE CUPONES ==========
  
  // Modal para crear/editar cupón
  function openCouponModal(editCoupon = null){
    // Si editCoupon es un Event, establecerlo como null
    if (editCoupon && editCoupon.type && editCoupon.target) {
      editCoupon = null;
    }
    
    closeCouponModal();
    const isEdit = !!editCoupon;
    
    const modal = document.createElement('div');
    modal.id = 'mkCouponModal';
    modal.className = 'pedido-modal show';
    
    modal.innerHTML = `
      <div class="modal-content" role="dialog" style="max-width: 600px;">
        <button class="close-modal" id="mkCouponClose">×</button>
        <div class="modal-header">
          <h3>${isEdit ? 'Editar Cupón' : 'Nuevo Cupón'}</h3>
        </div>
        <div class="modal-body">
          <form id="mkCouponForm" style="display: flex; flex-direction: column; gap: 16px;">
            
            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Código del cupón *</label>
              <input type="text" id="couponCode" value="${escapeHtml(editCoupon?.code || '')}" 
                     placeholder="Ej: LASER10, 5X1LLAVEROS" required
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
              <small style="display: block; margin-top: 4px; color: #9ca3af;">El código que ingresará el cliente (solo letras y números, sin espacios)</small>
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Descripción</label>
              <input type="text" id="couponDescription" value="${escapeHtml(editCoupon?.description || '')}" 
                     placeholder="Ej: 10% de descuento en toda la tienda"
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Tipo de descuento *</label>
              <select id="couponType" required
                      style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
                <option value="percentage" ${editCoupon?.type === 'percentage' ? 'selected' : ''}>Porcentaje (%)</option>
                <option value="fixed" ${editCoupon?.type === 'fixed' ? 'selected' : ''}>Monto fijo ($)</option>
              </select>
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Valor del descuento *</label>
              <input type="number" id="couponValue" value="${editCoupon?.value || ''}" 
                     placeholder="Ej: 10 (para 10% o $10)" min="0" step="0.01" required
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
              <small style="display: block; margin-top: 4px; color: #9ca3af;">Para porcentaje: número entre 0-100. Para fijo: monto en pesos</small>
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Monto mínimo de compra</label>
              <input type="number" id="couponMinAmount" value="${editCoupon?.minAmount || ''}" 
                     placeholder="Ej: 10000" min="0" step="100"
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
              <small style="display: block; margin-top: 4px; color: #9ca3af;">Opcional: monto mínimo de carrito para aplicar el cupón</small>
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Cantidad mínima de productos</label>
              <input type="number" id="couponMinQuantity" value="${editCoupon?.minQuantity || ''}" 
                     placeholder="Ej: 5" min="0" step="1"
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
              <small style="display: block; margin-top: 4px; color: #9ca3af;">Opcional: cantidad mínima de productos en el carrito</small>
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Fecha de inicio</label>
              <input type="date" id="couponStart" value="${editCoupon?.start || ''}"
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
            </div>

            <div>
              <label style="display: block; margin-bottom: 4px; font-weight: 500;">Fecha de fin</label>
              <input type="date" id="couponEnd" value="${editCoupon?.end || ''}"
                     style="width: 100%; padding: 8px; border: 1px solid #404040; border-radius: 4px; background: #1f1f1f; color: #e5e7eb;">
            </div>

            <div>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="couponActive" ${editCoupon?.active !== false ? 'checked' : ''}
                       style="width: 18px; height: 18px; cursor: pointer;">
                <span>Cupón activo</span>
              </label>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
              <button type="button" class="secondary" id="mkCouponCancelBtn">Cancelar</button>
              <button type="submit" class="primary">${isEdit ? 'Guardar cambios' : 'Crear cupón'}</button>
            </div>

          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    el('#mkCouponClose')?.addEventListener('click', closeCouponModal);
    el('#mkCouponCancelBtn')?.addEventListener('click', closeCouponModal);
    el('#mkCouponForm')?.addEventListener('submit', (e) => onCouponSubmit(e, editCoupon));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCouponModal();
    });
  }

  function closeCouponModal(){
    const m = el('#mkCouponModal');
    if (m) m.remove();
  }

  function onCouponSubmit(e, editCoupon){
    e.preventDefault();
    
    const code = el('#couponCode')?.value.trim().toUpperCase().replace(/\s/g, '');
    const description = el('#couponDescription')?.value.trim();
    const type = el('#couponType')?.value;
    const value = parseFloat(el('#couponValue')?.value) || 0;
    const minAmount = parseFloat(el('#couponMinAmount')?.value) || 0;
    const minQuantity = parseInt(el('#couponMinQuantity')?.value) || 0;
    const start = el('#couponStart')?.value || '';
    const end = el('#couponEnd')?.value || '';
    const active = el('#couponActive')?.checked ?? true;

    // Validaciones
    if (!code) {
      alert('El código del cupón es requerido');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      alert('El código solo puede contener letras mayúsculas y números (sin espacios ni caracteres especiales)');
      return;
    }
    if (value <= 0) {
      alert('El valor del descuento debe ser mayor a 0');
      return;
    }
    if (type === 'percentage' && value > 100) {
      alert('El porcentaje de descuento no puede ser mayor a 100%');
      return;
    }

    const list = loadCoupons();
    
    // Verificar código duplicado (excepto al editar el mismo cupón)
    const duplicate = list.find(c => c.code === code && c.id !== editCoupon?.id);
    if (duplicate) {
      alert(`Ya existe un cupón con el código "${code}". Por favor usa otro código.`);
      return;
    }

    const coupon = {
      id: editCoupon?.id || Date.now() + Math.floor(Math.random() * 100000),
      code,
      description,
      type,
      value,
      minAmount: minAmount > 0 ? minAmount : undefined,
      minQuantity: minQuantity > 0 ? minQuantity : undefined,
      start: start || undefined,
      end: end || undefined,
      active,
      createdAt: editCoupon?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editCoupon) {
      const idx = list.findIndex(c => c.id === editCoupon.id);
      if (idx !== -1) {
        list[idx] = coupon;
      }
    } else {
      list.unshift(coupon);
    }

    saveCoupons(list);
    closeCouponModal();
    render();
    showNotification(editCoupon ? 'Cupón actualizado' : 'Cupón creado correctamente', 'success');
  }

  function renderCoupons(){
    const list = loadCoupons();
    const filtered = list.filter(c => 
      !searchQuery || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (filtered.length === 0) {
      return '<div class="mk-empty" style="text-align: center; padding: 48px 24px;"><div class="mk-empty-illust" aria-hidden="true">🎫</div><h3>No hay cupones</h3><p>Crea cupones de descuento para que tus clientes puedan aplicarlos en el carrito.</p></div>';
    }

    return filtered.map(c => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const isExpired = c.end && c.end < today;
      const isScheduled = c.start && c.start > today;
      const isActive = c.active && !isExpired && !isScheduled;

      let statusText = '';
      let statusColor = '';
      if (!c.active) {
        statusText = '🔴 Inactivo';
        statusColor = '#ef4444';
      } else if (isExpired) {
        statusText = '⚫ Expirado';
        statusColor = '#9ca3af';
      } else if (isScheduled) {
        statusText = '🟡 Programado';
        statusColor = '#f59e0b';
      } else {
        statusText = '🟢 Activo';
        statusColor = '#10b981';
      }

      const typeLabel = c.type === 'percentage' ? `${c.value}% de descuento` : `$${c.value.toLocaleString()} de descuento`;
      const conditions = [];
      if (c.minAmount) conditions.push(`Compra mínima: $${c.minAmount.toLocaleString()}`);
      if (c.minQuantity) conditions.push(`Mín. ${c.minQuantity} productos`);

      return `
        <article class="mk-card" data-id="${c.id}" style="border: 1px solid var(--mk-border); border-radius: 12px; padding: 16px; background: var(--mk-card);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
            <span style="padding: 4px 8px; background: #374151; border-radius: 6px; font-family: monospace; font-weight: 600; color: #60a5fa;">${escapeHtml(c.code)}</span>
            <span style="font-size:.85rem; color:${statusColor}">${statusText}</span>
          </div>
          
          <h4 style="margin:0 0 4px; font-size: 1.1rem;">${typeLabel}</h4>
          ${c.description ? `<p style="margin:0 0 12px; color:#9ca3af; font-size: .9rem;">${escapeHtml(c.description)}</p>` : ''}
          
          ${conditions.length > 0 ? `<div style="background: rgba(59,130,246,0.1); padding: 6px 10px; border-radius: 6px; margin-bottom: 8px; font-size: .85rem; color: #60a5fa;">${conditions.join(' • ')}</div>` : ''}
          
          <div style="margin: 8px 0; font-size: .85rem; color: #9ca3af;">
            ${c.start || c.end ? `📅 ${escapeHtml(fmtRange(c.start, c.end))}` : '📅 Sin límite de fecha'}
          </div>
          
          <div style="display:flex; gap:8px; flex-wrap: wrap; margin-top: 12px;">
            <button class="mk-coupon-btn" data-action="edit" data-id="${c.id}" style="background: #374151; color: #e5e7eb; border: 1px solid #4b5563; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: .85rem;">✏️ Editar</button>
            <button class="mk-coupon-btn" data-action="toggle" data-id="${c.id}" style="background: ${c.active ? '#dc2626' : '#059669'}; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: .85rem;">${c.active ? '⏸️ Desactivar' : '▶️ Activar'}</button>
            <button class="mk-coupon-btn" data-action="delete" data-id="${c.id}" style="background: #991b1b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: .85rem;">🗑️ Eliminar</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function onCouponClick(e){
    const btn = e.target.closest('button.mk-coupon-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);
    if (!id) return;
    const list = loadCoupons();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return;
    
    if (action === 'edit'){
      openCouponModal(list[idx]);
    } else if (action === 'toggle'){
      list[idx].active = !list[idx].active;
      list[idx].updatedAt = new Date().toISOString();
      saveCoupons(list);
      render();
      showNotification(`Cupón ${list[idx].active ? 'activado' : 'desactivado'}`, 'success');
    } else if (action === 'delete'){
      if (confirm(`¿Eliminar el cupón "${list[idx].code}" permanentemente?`)){
        const code = list[idx].code;
        list.splice(idx,1);
        saveCoupons(list);
        render();
        showNotification(`Cupón "${code}" eliminado`, 'success');
      }
    }
  }

  // Exponer funciones globalmente para integraciones con otras secciones
  window.openCreateModal = openCreateModal;
  window.openCouponModal = openCouponModal;
  window.marketing_render = render;
  window.marketing_loadCoupons = loadCoupons;
  
  document.addEventListener('DOMContentLoaded', () => {
    // Activar toolbar/botones si existen
    const btnNuevaPromo = el('#btnNuevaPromo');
    const btnNuevoCupon = el('#btnNuevoCupon');
    const btnEmptyNew = el('#btnEmptyNew');
    const searchInput = el('#mkSearchInput');
    const grid = el('#mkPromosContainer');

    // Botones de pestañas
    const btnTabPromos = el('#btnTabPromos');
    const btnTabCoupons = el('#btnTabCoupons');

    if (btnNuevaPromo) {
      btnNuevaPromo.removeAttribute('disabled');
      btnNuevaPromo.removeAttribute('title');
      btnNuevaPromo.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[DEBUG] btnNuevaPromo clicked');
        openCreateModal();
      });
    }
    if (btnNuevoCupon) {
      btnNuevoCupon.addEventListener('click', openCouponModal);
    }
    if (btnEmptyNew) {
      btnEmptyNew.removeAttribute('disabled');
      btnEmptyNew.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('[DEBUG] btnEmptyNew clicked');
        openCreateModal();
      });
    }
    if (searchInput){
      searchInput.removeAttribute('disabled');
      searchInput.addEventListener('input', () => { searchQuery = searchInput.value || ''; render(); });
    }
    if (grid) {
      grid.addEventListener('click', onCardClick);
      grid.addEventListener('click', onCouponClick);
    }

    // Manejar pestañas
    function switchTab(tab){
      currentTab = tab;
      if (btnTabPromos) {
        btnTabPromos.classList.toggle('active', tab === 'promotions');
      }
      if (btnTabCoupons) {
        btnTabCoupons.classList.toggle('active', tab === 'coupons');
      }
      if (btnNuevaPromo) {
        btnNuevaPromo.style.display = tab === 'promotions' ? '' : 'none';
      }
      if (btnNuevoCupon) {
        btnNuevoCupon.style.display = tab === 'coupons' ? '' : 'none';
      }
      render();
    }

    if (btnTabPromos) btnTabPromos.addEventListener('click', () => switchTab('promotions'));
    if (btnTabCoupons) btnTabCoupons.addEventListener('click', () => switchTab('coupons'));

    // Render inicial
    switchTab('promotions');
  });
})();
