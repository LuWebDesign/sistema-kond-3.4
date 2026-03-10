// Página simple de Mi Cuenta

function formatCurrency(val) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0);
}

// Obtener usuario logueado de forma robusta: primero vía API global, luego leyendo localStorage (kond_session/kond_users) y otros fallbacks
function getCurrentUserSafe() {
  try {
    if (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') {
      const u = window.KONDAuth.currentUser();
      if (u) return u;
    }
    // fallback: localStorage session used by auth.js
    const sess = JSON.parse(localStorage.getItem('kond_session') || '{}');
    const users = JSON.parse(localStorage.getItem('kond_users') || '[]');
    if (sess && sess.userId) {
      const found = (users || []).find(x => String(x.id) === String(sess.userId));
      if (found) return found;
    }
    // otros posibles keys
    const alt = JSON.parse(localStorage.getItem('user') || 'null');
    if (alt && alt.email) return alt;
    if (window.currentUser && typeof window.currentUser === 'object') return window.currentUser;
  } catch (e) {
    // ignore
  }
  return null;
}

// Parsea fechas guardadas en distintos formatos de forma segura y evitando offsets de zona horaria
function parseSafeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // timestamps numéricos (ms)
  if (!isNaN(Number(value)) && String(value).length > 8) {
    const d = new Date(Number(value));
    return isNaN(d) ? null : d;
  }
  const s = String(value).trim();
  // Detectar formato date-only ISO (YYYY-MM-DD) y construir Date local
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function searchPedidos(query) {
  let pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
  const q = String(query || '').toLowerCase().trim();
  // Si hay usuario logueado, filtrar sólo sus pedidos (por userId o userEmail)
  const user = getCurrentUserSafe();
  if (user) {
    pedidosCatalogo = pedidosCatalogo.filter(p => String(p.userId) === String(user.id) || String(p.userEmail || '').toLowerCase() === String(user.email || '').toLowerCase());
  }
  if (!q) return pedidosCatalogo.slice().reverse();

  return pedidosCatalogo.filter(p => {
    if (String(p.id).includes(q)) return true;
    if (p.cliente) {
      if (p.cliente.telefono && p.cliente.telefono.toLowerCase().includes(q)) return true;
      if (p.cliente.email && p.cliente.email.toLowerCase().includes(q)) return true;
      const name = `${p.cliente.nombre || ''} ${p.cliente.apellido || ''}`.toLowerCase();
      if (name.includes(q)) return true;
    }
    return false;
  }).reverse();
}

