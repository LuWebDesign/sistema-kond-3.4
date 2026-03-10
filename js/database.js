// database.js

// Estado de filtros de la base de datos
let databaseFilter = 'visible'; // 'visible', 'hidden', 'all'
let databaseSearch = '';
let productToDeleteId = null;

// Funciones para integrar con Marketing
function formatDateForInput(v) {
  if (!v && v !== 0) return '';
  try {
    // Si ya es YYYY-MM-DD
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // Si es ISO datetime, extraer la fecha
    if (typeof v === 'string' && v.indexOf('T') !== -1) return v.split('T')[0];
    // Si viene sólo el año o un número, no es válido para input[type=date]
    return '';
  } catch (e) {
    return '';
  }
}
function getActivePromotionsForProduct(productId) {
  try {
    const allPromos = JSON.parse(localStorage.getItem('marketing_promotions') || '[]');
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const activePromos = allPromos.filter(promo => {
      if (!promo.active) return false;
      if (!promo.productIds || !promo.productIds.includes(productId)) return false;
      
      // Validar fechas
      if (promo.start && promo.start > today) return false;
      if (promo.end && promo.end < today) return false;
      
      return true;
    });

    if (activePromos.length === 0) {
      return '<span style="color: #9ca3af; font-size: 0.85rem;">Sin promociones</span>';
    }

    return activePromos.map(promo => {
      const typeConfig = getPromoTypeConfig(promo.type);
      return `
        <div style="background: rgba(59,130,246,0.1); border: 1px solid #3b82f6; border-radius: 4px; padding: 4px 6px; margin: 2px 0; font-size: 0.8rem;">
          <div style="font-weight: 600; color: #3b82f6;">${escapeHtml(promo.title)}</div>
          <div style="color: #64748b;">${escapeHtml(typeConfig.label)}</div>
          ${promo.badge ? `<span style="background: ${promo.color || '#3b82f6'}; color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.7rem;">${escapeHtml(promo.badge)}</span>` : ''}
        </div>
      `;
    }).join('');
  } catch (e) {
    return '<span style="color: #ef4444; font-size: 0.85rem;">Error</span>';
  }
}

function getPromoTypeConfig(type) {
  const PROMO_TYPES = {
    percentage_discount: { label: 'Descuento %' },
    fixed_price: { label: 'Precio Fijo' },
    buy_x_get_y: { label: '2x1' },
    free_shipping: { label: 'Envío Gratis' },
    badge_only: { label: 'Solo Badge' }
  };
  return PROMO_TYPES[type] || { label: type };
}

