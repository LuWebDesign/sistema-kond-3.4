function setupTopbarNavigation() {
  const navItems = document.querySelectorAll('.nav .nav-item');
  const sections = document.querySelectorAll('main .section');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const sec = item.dataset.section;
      sections.forEach(s => {
        s.hidden = s.id !== sec + '-section';
      });
      
      // Llamadas específicas por sección
      if (sec === 'metricas') updateMetrics();
      if (sec === 'calendario') renderCalendar();
      if (sec === 'base-datos') renderDatabase();
      if (sec === 'pedidos') renderPedidos();
      if (sec === 'catalogo') {
        if (typeof initCatalog === 'function') {
          setTimeout(initCatalog, 0);
        }
      }
    });
  });
}

function setupFormEnterNavigation() {
  const formFields = [
    'newNombre',          // tabindex 1
    'newTipo',           // tabindex 2
    'newMedidas',        // tabindex 3
    'newTiempoUnitario', // tabindex 4
    'newUnidades',       // tabindex 5
    'newUnidadesPorPlaca', // tabindex 6
    'newUsoPlacas',      // tabindex 7
    'newEnsamble',       // tabindex 8
    'newCostoPlaca',     // tabindex 9
    'newCostoMaterial',  // tabindex 10
    'newMargenMaterial', // tabindex 11
    'newPrecioUnitario', // tabindex 12
    'newImagen',         // tabindex 13
    'newCategoriaSelect', // tabindex 14
    'newCategoriaCustom', // tabindex 15 (será visible solo cuando se seleccione "custom")
    'clearBtn',          // tabindex 14
    'addBtn'             // tabindex 15
  ];

  formFields.forEach((id, index) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        
        // Si es uno de los botones, ejecutarlo
        if (id === 'addBtn' || id === 'clearBtn') {
          element.click();
          return;
        }
        
        // Caso especial: si es el select de categoría y se selecciona "custom",
        // ir directamente al input personalizado
        if (id === 'newCategoriaSelect' && element.value === 'custom') {
          const customInput = document.getElementById('newCategoriaCustom');
          if (customInput && customInput.offsetParent !== null) {
            setTimeout(() => {
              customInput.focus();
              customInput.select();
            }, 100); // Delay para que se muestre primero el campo
            return;
          }
        }
        
        // Buscar el siguiente elemento visible y habilitado
        let nextIndex = index + 1;
        while (nextIndex < formFields.length) {
          const nextElement = document.getElementById(formFields[nextIndex]);
          
          // Verificar si el elemento existe, es visible, no está deshabilitado y no es readonly
          if (nextElement && 
              !nextElement.readOnly && 
              !nextElement.disabled &&
              nextElement.offsetParent !== null) { // elemento visible
            
            // Saltar el campo de categoría personalizada si no está visible
            if (formFields[nextIndex] === 'newCategoriaCustom' && 
                nextElement.style.display === 'none') {
              nextIndex++;
              continue;
            }
            
            setTimeout(() => {
              nextElement.focus();
              // Seleccionar texto en inputs de texto y número
              if (nextElement.tagName === 'INPUT' && 
                  (nextElement.type === 'text' || nextElement.type === 'number')) {
                nextElement.select();
              }
            }, 0);
            break;
          }
          nextIndex++;
        }
      }
    });
  });
}

// Función para enfocar automáticamente el primer campo al abrir el formulario
function focusFirstFormField() {
  const firstField = document.getElementById('newNombre');
  if (firstField) {
    setTimeout(() => {
      firstField.focus();
      firstField.select();
    }, 100);
  }
}