function initUserPage() {
  // Búsqueda removida: nos enfocamos en 'Mis compras'
  const comprasContainer = document.getElementById('misComprasContainer');
  const comprasEmpty = document.getElementById('misComprasEmpty');

  // Helpers y render de Mis compras (declarados al inicio para estar siempre disponibles)
  function badgeForEstado(estado) {
    if (!estado) return '';
    const map = { 'pendiente':'warning', 'confirmado':'info', 'en_produccion':'info', 'listo':'success', 'entregado':'success' };
    const labels = { 'pendiente':'Pendiente', 'confirmado':'Confirmado', 'en_produccion':'En producción', 'listo':'Listo para entrega', 'entregado':'Entregado' };
    const cls = map[estado] || 'info';
    const label = labels[estado] || estado;
    // Estado: mostrar en mayúsculas como ticket
    return `<span class="badge state ${cls}">${escapeHtml(String(label).toUpperCase())}</span>`;
  }

  function badgeForPago(estadoPago) {
    if (!estadoPago) return '';
    const map = { 'sin_seña':'warning', 'seña_pagada':'info', 'pagado_total':'success' };
    const labels = { 'sin_seña':'Sin seña', 'seña_pagada':'Seña pagada', 'pagado_total':'Pagado total' };
    const cls = map[estadoPago] || 'info';
    const label = labels[estadoPago] || estadoPago;
    // Pago: estilo más discreto, texto normal
    return `<span class="badge payment ${cls}">${escapeHtml(label)}</span>`;
  }

  function renderCompraCard(p) {
    const fecha = p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleString('es-AR') : '';
    const recibido = Number(p.montoRecibido || 0);
    const restante = Math.max(0, (Number(p.total || 0) - recibido));
  const fechaSol = parseSafeDate(p.fechaSolicitudEntrega) ? parseSafeDate(p.fechaSolicitudEntrega).toLocaleDateString('es-AR') : null;
  const fechaConf = parseSafeDate(p.fechaConfirmadaEntrega) ? parseSafeDate(p.fechaConfirmadaEntrega).toLocaleDateString('es-AR') : null;
    const metodo = p.metodoPago === 'whatsapp' ? 'WhatsApp' : 'Transferencia';
    const direccion = p.cliente && p.cliente.direccion ? p.cliente.direccion : '';
    // Helper para obtener imagen del producto desde productosBase
    function findProductImage(productId) {
      try {
        const prods = window.productosBase || JSON.parse(localStorage.getItem('productosBase') || '[]');
        const found = prods.find(x => String(x.id) === String(productId));
        return (found && found.imagen) ? found.imagen : null;
      } catch (e) { return null; }
    }

    const productosHtml = (p.productos || []).slice(0,5).map(pr => {
      const img = findProductImage(pr.productId) || '';
      return `
        <div class="product-item">
          <img src="${img}" alt="${escapeHtml(pr.nombre)}" class="product-img" loading="lazy" decoding="async" />
          <div class="pi-info">
            <div style="font-weight:700;">${escapeHtml(pr.nombre)}</div>
            <div style="color:#9aa3b2; font-size:0.9rem;">${pr.medidas ? escapeHtml(pr.medidas) : ''}</div>
          </div>
          <div style="text-align:right;">
            <div class="pi-qty">${pr.cantidad}x</div>
            <div>${formatCurrency(pr.subtotal)}</div>
          </div>
        </div>
      `;
    }).join('');

    const more = (p.productos && p.productos.length > 5) ? `<div style="color:#98bcd9; margin-top:8px;">+ ${p.productos.length - 5} productos</div>` : '';

    return `
      <div class="order-card" data-id="${p.id}">
        <div class="order-top">
          <div class="order-left">
            <div class="order-meta"><div><strong>#${p.id}</strong> · ${fecha}</div><div>${badgeForEstado(p.estado)}</div></div>
            <div class="meta-row">${badgeForPago(p.estadoPago)} <span>Recibido: ${formatCurrency(recibido)}</span> <span>Restante: ${formatCurrency(restante)}</span> ${fechaSol?`<span>Solicitada: ${fechaSol}</span>`:''}</div>
              <div class="product-list">${productosHtml}${more}</div>
            ${p.notas ? `<div style="margin-top:8px; color:#bfcbd8; font-size:0.9rem;">📝 ${escapeHtml(p.notas)}</div>` : ''}
          </div>
          <div class="order-right">
              <div class="order-right-meta">
                ${fechaConf ? `<div class="order-confirmed">Entrega confirmada: <strong>${fechaConf}</strong></div>` : `<div class="order-confirmed order-confirmed--empty">Entrega confirmada: <em>No confirmada</em></div>`}
                ${direccion?`<div class="order-shipping">Envío: ${escapeHtml(direccion)}</div>`:''}
              </div>
          </div>
        </div>
        <div class="order-footer">
          <div class="order-footer-inner">
            <div class="order-total-label">TOTAL</div>
            <div class="order-total-value">${formatCurrency(p.total || 0)}</div>
          </div>
        </div>
      </div>
    `;
  }

  const ITEMS_PER_PAGE = 5;
  let currentTab = 'activas';
  let activasPage = 1;
  let entregadasPage = 1;

  function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchTab(tabName);
      });
    });
  }

  function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tabContent-${tabName}`);
    });

    // Actualizar tab actual y renderizar
    currentTab = tabName;
    const page = tabName === 'activas' ? activasPage : entregadasPage;
    renderMisCompras(tabName, page);
  }

  function getUserPedidos() {
    const user = getCurrentUserSafe();
    if (!user) return { activas: [], entregadas: [] };
    let pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
    // filtrar por userId/email
    pedidosCatalogo = pedidosCatalogo.filter(p => String(p.userId) === String(user.id) || String(p.userEmail || '').toLowerCase() === String(user.email || '').toLowerCase());
    // ordenar por fecha desc
    pedidosCatalogo.sort((a,b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
    
    // Separar pedidos activos de entregados
    const activas = pedidosCatalogo.filter(p => p.estado !== 'entregado');
    const entregadas = pedidosCatalogo.filter(p => p.estado === 'entregado');
    
    return { activas, entregadas };
  }

  function renderMisCompras(tab = 'activas', page = 1, highlightPedidoId = null) {
    const user = getCurrentUserSafe();
    const pedidos = getUserPedidos();
    
    if (tab === 'activas') {
      activasPage = page;
      renderTab('activas', pedidos.activas, page, highlightPedidoId, 'misComprasContainer', 'misComprasEmpty', 'misComprasPagination', 'Aún no tenés compras pendientes.');
    } else if (tab === 'entregadas') {
      entregadasPage = page;
      renderTab('entregadas', pedidos.entregadas, page, highlightPedidoId, 'comprasEntregadasContainer', 'comprasEntregadasEmpty', 'comprasEntregadasPagination', 'Aún no tenés compras entregadas.');
    }
  }

  function renderTab(tabName, pedidosList, page, highlightPedidoId, containerId, emptyId, paginationId, emptyText) {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    
    if (!container) return;
    
    const user = getCurrentUserSafe();
    if (!user) {
      container.innerHTML = '';
      if (empty) {
        empty.style.display = '';
        empty.textContent = 'Iniciá sesión para ver tus compras.';
      }
      return;
    }
    
    if (!pedidosList.length) {
      container.innerHTML = '';
      if (empty) { 
        empty.style.display = ''; 
        empty.textContent = emptyText; 
      }
      // Limpiar paginación
      const pagEl = document.getElementById(paginationId);
      if (pagEl) { pagEl.innerHTML = ''; pagEl.style.display = 'none'; }
      return;
    }
    
    if (empty) empty.style.display = 'none';

    const totalItems = pedidosList.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    console.log(`[${tabName}] totalItems=`, totalItems, 'ITEMS_PER_PAGE=', ITEMS_PER_PAGE, 'totalPages=', totalPages);
    page = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const slice = pedidosList.slice(start, start + ITEMS_PER_PAGE);

    container.innerHTML = slice.map(p => renderCompraCard(p)).join('');
    
    // render pagination controls (solo si hay más de 1 página)
    if (totalPages > 1) {
      renderPaginationControls(page, totalPages, paginationId, tabName);
    } else {
      // ocultar/limpiar paginación si sólo hay 1 página
      const pagEl = document.getElementById(paginationId);
      if (pagEl) { pagEl.innerHTML = ''; pagEl.style.display = 'none'; }
    }
    
    // Saneamiento de imágenes: manejar errores y cortar cargas colgadas
    stabilizeProductImages(container);
    
    // colapsables
    container.querySelectorAll('.order-card').forEach(card => {
      card.classList.add('order-collapsed');
      const summary = card.querySelector('.order-meta');
      const details = card.querySelector('.order-products');
      if (details) details.classList.add('order-details');
      if (summary) summary.addEventListener('click', () => card.classList.toggle('order-collapsed'));
    });
  }

  // Adjunta manejadores a imágenes de productos para evitar pendings que dejen la pestaña en estado de carga
  function stabilizeProductImages(root){
    try {
      const imgs = Array.from((root || document).querySelectorAll('.product-item img.product-img'));
      imgs.forEach(img => {
        // Mejores hints al navegador
        img.loading = 'lazy';
        img.decoding = 'async';
        // En error: limpiar src para evitar reintentos
        img.addEventListener('error', () => {
          img.src = '';
          img.style.background = '#111';
        }, { once:true });
        // Timeout defensivo: si no terminó en 5s, la dejamos en blanco
        if (!img.complete) {
          const to = setTimeout(() => {
            if (!img.complete) {
              img.src = '';
              img.style.background = '#111';
            }
          }, 5000);
          img.addEventListener('load', () => clearTimeout(to), { once:true });
          img.addEventListener('error', () => clearTimeout(to), { once:true });
        }
      });
    } catch(e){ /* no-op */ }
  }

  // Comprobar sesión
  const user = getCurrentUserSafe();
  if (user) {
  // Mantener H1 estático en la UI: 'Mis compras' (texto definido en HTML)
    // El botón de logout global ahora está en el header (id: #globalLogoutBtn)
    // Poblar perfil en la columna izquierda
    const avatarEl = document.getElementById('userAvatar');
    const displayName = document.getElementById('userDisplayName');
    const emailDisplay = document.getElementById('userEmailDisplay');
    const profileName = document.getElementById('profileName');
    const profileApellido = document.getElementById('profileApellido');
    const profilePhone = document.getElementById('profilePhone');
  const profileProvincia = document.getElementById('profileProvincia');
  const profileLocalidad = document.getElementById('profileLocalidad');
  const profileCP = document.getElementById('profileCP');
  const profileDireccion = document.getElementById('profileDireccion');
  const profileObservaciones = document.getElementById('profileObservaciones');
    if (user.avatar) {
      if (avatarEl) avatarEl.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">`;
    } else if (avatarEl) {
      avatarEl.textContent = (user.nombre && user.nombre.charAt(0)) ? user.nombre.charAt(0).toUpperCase() : 'U';
    }
    if (displayName) displayName.textContent = user.nombre || user.email || user.telefono || 'Usuario';
    if (emailDisplay) emailDisplay.textContent = user.email || '';
    if (profileName) profileName.value = user.nombre || '';
    if (profileApellido) profileApellido.value = user.apellido || '';
    if (profilePhone) profilePhone.value = user.telefono || '';
  if (profileProvincia) profileProvincia.value = user.provincia || '';
  if (profileLocalidad) profileLocalidad.value = user.localidad || '';
  if (profileCP) profileCP.value = user.cp || '';
  if (profileDireccion) profileDireccion.value = user.direccion || '';
  if (profileObservaciones) profileObservaciones.value = user.observaciones || '';

    // Guardar perfil (sin recargar): actualiza UI en vivo
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    async function saveProfile() {
      if (!user) { alert('No hay sesión activa'); return false; }
      const btn = document.getElementById('btnSaveProfile');
      const newName = document.getElementById('profileName')?.value || '';
      const newApellido = document.getElementById('profileApellido')?.value || '';
      const newPhone = document.getElementById('profilePhone')?.value || '';
      const newProvincia = document.getElementById('profileProvincia')?.value || '';
      const newLocalidad = document.getElementById('profileLocalidad')?.value || '';
      const newCP = document.getElementById('profileCP')?.value || '';
      const newDireccion = document.getElementById('profileDireccion')?.value || '';
      const newObservaciones = document.getElementById('profileObservaciones')?.value || '';
      try {
        if (btn) btn.disabled = true;
        const maybePromise = window.KONDAuth && window.KONDAuth.updateProfile ? window.KONDAuth.updateProfile({ userId: user.id, nombre: newName, apellido: newApellido, telefono: newPhone, provincia: newProvincia, localidad: newLocalidad, cp: newCP, direccion: newDireccion, observaciones: newObservaciones }) : { ok: false, error: 'Función de guardado no disponible' };
        const res = await Promise.resolve(maybePromise);
        if (res && res.ok) {
          // Actualizar UI sin recargar
          document.getElementById('userDisplayName').textContent = newName || user.email || user.telefono || 'Usuario';
          document.getElementById('userEmailDisplay').textContent = (user.email || '');
          if (typeof showNotification === 'function') showNotification('Perfil actualizado', 'success');
          // Colapsar la tarjeta de perfil
          const profileCard = document.getElementById('profileCard');
          if (profileCard) {
            profileCard.setAttribute('aria-expanded', 'false');
            // mover foco al header para accesibilidad
            const header = profileCard.querySelector('.card-header');
            if (header) header.focus();
          }
          // Marcar inputs como estáticos (deshabilitados) y mostrar botón 'Editar'
          const inputs = Array.from(document.querySelectorAll('#profileCard input.form-input'));
          inputs.forEach(i => i.setAttribute('disabled', 'disabled'));
          const editBtn = document.getElementById('btnEditProfile');
          if (editBtn) editBtn.style.display = '';
          if (btn) btn.style.display = 'none';
          return true;
        }
        alert(res && res.error ? res.error : 'Error al guardar perfil');
        return false;
      } catch (err) {
        console.error('Error guardando perfil', err);
        alert('Error guardando perfil');
        return false;
      } finally {
        if (btn) btn.disabled = false;
      }
    }
    if (btnSaveProfile) btnSaveProfile.addEventListener('click', async (e) => { e.preventDefault(); await saveProfile(); });

    // Botón editar: habilita campos para poder editar nuevamente
    const btnEditProfile = document.getElementById('btnEditProfile');
    if (btnEditProfile) {
      btnEditProfile.addEventListener('click', (e) => {
        e.preventDefault();
        const inputs = Array.from(document.querySelectorAll('#profileCard input.form-input'));
        inputs.forEach(i => i.removeAttribute('disabled'));
        // Alternar visibilidad de botones
        btnEditProfile.style.display = 'none';
        document.getElementById('btnSaveProfile') && (document.getElementById('btnSaveProfile').style.display = '');
        // enfocar el primer input
        if (inputs.length) inputs[0].focus();
      });
    }

    // Navegación: Enter -> guardar campo y pasar al siguiente input dentro de la tarjeta
    function setupEnterNavigation(containerSelector) {
      const container = document.querySelector(containerSelector);
      if (!container) return;
      const inputs = Array.from(container.querySelectorAll('input.form-input'));
      inputs.forEach((input, idx) => {
        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            // Simple validación mínima: si input es required o tiene placeholder 'Actual' para password no avanzar vacio
            // Guardar inmediatamente si es campo de perfil
            if (containerSelector === '#profileCard') {
              // small debounce to ensure value set
              const ok = await saveProfile();
              // Mover foco al siguiente input o al primer botón
              const next = inputs[idx + 1];
              if (next) next.focus();
              else {
                // si no hay siguiente, enfocar botón guardar
                document.getElementById('btnSaveProfile')?.focus();
              }
            } else {
              // Para seguridad, si estamos en change password, hacer click en botón si último
              const next = inputs[idx + 1];
              if (next) next.focus();
              else {
                document.getElementById('btnChangePassword')?.click();
              }
            }
          }
        });
      });
    }
    // Inicializar navegación por Enter en perfil y seguridad
    setupEnterNavigation('#profileCard');
    setupEnterNavigation('#securityCard');

    // Primer render - soportar ?pedido=ID para abrir la página correcta
    try {
      const params = new URLSearchParams(window.location.search || '');
      const pedidoId = params.get('pedido');
      const pedidos = getUserPedidos();
      let pageToShow = 1;
      if (pedidoId) {
        const idx = pedidos.findIndex(p => String(p.id) === String(pedidoId));
        if (idx !== -1) pageToShow = Math.floor(idx / ITEMS_PER_PAGE) + 1;
      }
      renderMisCompras(pageToShow, pedidoId);
      // Si pedId estaba presente, resaltar tras render
      if (pedidoId) {
        setTimeout(() => {
          const card = comprasContainer.querySelector(`.order-card[data-id="${pedidoId}"]`);
          if (card) {
            card.classList.remove('order-collapsed');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 6px 24px rgba(0,0,0,0.6)';
            setTimeout(() => { card.style.boxShadow = ''; }, 2200);
          }
        }, 250);
      }
    } catch (e) { renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage); }

  // Renderizado y control de paginación
  function renderPaginationControls(currentPage, totalPages, paginationId = 'misComprasPagination', tabName = 'activas') {
    console.log(`[${tabName}] renderPaginationControls currentPage=`, currentPage, 'totalPages=', totalPages);
    let pag = document.getElementById(paginationId);
    if (!pag) {
      pag = document.createElement('div');
      pag.id = paginationId;
      pag.style.display = 'flex';
      pag.style.gap = '8px';
      pag.style.justifyContent = 'center';
      pag.style.marginTop = '12px';
      
      // Insertar después del contenedor correspondiente
      const container = tabName === 'activas' 
        ? document.getElementById('misComprasContainer')
        : document.getElementById('comprasEntregadasContainer');
      if (container && container.parentNode) {
        container.parentNode.insertBefore(pag, container.nextSibling);
      }
    }
    // asegurarnos de que el contenedor esté visible
    pag.style.display = 'flex';
    // construir botones
    const parts = [];
    parts.push(`<button class="pag-btn" data-page="${Math.max(1,currentPage-1)}" ${currentPage===1? 'disabled' : ''}>← Anterior</button>`);
    for (let i=1;i<=totalPages;i++) {
      parts.push(`<button class="pag-btn" data-page="${i}" ${i===currentPage? 'aria-current="true"' : ''}>${i}</button>`);
    }
    parts.push(`<button class="pag-btn" data-page="${Math.min(totalPages,currentPage+1)}" ${currentPage===totalPages? 'disabled' : ''}>Siguiente →</button>`);
    pag.innerHTML = parts.join('');
    // listeners
    pag.querySelectorAll('.pag-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        const p = Number(e.currentTarget.dataset.page || 1);
        renderMisCompras(tabName, p);
      });
    });
  }

    // Avatar upload / change / remove
    const avatarInput = document.getElementById('profileAvatarInput');
    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    const btnRemoveAvatar = document.getElementById('btnRemoveAvatar');
    if (btnChangeAvatar && avatarInput) {
      btnChangeAvatar.addEventListener('click', (e) => { e.preventDefault(); avatarInput.click(); });
    }
    if (btnRemoveAvatar) {
      btnRemoveAvatar.addEventListener('click', () => {
        if (!confirm('¿Eliminar la foto de perfil?')) return;
        const res = window.KONDAuth.updateProfile({ userId: user.id, avatar: '' });
        if (res && res.ok) {
          if (avatarEl) avatarEl.textContent = (user.nombre && user.nombre.charAt(0)) ? user.nombre.charAt(0).toUpperCase() : 'U';
          if (typeof showNotification === 'function') showNotification('Foto eliminada', 'success');
        } else {
          alert(res && res.error ? res.error : 'No se pudo eliminar la foto');
        }
      });
    }
    if (avatarInput) {
      async function fileToResizedDataURL(file, maxDim = 256, quality = 0.85) {
        return new Promise((resolve, reject) => {
          try {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                try {
                  const maxSide = Math.max(img.width, img.height);
                  const scale = maxSide > maxDim ? (maxDim / maxSide) : 1;
                  const w = Math.max(1, Math.round(img.width * scale));
                  const h = Math.max(1, Math.round(img.height * scale));
                  const canvas = document.createElement('canvas');
                  canvas.width = w; canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, w, h);
                  const dataUrl = canvas.toDataURL('image/jpeg', quality);
                  resolve(dataUrl);
                } catch (err) { reject(err); }
              };
              img.onerror = reject;
              img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          } catch (err) { reject(err); }
        });
      }
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          // Intentar reducir tamaño para evitar sobrepasar límites de localStorage y mejorar carga
          let dataUrl;
          try { dataUrl = await fileToResizedDataURL(file, 256, 0.85); }
          catch { dataUrl = await fileToBase64(file); }
          const res = window.KONDAuth.updateProfile({ userId: user.id, avatar: dataUrl });
          if (res.ok) {
            if (avatarEl) avatarEl.innerHTML = `<img src="${dataUrl}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">`;
            if (typeof showNotification === 'function') showNotification('Avatar actualizado', 'success');
          }
        } catch (err) { alert('No se pudo procesar la imagen'); }
      });
    }

    // Cambiar contraseña
    const btnChangePassword = document.getElementById('btnChangePassword');
    if (btnChangePassword) btnChangePassword.addEventListener('click', () => {
      const current = document.getElementById('currentPassword')?.value || '';
      const neu = document.getElementById('newPassword')?.value || '';
      if (!current || !neu) { alert('Completa ambos campos'); return; }
      const res = window.KONDAuth.changePassword({ userId: user.id, currentPassword: current, newPassword: neu });
      if (!res.ok) { alert(res.error || 'No se pudo cambiar'); return; }
      if (typeof showNotification === 'function') showNotification('Contraseña actualizada', 'success');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
    });

    // Card collapse/expand
    document.querySelectorAll('.card .card-header').forEach(header => {
      const card = header.parentElement;
      header.addEventListener('click', () => {
        const expanded = card.getAttribute('aria-expanded') === 'true';
        card.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
      header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); } });
    });
  }

  // Se elimina doSearch y la UI asociada

  // Se elimina búsqueda global y reclamar desde aquí para simplificar UI

  // Listen for storage changes (admin updating pedidos) to refresh list automatically
  window.addEventListener('storage', (e) => {
    if (e.key === 'pedidosCatalogo' || e.key === 'pedidos') {
      const q = document.getElementById('userQuery')?.value || '';
      const resultsEl = document.getElementById('userResults');
      if (resultsEl) {
        // Re-run search to refresh display
        const ev = new Event('input');
        const inputEl = document.getElementById('userQuery');
        if (inputEl) inputEl.dispatchEvent(ev);
      }
      // refrescar mis compras también
      renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage);
    }
  });

  // Además escuchar una clave auxiliar para forzar actualizaciones en navegadores que no envían storage event en la misma pestaña
  window.addEventListener('storage', (e) => {
    if (e.key === 'pedidosCatalogo_updated') {
      renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage);
    }
  });

  // Escuchar evento custom disparado en la misma ventana por la UI administrativa
  window.addEventListener('pedidosCatalogo:updated', (ev) => {
    try {
      // opcional: usar ev.detail.pedidoId para optimizaciones futuras
      renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage);
    } catch (err) { /* no-op */ }
  });

  // Polling fallback: check every 3s if pedidosCatalogo changed in same-tab edits
  let _lastPedidosSnapshot = JSON.stringify(JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]'));
  setInterval(() => {
    try {
      const cur = JSON.stringify(JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]'));
      if (cur !== _lastPedidosSnapshot) {
        _lastPedidosSnapshot = cur;
        const inputEl = document.getElementById('userQuery');
        if (inputEl) inputEl.dispatchEvent(new Event('input'));
        // refrescar mis compras
        renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage);
      }
    } catch (err) { /* ignore parse errors */ }
  }, 3000);

  // Configurar tabs
  setupTabs();

  // Manejar URL params (para resaltar pedido específico)
  const urlParams = new URLSearchParams(window.location.search || '');
  const pedidoId = urlParams.get('pedido');
  if (pedidoId) {
    // Determinar en qué tab está el pedido
    const pedidos = getUserPedidos();
    const enActivas = pedidos.activas.find(p => String(p.id) === String(pedidoId));
    const enEntregadas = pedidos.entregadas.find(p => String(p.id) === String(pedidoId));
    
    if (enEntregadas) {
      // Cambiar a tab entregadas
      switchTab('entregadas');
      const idx = pedidos.entregadas.findIndex(p => String(p.id) === String(pedidoId));
      if (idx !== -1) {
        const pageToShow = Math.floor(idx / ITEMS_PER_PAGE) + 1;
        renderMisCompras('entregadas', pageToShow, pedidoId);
      }
    } else if (enActivas) {
      // Permanecer en activas
      const idx = pedidos.activas.findIndex(p => String(p.id) === String(pedidoId));
      if (idx !== -1) {
        const pageToShow = Math.floor(idx / ITEMS_PER_PAGE) + 1;
        renderMisCompras('activas', pageToShow, pedidoId);
      }
    } else {
      renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage);
    }
  } else {
    // Ya no hay búsqueda; sólo render de Mis compras al cargar
    renderMisCompras(currentTab, currentTab === 'activas' ? activasPage : entregadasPage);
  }

  // Panel debug eliminado
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUserPage);
else initUserPage();