function openPromotionsManager(productId) {
  // Abrir modal para gestionar promociones del producto
  const product = productosBase.find(p => p.id === productId);
  if (!product) return;

  const modal = document.createElement('div');
  modal.id = 'dbPromoModal';
  modal.className = 'pedido-modal show';
  modal.innerHTML = `
    <div class="modal-content" role="dialog" style="max-width: 700px;">
      <button class="close-modal" id="dbPromoClose">×</button>
      <div class="modal-header">
        <h3>Promociones para "${escapeHtml(product.nombre)}"</h3>
      </div>
      <div class="modal-body">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <button id="dbCreatePromo" class="primary">+ Nueva promoción</button>
          <button id="dbGoToMarketing" class="secondary">Ir a Marketing</button>
        </div>
        
        <div id="dbPromoList">
          ${renderProductPromotions(productId)}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDbPromoModal();
  });
  modal.querySelector('#dbPromoClose').addEventListener('click', closeDbPromoModal);
  modal.querySelector('#dbCreatePromo').addEventListener('click', () => {
    closeDbPromoModal();
    // Cambiar a sección Marketing y abrir modal
    if (typeof showSection === 'function') showSection('marketing');
    setTimeout(() => {
      if (window.openCreateModal) window.openCreateModal();
    }, 100);
  });
  modal.querySelector('#dbGoToMarketing').addEventListener('click', () => {
    closeDbPromoModal();
    if (typeof showSection === 'function') showSection('marketing');
  });
}

function renderProductPromotions(productId) {
  try {
    const allPromos = JSON.parse(localStorage.getItem('marketing_promotions') || '[]');
    const productPromos = allPromos.filter(promo => 
      promo.productIds && promo.productIds.includes(productId)
    );

    if (productPromos.length === 0) {
      return `
        <div style="text-align: center; padding: 24px; color: #9ca3af;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🎯</div>
          <p>Este producto no está incluido en ninguna promoción.</p>
        </div>
      `;
    }

    return productPromos.map(promo => {
      const typeConfig = getPromoTypeConfig(promo.type);
      const isActive = promo.active;
      const now = new Date().toISOString().split('T')[0];
      const isInDateRange = (!promo.start || promo.start <= now) && (!promo.end || promo.end >= now);
      
      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px; background: ${isActive && isInDateRange ? 'rgba(16,185,129,0.05)' : 'rgba(156,163,175,0.05)'};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 4px; color: #1f2937; display: flex; align-items: center; gap: 8px;">
                ${promo.badge ? `<span style="background: ${promo.color || '#3b82f6'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${escapeHtml(promo.badge)}</span>` : ''}
                ${escapeHtml(promo.title)}
              </h4>
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 0.9rem;">${escapeHtml(typeConfig.label)}</p>
              <div style="font-size: 0.85rem; color: #9ca3af;">
                ${promo.start || promo.end ? `📅 ${promo.start || '∞'} → ${promo.end || '∞'}` : ''}
                <span style="margin-left: 12px; color: ${isActive ? (isInDateRange ? '#059669' : '#f59e0b') : '#ef4444'};">
                  ${isActive ? (isInDateRange ? '🟢 Activa' : '🟡 Programada') : '🔴 Inactiva'}
                </span>
              </div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button onclick="editPromotionFromDb('${promo.id}')" style="background: #6b7280; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">✏️</button>
              <button onclick="togglePromotionFromDb('${promo.id}')" style="background: ${isActive ? '#dc2626' : '#059669'}; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${isActive ? '⏸️' : '▶️'}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    return '<div style="color: #ef4444;">Error cargando promociones</div>';
  }
}

function closeDbPromoModal() {
  const modal = document.getElementById('dbPromoModal');
  if (modal) modal.remove();
}

// Funciones globales para botones inline
window.editPromotionFromDb = function(promoId) {
  closeDbPromoModal();
  if (typeof showSection === 'function') showSection('marketing');
  setTimeout(() => {
    const allPromos = JSON.parse(localStorage.getItem('marketing_promotions') || '[]');
    const promo = allPromos.find(p => p.id == promoId);
    if (promo && window.openCreateModal) {
      window.openCreateModal(promo);
    }
  }, 100);
};

window.togglePromotionFromDb = function(promoId) {
  try {
    const allPromos = JSON.parse(localStorage.getItem('marketing_promotions') || '[]');
    const idx = allPromos.findIndex(p => p.id == promoId);
    if (idx !== -1) {
      allPromos[idx].active = !allPromos[idx].active;
      localStorage.setItem('marketing_promotions', JSON.stringify(allPromos));
      showNotification(`Promoción ${allPromos[idx].active ? 'activada' : 'desactivada'}`, 'success');
      // Refrescar modal
      const productId = parseInt(document.querySelector('[data-action="manage-promos"]')?.dataset.id);
      if (productId) {
        document.getElementById('dbPromoList').innerHTML = renderProductPromotions(productId);
      }
      // Refrescar tabla
      renderDatabase();
    }
  } catch (e) {
    showNotification('Error al cambiar estado de promoción', 'error');
  }
};