// --------------------
// Notificaciones
// --------------------
function renderNotificationsPanel() {
  const panel = document.getElementById('notificationsPanel');
  if (!panel) return;
  try {
    const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
    if (!stored || !stored.length) {
      panel.innerHTML = '<div class="notifications-empty">No hay notificaciones</div>';
      renderNotificationsBadge();
      return;
    }

    // Determinar contexto de página
    const isAdminPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
    const isUserPage = window.location.pathname.includes('user.html');
    const isCatalogPage = window.location.pathname.includes('catalog.html');

    // Construir HTML con acciones (eliminar) - mejorado según contexto
    panel.innerHTML = stored.slice(0,20).map(n => {
      // Determinar icono según el tipo de notificación
      let icon = '🔔';
      let ctaButton = '';
      
      if (n.meta) {
        switch (n.meta.tipo) {
          case 'carrito':
            icon = '🛒';
            // Notificaciones de carrito solo en páginas de usuario/catálogo
            if (isAdminPage) {
              return null; // No mostrar notificaciones de carrito en admin
            }
            if (isCatalogPage) {
              ctaButton = '<button class="ni-btn ni-btn-secondary" onclick="showCartModal()">Ver carrito</button>';
            } else {
              ctaButton = '<a href="catalog.html#cart" class="ni-btn ni-btn-secondary">Ver carrito</a>';
            }
            break;
          case 'pedido_nuevo':
          case 'pedido_entregado':
          case 'pedido_asignado':
            icon = '📦';
            if (n.meta.pedidoId) {
              if (isAdminPage) {
                // En admin: abrir modal de detalles del pedido
                ctaButton = `<button class="ni-btn ni-btn-primary" onclick="mostrarDetallePedido(${n.meta.pedidoId})">Ver pedido</button>`;
              } else {
                // En páginas de usuario: ir a "Mis compras"
                ctaButton = `<a href="user.html?pedido=${encodeURIComponent(n.meta.pedidoId)}" class="ni-btn ni-btn-primary">Ver en Mis compras</a>`;
              }
            }
            break;
          case 'financiero':
          case 'ingreso':
          case 'egreso':
          case 'gasto':
            icon = '💰';
            // Notificaciones financieras solo para admin
            if (!isAdminPage) {
              return null; // No mostrar notificaciones financieras a usuarios
            }
            ctaButton = '<button class="ni-btn ni-btn-secondary" onclick="(function(){ const btn = document.querySelector(\'.side-link[data-section=&quot;finanzas&quot;]\'); if(btn) btn.click(); })()">Ver finanzas</button>';
            break;
          default:
            icon = '🔔';
        }
      }
      
      // Si no hay botón específico pero hay pedidoId, usar el enlace según contexto
      if (!ctaButton && n.meta && n.meta.pedidoId) {
        if (isAdminPage) {
          ctaButton = `<button class="ni-btn ni-btn-primary" onclick="mostrarDetallePedido(${n.meta.pedidoId})">Ver pedido</button>`;
        } else {
          ctaButton = `<a href="user.html?pedido=${encodeURIComponent(n.meta.pedidoId)}" class="ni-btn ni-btn-primary">Ver pedido</a>`;
        }
      }
      
      const tipo = n.meta && n.meta.tipo ? escapeHtml(String(n.meta.tipo)) : '';
      const cliente = n.meta && n.meta.clienteName ? escapeHtml(String(n.meta.clienteName)) : '';
      const badges = [];
      if (tipo) {
        // Traducir tipos a nombres más amigables
        const tipoDisplay = {
          'carrito': 'Carrito',
          'pedido_nuevo': 'Nuevo pedido', 
          'pedido_entregado': 'Entregado',
          'pedido_asignado': 'Programado',
          'financiero': 'Finanzas'
        }[tipo] || tipo;
        badges.push(`<span class="ni-badge">${tipoDisplay}</span>`);
      }
      if (cliente) badges.push(`<span class="ni-badge">${cliente}</span>`);
      
      // Mostrar información adicional según el tipo
      let extraInfo = '';
      if (n.meta && n.meta.tipo === 'carrito' && n.meta.cartItems) {
        extraInfo = `<div class="ni-extra">Items en carrito: ${n.meta.cartItems}</div>`;
      }
      if (n.meta && n.meta.pedidoId && n.meta.tipo !== 'carrito') {
        extraInfo = `<div class="ni-extra">Pedido #${n.meta.pedidoId}</div>`;
      }
      
      const badgesHtml = badges.length ? `<div class="ni-badges">${badges.join('')}</div>` : '';
      // Truncar el body a 140 chars para dar espacio a extraInfo
      const bodyText = String(n.body || '');
      const shortBody = bodyText.length > 140 ? escapeHtml(bodyText.slice(0,137)) + '...' : escapeHtml(bodyText);
      
      return `
      <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
        <div class="ni-header">
          <div class="ni-icon">${icon}</div>
          <div class="ni-head-text">
            <div class="ni-title">${escapeHtml(n.title || 'Notificación')}</div>
            <div class="ni-meta">${n.date || ''}</div>
          </div>
        </div>
        <div class="ni-body">${shortBody}</div>
        ${extraInfo}
        ${badgesHtml}
        <div class="ni-cta">
          ${ctaButton}
          <button class="ni-delete" data-id="${n.id}" title="Eliminar">×</button>
        </div>
      </div>
    `;
    }).filter(Boolean).join(''); // Filtrar elementos nulos (notificaciones de carrito en admin)

    // Usar delegación de eventos en el panel para evitar acumulación de listeners
    setupNotificationsPanelDelegation();
  } catch (e) {
    panel.innerHTML = '<div class="notifications-empty">No hay notificaciones</div>';
  }
}

