/***********************
 * Utilidades
 ***********************/
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(value || 0);
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  return hours * 60 + minutes + seconds / 60;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.floor((totalMinutes % 1) * 60);
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function validateTimeFormat(timeStr) {
  const timeRegex = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
  return timeRegex.test(timeStr);
}

function showNotification(message, type = 'success') {
  const n = document.getElementById('notification');
  n.textContent = message;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3000);
}

function guardarProductos() {
  localStorage.setItem('productosBase', JSON.stringify(productosBase));
  localStorage.setItem('pedidos', JSON.stringify(pedidos));
  // Actualizar badges de pestañas si la función está disponible
  if (typeof updateTabBadges === 'function') {
    try { updateTabBadges(); } catch (e) { console.error('updateTabBadges error', e); }
  }
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// Notificaciones: helper para agregar notificaciones al localStorage
function addNotification({ title, body, date, read = false, meta = {} } = {}) {
  try {
    const key = 'notifications';
    const raw = localStorage.getItem(key) || '[]';
    const list = JSON.parse(raw);
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item = { id, title: title || 'Notificación', body: body || '', date: date || (new Date()).toISOString().slice(0,10), read: !!read, meta };
    list.unshift(item);
    // Limitar tamaño para evitar crecer indefinidamente
    const max = 300;
    localStorage.setItem(key, JSON.stringify(list.slice(0, max)));
    // marker y evento para forzar update en otras pestañas y en la misma pestaña
    try { localStorage.setItem('notifications_updated', new Date().toISOString()); } catch(e){}
    try { window.dispatchEvent(new CustomEvent('notifications:updated', { detail: { id: item.id } })); } catch(e){}
    return item;
  } catch (err) {
    console.error('addNotification error', err);
    return null;
  }
}

function trimNotifications(max = 300) {
  try {
    const key = 'notifications';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(list) && list.length > max) {
      localStorage.setItem(key, JSON.stringify(list.slice(0, max)));
    }
  } catch (e) { /* no-op */ }
}

// Helper: intentar guardar en localStorage de forma segura.
// Si falla por cuota (QuotaExceededError) y el objeto contiene un campo `comprobante`,
// puede opcionalmente omitirlo (establecer `_comprobanteOmitted = true`) y reintentar.
function safeLocalStorageSetItem(key, valueObj, options = { omitComprobanteOnQuota: false }) {
  try {
    localStorage.setItem(key, JSON.stringify(valueObj));
    return { success: true };
  } catch (err) {
    // Detectar QuotaExceeded de forma aproximada
    const isQuota = err && (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    console.warn(`safeLocalStorageSetItem: setItem failed for key=${key}`, err);
    if (!isQuota) return { success: false, error: err };

    // Si el caller pidió omitir comprobante, intentamos clonar y borrar comprobante
    if (options.omitComprobanteOnQuota) {
      try {
        // Hacer clon profundo razonable
        const clone = JSON.parse(JSON.stringify(valueObj));
        // Si es un array de pedidos, operar sobre cada pedido que tenga comprobante
        if (Array.isArray(clone)) {
          clone.forEach(item => {
            if (item && item.comprobante) {
              item._comprobanteOmitted = true;
              item.comprobante = null;
            }
          });
        } else if (clone && clone.comprobante) {
          clone._comprobanteOmitted = true;
          clone.comprobante = null;
        }

        try {
          localStorage.setItem(key, JSON.stringify(clone));
          return { success: true, omittedComprobante: true };
        } catch (err2) {
          console.error('safeLocalStorageSetItem: reintento sin comprobante falló', err2);
          return { success: false, error: err2 };
        }
      } catch (e) {
        console.error('safeLocalStorageSetItem: no se pudo clonar objeto para reintento', e);
        return { success: false, error: e };
      }
    }

    return { success: false, error: err };
  }
}

// Conveniencia: guardar pedidosCatalogo usando safeLocalStorageSetItem con omitComprobanteOnQuota=true
function savePedidosCatalogoSafely(pedidosCatalogo) {
  return safeLocalStorageSetItem('pedidosCatalogo', pedidosCatalogo, { omitComprobanteOnQuota: true });
}