function renderDatabase() {
  const container = document.querySelector('.database-container');
  
  // Filtrar productos según el filtro activo
  let productos = productosBase;
  if (databaseFilter === 'visible') {
    productos = productosBase.filter(p => p.publicado !== false);
  } else if (databaseFilter === 'hidden') {
    productos = productosBase.filter(p => p.publicado === false);
  }
  
  // Aplicar búsqueda si existe
  if (databaseSearch) {
    productos = productos.filter(p => 
      p.nombre.toLowerCase().includes(databaseSearch.toLowerCase()) ||
      p.tipo.toLowerCase().includes(databaseSearch.toLowerCase()) ||
      (p.medidas && p.medidas.toLowerCase().includes(databaseSearch.toLowerCase())) ||
      (p.categoria && p.categoria.toLowerCase().includes(databaseSearch.toLowerCase()))
    );
  }
  
  const html = `
    <div class="database-header">
      <div class="database-search">
        <input type="text" id="dbSearch" placeholder="Buscar en base de datos..." value="${databaseSearch}">
      </div>
      <div class="database-controls">
        <div class="filter-badge ${databaseFilter === 'visible' ? 'active' : ''}" data-filter="visible">
          👁️ Visibles (${productosBase.filter(p => p.publicado !== false).length})
        </div>
        <div class="filter-badge ${databaseFilter === 'hidden' ? 'active' : ''}" data-filter="hidden">
          🚫 Ocultos (${productosBase.filter(p => p.publicado === false).length})
        </div>
        <div class="filter-badge ${databaseFilter === 'all' ? 'active' : ''}" data-filter="all">
          📋 Todos (${productosBase.length})
        </div>
      </div>
    </div>
    
    <div class="database-table-wrapper">
      <table class="database-table">
        <thead>
          <tr>
            <th>Visibilidad Catálogo</th>
            <th>Visibilidad Productos</th>
            <th>ID</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Tipo</th>
            <th>Medidas</th>
            <th>Tiempo Unit.</th>
            <th>Unidades</th>
            <th>Unid. x Placa</th>
            <th>Uso Placas</th>
            <th>Costo Placa</th>
            <th>Costo Mat.</th>
            <th>Margen %</th>
            <th>Precio Unit.</th>
            <th>Ensamble</th>
            <th>Promo Habilitada</th>
            <th>Badge</th>
            <th>Precio Promo</th>
            <th>Inicio Promo</th>
            <th>Fin Promo</th>
            <th>Tags</th>
            <th>Promociones Activas</th>
            <th>Imagen</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="databaseTableBody">
          ${productos.map(p => `
            <tr class="${p.publicado === false ? 'hidden-product' : ''}" data-id="${p.id}">
              <td style="text-align: center;">
                <label class="switch-publicado" title="${p.publicado !== false ? 'Visible en Catálogo' : 'Oculto en Catálogo'}">
                  <input type="checkbox" 
                         class="checkbox-publicado" 
                         data-id="${p.id}" 
                         ${p.publicado !== false ? 'checked' : ''}>
                  <span class="slider-publicado"></span>
                </label>
                <div style="font-size: 0.75rem; color: ${p.publicado !== false ? '#4CAF50' : '#999'}; margin-top: 4px;">
                  ${p.publicado !== false ? '👁️ Visible' : '🚫 Oculto'}
                </div>
              </td>
              <td style="text-align: center;">
                <label class="switch-hidden-productos" title="${!p.hiddenInProductos ? 'Visible en Productos' : 'Oculto en Productos'}">
                  <input type="checkbox" 
                         class="checkbox-hidden-productos" 
                         data-id="${p.id}" 
                         ${!p.hiddenInProductos ? 'checked' : ''}>
                  <span class="slider-hidden-productos"></span>
                </label>
                <div style="font-size: 0.75rem; color: ${!p.hiddenInProductos ? '#4CAF50' : '#999'}; margin-top: 4px;">
                  ${!p.hiddenInProductos ? '👁️ Visible' : '🚫 Oculto'}
                </div>
              </td>
              <td>#${p.id}</td>
              <td style="font-weight: 600;">${escapeHtml(p.nombre)}</td>
              <td>
                <input class="db-edit" type="text" value="${escapeHtml(p.categoria || 'Sin categoría')}" 
                       data-field="categoria" data-id="${p.id}">
              </td>
              <td>${p.tipo}</td>
              <td>
                <input class="db-edit" type="text" value="${escapeHtml(p.medidas || '')}" 
                       data-field="medidas" data-id="${p.id}">
              </td>
              <td>${p.tiempoUnitario || '00:00:00'}</td>
              <td>${p.unidades || 0}</td>
              <td>
                <input class="db-edit" type="number" value="${p.unidadesPorPlaca || 0}" 
                       data-field="unidadesPorPlaca" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="number" value="${p.usoPlacas || 0}" 
                       data-field="usoPlacas" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="number" value="${p.costoPlaca || 0}" 
                       data-field="costoPlaca" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="number" value="${p.costoMaterial || 0}" 
                       data-field="costoMaterial" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="number" value="${p.margenMaterial || 0}" 
                       data-field="margenMaterial" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="number" value="${p.precioUnitario || 0}" 
                       data-field="precioUnitario" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="text" value="${escapeHtml(p.ensamble || 'Sin ensamble')}" 
                       data-field="ensamble" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit db-edit-checkbox" type="checkbox" ${p.allowPromotions !== false ? 'checked' : ''}
                       data-field="allowPromotions" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="text" value="${escapeHtml(p.promoBadge || '')}" 
                       data-field="promoBadge" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="number" value="${p.staticPromoPrice || 0}" 
                       data-field="staticPromoPrice" data-id="${p.id}">
              </td>
              <td>
      <input class="db-edit" type="date" value="${formatDateForInput(p.staticPromoStart)}" 
        data-field="staticPromoStart" data-id="${p.id}">
              </td>
              <td>
      <input class="db-edit" type="date" value="${formatDateForInput(p.staticPromoEnd)}" 
        data-field="staticPromoEnd" data-id="${p.id}">
              </td>
              <td>
                <input class="db-edit" type="text" value="${escapeHtml((p.tags || []).join(', '))}" 
                       data-field="tags" data-id="${p.id}" placeholder="tag1, tag2">
              </td>
              <td>
                ${getActivePromotionsForProduct(p.id)}
              </td>
              <td>
                ${p.imagen 
                  ? `<img src="${p.imagen}" alt="foto" class="db-image" data-src="${p.imagen}">` 
                  : '<span style="color:#666;">Sin imagen</span>'}
              </td>
              <td>
                <button class="db-action-btn" data-id="${p.id}" data-action="show-delete-product">
                  🗑️ Eliminar
                </button>
                <button class="db-action-btn" data-id="${p.id}" data-action="manage-promos" 
                        style="background: #3b82f6; margin-top: 4px;">
                  🎯 Promociones
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
  
  setupDatabaseInputs();
  setupDatabaseFilters();
  setupDatabaseImages();
  setupPublicadoToggles();
  setupHiddenProductosToggles();
  setupDatabaseActions();
}