// Helpers para manipular notificaciones en localStorage
function getNotifications() {
  try { return JSON.parse(localStorage.getItem('notifications') || '[]'); } catch(e) { return []; }
}
function saveNotifications(list) {
  try { localStorage.setItem('notifications', JSON.stringify(list || [])); localStorage.setItem('notifications_updated', new Date().toISOString()); } catch(e) { console.warn('saveNotifications error', e); }
}
function deleteNotificationById(id) {
  const list = getNotifications().filter(n => String(n.id) !== String(id));
  saveNotifications(list);
}
function markNotificationRead(id, read = true) {
  const list = getNotifications().map(n => (String(n.id) === String(id) ? { ...n, read: !!read } : n));
  saveNotifications(list);
}

function setupNotificationsPanelDelegation() {
  const panel = document.getElementById('notificationsPanel');
  if (!panel) return;

  // Remover listener previo si existe
  panel.removeEventListener('click', handlePanelClick);
  
  // Añadir listener de delegación
  panel.addEventListener('click', handlePanelClick);
}

function handlePanelClick(ev) {
  ev.stopPropagation();
  
  // Manejar botón eliminar
  if (ev.target.classList.contains('ni-delete')) {
    const id = ev.target.dataset.id;
    if (id) {
      deleteNotificationById(id);
      renderNotificationsPanel();
      renderNotificationsBadge();
    }
    return;
  }
  
  // Manejar click en tarjeta para marcar como leída
  const card = ev.target.closest('.notification-item');
  if (card && !ev.target.closest('.ni-cta')) {
    const id = card.dataset.id;
    if (id) {
      markNotificationRead(id, true);
      card.classList.remove('unread');
      card.classList.add('read');
      renderNotificationsBadge();
    }
  }
}

