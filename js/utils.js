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

// Normalizar/asegurar que el valor recibido sea un Array.
// - Si ya es Array -> se devuelve tal cual
// - Si es null/undefined -> []
// - Si es string -> intenta parsear JSON y devolver array si corresponde
// - Si es objeto -> devuelve Object.values(obj)
function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
      return [];
    } catch (e) {
      return [];
    }
  }
  if (typeof v === 'object') {
    try { return Object.values(v); } catch (e) { return []; }
  }
  return [];
}
// Exponer globalmente para uso en scripts que cargan después
window.ensureArray = ensureArray;

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

// ============================================
// HELPERS DE INICIALIZACION
// ============================================

/**
 * Ejecuta funciones globales de forma segura.
 * Verifica que existan antes de llamarlas y captura errores.
 * @param {string[]} funcNames - Array con nombres de funciones a ejecutar
 */
function safeCallFunctions(funcNames = []) {
  funcNames.forEach(name => {
    try {
      if (typeof window[name] === 'function') {
        window[name]();
      }
    } catch (e) {
      console.warn(`Error ejecutando función '${name}':`, e);
    }
  });
}

// ============================================
// SOPORTE DUAL: LOCALSTORAGE Y SUPABASE
// ============================================

// Detectar si Supabase está habilitado
function isSupabaseEnabled() {
  // Verificar si existe el módulo y la configuración
  if (typeof window !== 'undefined' && window.KOND_USE_SUPABASE === true) {
    return true;
  }
  // También verificar variable de entorno si está disponible
  try {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USE_SUPABASE === 'true') {
      return true;
    }
  } catch (e) {
    // No disponible en browser
  }
  return false;
}

/**
 * Wrapper universal: guardar productos
 * Detecta automáticamente si usar localStorage o Supabase
 */
async function saveProductos(productos) {
  if (isSupabaseEnabled() && window.supabaseClient) {
    // Modo Supabase
    try {
      // Convertir productos a formato Supabase y upsert
      const { error } = await window.supabaseClient
        .from('productos')
        .upsert(productos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          tipo: p.tipo || 'Venta',
          medidas: p.medidas,
          tiempo_unitario: p.tiempoUnitario,
          unidades: p.unidades,
          precio_unitario: p.precioUnitario,
          publicado: p.publicado,
          // ... mapear todos los campos
        })));
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error guardando en Supabase:', error);
      // Fallback a localStorage
      localStorage.setItem('productosBase', JSON.stringify(productos));
      return { success: true, usedFallback: true };
    }
  } else {
    // Modo localStorage (legacy)
    localStorage.setItem('productosBase', JSON.stringify(productos));
    return { success: true };
  }
}

/**
 * Wrapper universal: cargar productos
 */
async function loadProductos() {
  if (isSupabaseEnabled() && window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient
        .from('productos')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      // Convertir de formato Supabase a formato app
      return data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        tipo: p.tipo,
        medidas: p.medidas,
        tiempoUnitario: p.tiempo_unitario,
        unidades: p.unidades,
        precioUnitario: p.precio_unitario,
        publicado: p.publicado,
        // ... mapear todos los campos
      }));
    } catch (error) {
      console.error('Error cargando desde Supabase:', error);
      // Fallback a localStorage
      return JSON.parse(localStorage.getItem('productosBase') || '[]');
    }
  } else {
    // Modo localStorage
    return JSON.parse(localStorage.getItem('productosBase') || '[]');
  }
}

/**
 * Wrapper: guardar pedido de catálogo con comprobante en Storage
 */
async function savePedidoCatalogo(pedido, comprobanteFile = null) {
  if (isSupabaseEnabled() && window.supabaseClient) {
    try {
      let comprobanteUrl = null;
      
      // Subir comprobante a Storage si existe
      if (comprobanteFile && window.uploadFileToSupabase) {
        const { url, error } = await window.uploadFileToSupabase(
          comprobanteFile,
          'comprobantes',
          `pedido-${pedido.id}-${Date.now()}.jpg`
        );
        if (!error) comprobanteUrl = url;
      }
      
      // Guardar pedido en base de datos
      const { error } = await window.supabaseClient
        .from('pedidos_catalogo')
        .insert({
          id: pedido.id,
          cliente_nombre: pedido.cliente.nombre,
          cliente_telefono: pedido.cliente.telefono,
          productos: pedido.items,
          total: pedido.total,
          metodo_pago: pedido.metodoPago,
          comprobante_url: comprobanteUrl
        });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error guardando pedido en Supabase:', error);
      // Fallback a localStorage
      const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
      pedidos.push(pedido);
      return savePedidosCatalogoSafely(pedidos);
    }
  } else {
    // Modo localStorage
    const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
    pedidos.push(pedido);
    return savePedidosCatalogoSafely(pedidos);
  }
}

// Nota: estas funciones están preparadas para modo dual
// Para activar Supabase, configurar window.KOND_USE_SUPABASE = true
// y cargar el cliente desde supabase/client.js

// ============================================
// MODALES DE CONFIRMACIÓN Y ALERTA
// ============================================

/**
 * Reemplaza confirm() nativo con un modal estilizado.
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje o pregunta
 * @param {Function} onConfirm - Callback si el usuario confirma
 */
function showCustomConfirm(title, message, onConfirm) {
  const existing = document.getElementById('_customConfirmOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = '_customConfirmOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#1e2229;border:1px solid #444;border-radius:10px;padding:24px 28px;max-width:420px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.6);">
      <h3 style="margin:0 0 10px;color:#e0e0e0;font-size:1.05rem;font-weight:700;">${escapeHtml(title)}</h3>
      <p style="margin:0 0 22px;color:#9aa3b2;font-size:0.95rem;line-height:1.55;">${escapeHtml(message)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="_confirmCancel" class="btn-secondary" style="min-width:90px;">Cancelar</button>
        <button id="_confirmOk" class="btn-primary" style="min-width:90px;background:#c62828;border-color:#c62828;">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#_confirmCancel').addEventListener('click', close);
  overlay.querySelector('#_confirmOk').addEventListener('click', () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  setTimeout(() => overlay.querySelector('#_confirmOk')?.focus(), 50);
}

/**
 * Reemplaza alert() nativo con un modal estilizado.
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {Function} [onClose] - Callback al cerrar
 */
function showCustomAlert(title, message, type = 'info', onClose) {
  const existing = document.getElementById('_customAlertOverlay');
  if (existing) existing.remove();

  const iconMap = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const icon = iconMap[type] || 'ℹ️';
  const overlay = document.createElement('div');
  overlay.id = '_customAlertOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#1e2229;border:1px solid #444;border-radius:10px;padding:24px 28px;max-width:420px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.6);">
      <h3 style="margin:0 0 10px;color:#e0e0e0;font-size:1.05rem;font-weight:700;">${icon} ${escapeHtml(title)}</h3>
      <p style="margin:0 0 22px;color:#9aa3b2;font-size:0.95rem;line-height:1.55;">${escapeHtml(message)}</p>
      <div style="display:flex;justify-content:flex-end;">
        <button id="_alertOk" class="btn-primary" style="min-width:90px;">Aceptar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    if (typeof onClose === 'function') onClose();
  };
  overlay.querySelector('#_alertOk').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  setTimeout(() => overlay.querySelector('#_alertOk')?.focus(), 50);
}