function setupDatabaseInputs() {
  const inputs = document.querySelectorAll('input.db-edit');
  
  inputs.forEach(inp => {
    inp.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      const field = e.target.dataset.field;
      let value;
      const isCheckbox = e.target.classList.contains('db-edit-checkbox');
      const type = e.target.type;
      if (isCheckbox) {
        value = e.target.checked;
      } else if (field === 'tags') {
        const raw = (e.target.value || '').trim();
        value = raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : [];
      } else if (type === 'text' || type === 'date') {
        value = (e.target.value || '').trim();
      } else {
        value = parseFloat(e.target.value) || 0;
        if (value < 0) {
          showNotification(`${field} no puede ser negativo`, 'error');
          e.target.value = 0;
          return;
        }
      }
      
      // Normalizar/validar según el tipo de input para evitar convertir
      // accidentalmente fechas a números (p. ej. '2025' al parseFloat)
      if (type === 'number') {
        value = parseFloat(e.target.value) || 0;
        if (value < 0) {
          showNotification(`${field} no puede ser negativo`, 'error');
          e.target.value = 0;
          return;
        }
      } else if (type === 'date') {
        // Mantener la cadena ISO 'YYYY-MM-DD' o cadena vacía
        value = (e.target.value || '').trim();
      } else {
        // text u otros: mantener string recortado
        if (typeof value === 'string') value = value.trim();
      }
      
      const idx = productosBase.findIndex(pp => pp.id === id);
      if (idx !== -1) {
        productosBase[idx][field] = value;
        guardarProductos();
        applyFilters();
        updateMetrics();
        renderCalendar();
        renderPedidos();
        showNotification('Campo actualizado y guardado', 'success');
      }
    });
    
    inp.addEventListener('focus', e => {
      e.target.style.borderColor = '#0984e3';
    });
    
    inp.addEventListener('blur', e => {
      e.target.style.borderColor = '#404040';
    });
  });
}