function renderNotificationsBadge() {
  const btn = document.getElementById('btnNotifications');
  if (!btn) return;
  const list = getNotifications();
  const unread = (list || []).filter(n => !n.read).length;
  // buscar o crear elemento badge
  let badge = btn.querySelector('.notifications-count');
  if (!badge && unread > 0) {
    badge = document.createElement('span');
    badge.className = 'notifications-count';
    btn.appendChild(badge);
  }
  if (badge) {
    if (unread > 0) {
      badge.textContent = String(unread > 99 ? '99+' : unread);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function setupNotificationsToggle() {
  const btn = document.getElementById('btnNotifications');
  const panel = document.getElementById('notificationsPanel');
  if (!btn || !panel) return;

  // Remover listeners previos si existen
  btn.removeEventListener('click', handleNotificationToggle);
  document.removeEventListener('click', handleOutsideClick);

  // Añadir listeners frescos
  btn.addEventListener('click', handleNotificationToggle);
  document.addEventListener('click', handleOutsideClick);
}

function handleNotificationToggle(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const btn = document.getElementById('btnNotifications');
  const panel = document.getElementById('notificationsPanel');
  if (!btn || !panel) return;

  const expanded = btn.getAttribute('aria-expanded') === 'true';
  if (expanded) {
    closeNotificationsPanel();
  } else {
    openNotificationsPanel({ markRead: true });
  }
}

function handleOutsideClick(ev) {
  const btn = document.getElementById('btnNotifications');
  const panel = document.getElementById('notificationsPanel');
  if (!panel || !btn) return;
  
  // Si el click es dentro del panel o del botón, no cerrar
  if (panel.contains(ev.target) || btn.contains(ev.target)) return;
  
  closeNotificationsPanel();
}

function closeNotificationsPanel() {
  const btn = document.getElementById('btnNotifications');
  const panel = document.getElementById('notificationsPanel');
  if (!btn || !panel) return;

  panel.style.display = 'none';
  panel.setAttribute('aria-hidden', 'true');
  btn.setAttribute('aria-expanded', 'false');
}

// Abrir panel de notificaciones de forma reutilizable
function openNotificationsPanel({ markRead = false } = {}) {
  const btn = document.getElementById('btnNotifications');
  const panel = document.getElementById('notificationsPanel');
  if (!btn || !panel) return;
  // Si solicitamos marcar como leídas, actualizar el almacenamiento primero
  if (markRead) {
    try {
      const list = getNotifications();
      const updated = (list || []).map(n => ({ ...n, read: true }));
      saveNotifications(updated);
    } catch (e) { console.warn('openNotificationsPanel markRead error', e); }
  }
  renderNotificationsPanel();
  // Posicionar panel respecto al botón (alineado a la derecha del botón)
  try {
    const rect = btn.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 340;
    // Calculamos left para que el panel quede alineado a la derecha del botón
    let left = rect.right - panelWidth;
    // Si left es negativo o sobresale, ajustar
    if (left < 8) left = 8;
    panel.style.left = left + 'px';
    // Ajustar top un poco debajo del botón
    panel.style.top = (rect.bottom + 8) + 'px';
  } catch (e) { /* ignore positioning errors */ }
  panel.style.display = 'block';
  panel.setAttribute('aria-hidden', 'false');
  btn.setAttribute('aria-expanded', 'true');
  if (markRead) {
    try { localStorage.setItem('notificationsLastRead', new Date().toISOString()); } catch(e){}
    try { renderNotificationsBadge(); } catch(e){}
  }
  // emitir marker para otras pestas (para sincronizar UI)
  try { localStorage.setItem('notifications_updated', new Date().toISOString()); } catch(e){}
}

// Variables para evitar listeners duplicados
let notificationsEventListenersSetup = false;

function setupNotificationsEventListeners() {
  if (notificationsEventListenersSetup) return;
  notificationsEventListenersSetup = true;

  // Escuchar custom event para abrir panel automáticamente en la misma pestaña
  window.addEventListener('notifications:updated', (ev) => {
    try {
      // solo renderizar badge, no abrir automáticamente el panel
      renderNotificationsBadge();
    } catch (e) { console.warn('notifications:updated handler error', e); }
  });

  // Escuchar storage para cross-tab
  window.addEventListener('storage', (ev) => {
    try {
      if (!ev) return;
      if (ev.key === 'notifications_updated') {
        // nueva notificación desde otra pestaña -> solo actualizar badge
        renderNotificationsBadge();
      }
    } catch (e) { console.warn('storage event handler error', e); }
  });
}

// Inicializar notifs al cargar navegación
document.addEventListener('DOMContentLoaded', () => {
  setupNotificationsToggle();
  setupNotificationsEventListeners();
  // renderizar badge al inicio
  try { renderNotificationsBadge(); } catch (e) { /* no-op */ }
  // asegurar panel cerrado inicialmente
  try { 
    const panel = document.getElementById('notificationsPanel'); 
    const btn = document.getElementById('btnNotifications');
    if (panel) { 
      panel.style.display = 'none'; 
      panel.setAttribute('aria-hidden','true'); 
    }
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
    }
  } catch(e){}
});