// Nueva función para manejar los toggles de "Publicado"
function setupPublicadoToggles() {
  const checkboxes = document.querySelectorAll('.checkbox-publicado');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      const isPublicado = e.target.checked;
      
      const idx = productosBase.findIndex(p => p.id === id);
      if (idx !== -1) {
        productosBase[idx].publicado = isPublicado;
        guardarProductos();
        
        // Actualizar el label visual
        const row = e.target.closest('tr');
        const labelDiv = row.querySelector('td:nth-child(1) div');
        if (labelDiv) {
          labelDiv.textContent = isPublicado ? '👁️ Visible' : '🚫 Oculto';
          labelDiv.style.color = isPublicado ? '#4CAF50' : '#999';
        }
        
        // Actualizar contador
        renderDatabase();
        
        showNotification(
          isPublicado ? 'Producto publicado en catálogo' : 'Producto oculto del catálogo', 
          'success'
        );
      }
    });
  });
}

function setupHiddenProductosToggles() {
  const checkboxes = document.querySelectorAll('.checkbox-hidden-productos');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      const isVisible = e.target.checked;  // Checked = visible (no hidden)
      
      const idx = productosBase.findIndex(p => p.id === id);
      if (idx !== -1) {
        productosBase[idx].hiddenInProductos = !isVisible;  // Inverso: hidden si no checked
        guardarProductos();
        
        // Actualizar label visual
        const row = e.target.closest('tr');
        const labelDiv = row.querySelector('td:nth-child(2) div');  // Ajusta si cambian columnas
        if (labelDiv) {
          labelDiv.textContent = isVisible ? '👁️ Visible' : '🚫 Oculto';
          labelDiv.style.color = isVisible ? '#4CAF50' : '#999';
        }
        
        // Actualizar vistas
        applyFilters();
        renderDatabase();
        showNotification(
          isVisible ? 'Producto visible en Productos' : 'Producto oculto en Productos', 
          'success'
        );
      }
    });
  });
}

function setupDatabaseFilters() {
  const searchInput = document.getElementById('dbSearch');
  const filterBadges = document.querySelectorAll('.filter-badge');
  
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      databaseSearch = e.target.value;
      renderDatabase();
    });
  }
  
  filterBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      const filter = badge.dataset.filter;
      if (filter) {
        databaseFilter = filter;
        renderDatabase();
      }
    });
  });
}

function setupDatabaseImages() {
  const images = document.querySelectorAll('.db-image');
  images.forEach(img => {
    img.addEventListener('click', () => {
      showImageModal(img.dataset.src);
    });
  });
}

function setupDatabaseActions() {
  const actionBtns = document.querySelectorAll('.db-action-btn[data-action]');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const productId = parseInt(e.target.dataset.id);
      
      if (action === 'show-delete-product') {
        showDeleteModal(productId);
      } else if (action === 'manage-promos') {
        openPromotionsManager(productId);
      }
    });
  });
}

// Nueva función para mostrar modal de eliminación
function showDeleteModal(productId) {
  const producto = productosBase.find(p => p.id === productId);
  if (!producto) return;
  
  productToDeleteId = productId;
  
  const modal = document.getElementById('deleteModal'); // Asumiendo que hay un modal HTML con id 'deleteModal' similar al toggle
  const productName = document.getElementById('deleteProductName');
  const deleteDescription = document.getElementById('deleteDescription');
  
  if (modal && productName) {
    productName.textContent = producto.nombre;
    deleteDescription.textContent = 'Esta acción eliminará permanentemente el producto de la base de datos.';
    
    modal.style.display = 'flex';
    // Forzar centrado inline (en caso de que CSS no lo haga)
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.zIndex = '1000';
  }
}

// Inicializar event listeners para el modal de eliminación
document.addEventListener('DOMContentLoaded', () => {
  const deleteModalCancel = document.getElementById('deleteModalCancel');
  const deleteModalConfirm = document.getElementById('deleteModalConfirm');

  if (deleteModalCancel) {
    deleteModalCancel.addEventListener('click', () => {
      document.getElementById('deleteModal').style.display = 'none';
      productToDeleteId = null;
    });
  }

  if (deleteModalConfirm) {
    deleteModalConfirm.addEventListener('click', () => {
      if (productToDeleteId) {
        const idx = productosBase.findIndex(p => p.id === productToDeleteId);
        if (idx !== -1) {
          productosBase.splice(idx, 1);
          guardarProductos();
          applyFilters();
          renderCalendar();
          renderDatabase();
          renderPedidos();
          showNotification('Producto eliminado permanentemente', 'success');
        }
      }
      document.getElementById('deleteModal').style.display = 'none';
      productToDeleteId = null;
    });
  }
});