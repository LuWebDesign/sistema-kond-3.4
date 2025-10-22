// Finanzas: gestión de movimientos (ingresos / gastos)

let finanzas = JSON.parse(localStorage.getItem('finanzas')) || [];
let registros = JSON.parse(localStorage.getItem('registros')) || [];
// categorías persistentes
let categoriasFin = JSON.parse(localStorage.getItem('categoriasFin')) || ['Ventas', 'Materia Prima', 'Servicios'];

function guardarFinanzas() {
  try {
    localStorage.setItem('finanzas', JSON.stringify(finanzas));
  } catch (e) {
    // Fallback: intentar guardar una versión minimal para evitar QuotaExceededError
    try {
      const minimal = finanzas.map(m => ({ id: m.id, tipo: m.tipo, monto: m.monto, fecha: m.fecha, pedidoId: m.pedidoId }));
      localStorage.setItem('finanzas', JSON.stringify(minimal));
      console.warn('guardarFinanzas: fallback minimal guardado por QuotaExceededError');
    } catch (e2) {
      console.error('guardarFinanzas: no se pudo guardar finanzas en localStorage', e2);
    }
  }
}

// Función de depuración para calcular y retornar valores de caja sin renderizar
function debugCalcularCaja() {
  const fin = JSON.parse(localStorage.getItem('finanzas')) || [];
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
  const hoy = new Date().toISOString().slice(0,10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);

  const ingresosHoy = fin.reduce((s, m) => s + ((m.tipo === 'ingreso' && m.fecha && m.fecha.startsWith(hoy)) ? Number(m.monto || 0) : 0), 0);
  const egresosHoy = fin.reduce((s, m) => s + ((m.tipo !== 'ingreso' && m.fecha && m.fecha.startsWith(hoy)) ? Number(m.monto || 0) : 0), 0);
  const saldoAyer = fin.reduce((s, m) => s + ((m.fecha && m.fecha.startsWith(ayer)) ? (m.tipo === 'ingreso' ? Number(m.monto || 0) : -Number(m.monto || 0)) : 0), 0);

  let porCobrar = 0;
  pedidosCatalogo.forEach(p => {
    const total = Number(p.total || 0);
    const estadoPago = p.estadoPago || '';
    if (estadoPago === 'pagado' || estadoPago === 'pagado_total') return;
    if (estadoPago === 'seña_pagada') {
      const sena = Number(p.senaMonto || p.señaMonto || (total * 0.5));
      porCobrar += Math.max(0, total - sena);
    } else {
      porCobrar += total;
    }
  });

  const dineroDisponible = ingresosHoy - egresosHoy + saldoAyer;
  console.log('debugCalcularCaja ->', { ingresosHoy, egresosHoy, saldoAyer, dineroDisponible, porCobrar });
  return { ingresosHoy, egresosHoy, saldoAyer, dineroDisponible, porCobrar };
}

function formatCurrencySimple(v) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
  } catch (e) {
    return '$' + (v || 0);
  }
}

// Normalizar string de monto (ej: "1.234,56" -> "1234.56") para parsear
function normalizeMontoString(str) {
  if (!str && str !== 0) return '';
  let s = String(str).trim();
  // eliminar signos de moneda y espacios
  s = s.replace(/[^0-9.,-]/g, '');
  // si hay más de one comma or dot, treat dots as thousands and comma as decimal
  const hasComma = s.indexOf(',') !== -1;
  const hasDot = s.indexOf('.') !== -1;
  if (hasDot && hasComma) {
    // remove dots (thousands), replace comma with dot (decimal)
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasDot && !hasComma) {
    // En locale es-AR, el punto es separador de miles. Cuando hay puntos y no comas,
    // tratar los puntos como separadores de miles (eliminar todos los puntos).
    // Ej: "5.000" -> "5000" (no tratar como decimal 5.000 -> 5)
    s = s.replace(/\./g, '');
  } else if (!hasDot && hasComma) {
    // assume comma is decimal -> replace with dot
    s = s.replace(/,/g, '.');
  }
  return s;
}

// Formatear número para mostrar en input según locale es-AR
function formatNumberForDisplay(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  try {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(num);
  } catch (e) {
    return String(num);
  }
}

// Obtener hora actual en formato HH:MM:SS
function getCurrentTimeString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function renderFinanzas() {
  // Recargar finanzas desde localStorage
  finanzas = JSON.parse(localStorage.getItem('finanzas')) || [];
  
  const container = document.getElementById('finanzasList');
  const empty = document.getElementById('finanzasEmpty');
  const balanceEl = document.getElementById('finanzasBalance');
  const equilibrioEl = document.getElementById('equilibrioDia');
  
  if (!container || !empty || !balanceEl) {
    return;
  }

  if (!Array.isArray(finanzas) || finanzas.length === 0) {
    container.style.display = 'none';
    empty.style.display = 'block';
    balanceEl.textContent = formatCurrencySimple(0);
    if (equilibrioEl) equilibrioEl.textContent = 'Equilibrio hoy: $0';
    // Actualizar tarjetas incluso sin movimientos
    updateFinanzasCards();
    return;
  }

  empty.style.display = 'none';
  // Usar flex-column para apilar tarjetas verticalmente (una por fila)
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  // Agrupar y ordenar movimientos por fecha y hora sin usar Date (evita offsets TZ)
  // Construir un campo ts = fecha + ' ' + hora (hora puede ser HH:MM:SS)
  const list = [...finanzas].map(m => ({
    _orig: m,
    _ts: `${m.fecha || '0000-00-00'} ${m.hora || '00:00:00'}`
  }));

  // ordenar descendente por timestamp string (iso-like)
  list.sort((a,b) => (b._ts > a._ts ? 1 : (b._ts < a._ts ? -1 : 0)));

  const groups = list.reduce((acc, wrapped) => {
    const mv = wrapped._orig;
    const key = mv.fecha || 'Sin fecha';
    if (!acc[key]) acc[key] = [];
    acc[key].push(mv);
    return acc;
  }, {});

  // ordenar keys (fechas) descendente usando formato YYYY-MM-DD (strings)
  const dates = Object.keys(groups).sort((a,b) => (b > a ? 1 : (b < a ? -1 : 0)));

  const groupsHtml = dates.map(dateKey => {
    // dentro del mismo día ordenar por hora descendente (si no hay hora, se considera 00:00:00)
    const movimientos = (groups[dateKey] || []).slice().sort((x,y) => {
      const tx = `${x.hora || '00:00:00'}`;
      const ty = `${y.hora || '00:00:00'}`;
      return ty > tx ? 1 : (ty < tx ? -1 : 0);
    });
    // subtotal del día
    const subtotal = movimientos.reduce((s, m) => s + (m.tipo === 'ingreso' ? Number(m.monto || 0) : -Number(m.monto || 0)), 0);
    // formatear fecha para mostrar: parsear YYYY-MM-DD manualmente y construir Date local
    let fechaDisplay = dateKey;
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        const parts = dateKey.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // monthIndex
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        fechaDisplay = dt.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        fechaDisplay = new Date(dateKey).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    } catch (e) {}

    const movimientosHtml = movimientos.map(m => {
      // soportar tanto 'gasto' como 'egreso' como sinónimo de salida
      const tipoNormalized = (m.tipo === 'egreso') ? 'gasto' : m.tipo;
      const sign = tipoNormalized === 'ingreso' ? '+' : '-';
      const tipoClass = tipoNormalized === 'ingreso' ? 'ingreso' : (tipoNormalized === 'gasto' ? 'gasto' : 'inversion');
      const metodo = m.metodoPago ? ` - ${escapeHtml(m.metodoPago)}` : '';
      // Mostrar nombre del cliente si está disponible
      const clienteDisplay = m.clienteName ? `<div style="color:#cfcfcf; font-size:0.95rem; margin-top:6px;">Cliente: ${escapeHtml(m.clienteName)}</div>` : '';
      return `
        <div class="finanza-movimiento" data-id="${m.id}">
          <div class="mv-top">
            <div class="mv-meta"><strong>${escapeHtml(m.categoria || 'Sin categoría')}</strong><span class="categoria">${metodo ? metodo : ''}</span> <small style="color:#999; margin-left:8px;">${escapeHtml(m.fecha || '')}${m.hora ? ' - ' + escapeHtml(m.hora) : ''}</small></div>
            <div class="mv-amount ${tipoClass}">${formatCurrencySimple(m.monto || 0)}</div>
          </div>
          <div class="mv-desc">${escapeHtml(m.descripcion || '')}${clienteDisplay}</div>
          <div class="mv-actions">
            <button class="btn-secondary btn-editar-mov" data-id="${m.id}">Editar</button>
            <button class="btn-secondary btn-eliminar-mov" data-id="${m.id}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="finanzas-group" data-fecha="${escapeHtml(dateKey)}">
        <div class="finanzas-group-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin:8px 0;">
          <div style="font-weight:700; color:var(--text-primary);">${escapeHtml(fechaDisplay)}</div>
          <div class="finanzas-subtotal" data-subtotal="${subtotal}">Subtotal: ${formatCurrencySimple(subtotal)}</div>
        </div>
        <div class="finanzas-group-body">${movimientosHtml}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = groupsHtml;

  // balance
  const balance = finanzas.reduce((acc, cur) => {
    const t = (cur.tipo === 'egreso') ? 'gasto' : cur.tipo;
    return acc + (t === 'ingreso' ? Number(cur.monto || 0) : -Number(cur.monto || 0));
  }, 0);
  balanceEl.textContent = formatCurrencySimple(balance);

  // Actualizar tarjetas de resumen
  updateFinanzasCards();

  // eliminar listeners
  container.querySelectorAll('.btn-eliminar-mov').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (!confirm('¿Eliminar este movimiento?')) return;
      const idx = finanzas.findIndex(x => String(x.id) === String(id));
      if (idx !== -1) {
        finanzas.splice(idx, 1);
        guardarFinanzas();
        renderFinanzas();
        showNotification('Movimiento eliminado', 'success');
      }
    });
  });

  // listeners para editar
  container.querySelectorAll('.btn-editar-mov').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const mov = finanzas.find(x => String(x.id) === String(id));
      if (!mov) { showNotification('Movimiento no encontrado', 'error'); return; }

      // Rellenar formulario
      const form = document.getElementById('finanzasForm');
      if (!form) return;
      document.getElementById('finanzasTipo').value = mov.tipo || 'ingreso';
      document.getElementById('finanzasMonto').value = formatNumberForDisplay(Number(mov.monto || 0));
      document.getElementById('finanzasFecha').value = mov.fecha || new Date().toISOString().slice(0,10);
      document.getElementById('finanzasHora').value = mov.hora || '';
      renderCategoriasSelect();
      const sel = document.getElementById('finanzasCategoriaSelect'); if (sel) sel.value = mov.categoria || '';
      document.getElementById('finanzasDescripcion').value = mov.descripcion || '';
      document.getElementById('finanzasMetodoPago').value = mov.metodoPago || '';

      form.style.display = 'block';

      // Hacer scroll para que el formulario quede en la parte superior de la ventana
      // y enfocar el campo monto para edición inmediata.
      try {
        const rect = form.getBoundingClientRect();
        const offset = window.scrollY || window.pageYOffset;
        // scroll to align form top with viewport top (with small margin)
        window.scrollTo({ top: offset + rect.top - 12, behavior: 'smooth' });
        const montoInput = document.getElementById('finanzasMonto');
        if (montoInput) {
          // focus after a tiny delay to allow smooth scroll to start
          setTimeout(() => { montoInput.focus(); montoInput.select && montoInput.select(); }, 250);
        }
      } catch (err) {
        // fallback: just focus
        const montoInput = document.getElementById('finanzasMonto'); if (montoInput) { montoInput.focus(); }
      }

      // marcar modo edición
      const saveBtn = document.getElementById('finanzasGuardar');
      if (saveBtn) {
        saveBtn.dataset.editId = mov.id;
        saveBtn.textContent = 'Actualizar';
      }
    });
  });
}

// Renderizar select de categorías
function renderCategoriasSelect() {
  const sel = document.getElementById('finanzasCategoriaSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Sin categoría --</option>' + categoriasFin.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function guardarCategorias() {
  localStorage.setItem('categoriasFin', JSON.stringify(categoriasFin));
}

// Render del panel de gestión de categorías (editar / eliminar)
function renderCategoriasManager() {
  const mgr = document.getElementById('finanzasCategoriasManager');
  if (!mgr) return;
  if (!Array.isArray(categoriasFin) || categoriasFin.length === 0) {
    mgr.innerHTML = '<div style="color:#999;">No hay categorías.</div>';
    return;
  }

  mgr.innerHTML = categoriasFin.map(c => `
    <div class="categoria-item" data-cat="${escapeHtml(c)}" style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
      <div style="flex:1; color:#e0e0e0;">${escapeHtml(c)}</div>
      <button class="btn-small btn-edit-cat" data-cat="${escapeHtml(c)}">Editar</button>
      <button class="btn-small btn-delete-cat" data-cat="${escapeHtml(c)}">Eliminar</button>
    </div>
  `).join('');

  // attach handlers
  mgr.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.dataset.cat;
      if (!confirm(`Eliminar categoría "${name}"? Esto no eliminará movimientos pero dejará su categoría en blanco para futuros movimientos.`)) return;
      const idx = categoriasFin.findIndex(x => x === name);
      if (idx !== -1) {
        categoriasFin.splice(idx, 1);
        guardarCategorias();
        renderCategoriasSelect();
        renderCategoriasManager();
        showNotification('Categoría eliminada', 'success');
      }
    });
  });

  mgr.querySelectorAll('.btn-edit-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const oldName = e.currentTarget.dataset.cat;
      const nuevo = prompt('Renombrar categoría', oldName);
      if (nuevo === null) return; // cancel
      const trimmed = String(nuevo).trim();
      if (!trimmed) { showNotification('Nombre inválido', 'error'); return; }
      if (categoriasFin.includes(trimmed)) { showNotification('Ya existe una categoría con ese nombre', 'error'); return; }
      const idx = categoriasFin.findIndex(x => x === oldName);
      if (idx !== -1) {
        // contar movimientos afectados
        const afectados = finanzas.filter(m => m.categoria === oldName).length;
        if (afectados > 5) {
          const ok = confirm(`Se van a actualizar ${afectados} movimientos para usar la nueva categoría "${trimmed}". ¿Continuar?`);
          if (!ok) { showNotification('Renombrado cancelado', 'info'); return; }
        }

        categoriasFin[idx] = trimmed;
        // actualizar movimientos que tengan la categoría antigua
        finanzas = finanzas.map(m => m.categoria === oldName ? { ...m, categoria: trimmed } : m);
        guardarCategorias();
        guardarFinanzas();
        renderCategoriasSelect();
        renderFinanzas();
        renderCategoriasManager();
        showNotification('Categoría renombrada', 'success');
      }
    });
  });
}

// UI handlers para agregar categoría rápida
const btnAddCat = document.getElementById('finanzasAddCategoriaBtn');
const inputCatCustom = document.getElementById('finanzasCategoriaCustom');
const btnSaveCat = document.getElementById('finanzasSaveCategoriaBtn');
if (btnAddCat) {
  btnAddCat.addEventListener('click', () => {
    inputCatCustom.style.display = inputCatCustom.style.display === 'none' ? 'block' : 'none';
    btnSaveCat.style.display = btnSaveCat.style.display === 'none' ? 'inline-block' : 'none';
    inputCatCustom.focus();
  });
}
if (btnSaveCat) {
  btnSaveCat.addEventListener('click', () => {
    const v = inputCatCustom.value.trim();
    if (!v) { showNotification('Ingrese el nombre de la categoría', 'error'); return; }
    if (!categoriasFin.includes(v)) {
      categoriasFin.push(v);
      guardarCategorias();
      renderCategoriasSelect();
      // seleccionar la nueva
      const sel = document.getElementById('finanzasCategoriaSelect');
      if (sel) sel.value = v;
      inputCatCustom.value = '';
      inputCatCustom.style.display = 'none';
      btnSaveCat.style.display = 'none';
      showNotification('Categoría creada', 'success');
    } else {
      showNotification('La categoría ya existe', 'error');
    }
  });
}

// Inicializar select al cargar
document.addEventListener('DOMContentLoaded', () => {
  renderCategoriasSelect();
  // render manager si existe
  renderCategoriasManager();
});

// Toggle del panel de gestión de categorías
const finanzasManageBtn = document.getElementById('finanzasManageCategoriasBtn');
if (finanzasManageBtn) {
  finanzasManageBtn.addEventListener('click', () => {
    const mgr = document.getElementById('finanzasCategoriasManager');
    if (!mgr) return;
    const isHidden = mgr.style.display === 'none' || mgr.style.display === '';
    mgr.style.display = isHidden ? 'block' : 'none';
    if (isHidden) renderCategoriasManager();
  });
}

// Registrar movimiento desde otros módulos
function registrarMovimiento({ tipo = 'ingreso', monto = 0, categoria = '', descripcion = '', fecha = null, clienteName = '', pedidoId = null, idempotencyKey = null }) {
  const fechaFinal = fecha || new Date().toISOString().slice(0,10);

  // Si se proporcionó idempotencyKey, comprobar si ya existe para evitar duplicados
  try {
    const existingFin = JSON.parse(localStorage.getItem('finanzas') || '[]');
    if (idempotencyKey && Array.isArray(existingFin)) {
      const exists = existingFin.some(m => m.idempotencyKey && m.idempotencyKey === idempotencyKey);
      if (exists) {
        const found = existingFin.find(m => m.idempotencyKey === idempotencyKey);
        try { console.debug('[DEBUG] registrarMovimiento -> idempotency hit', idempotencyKey); } catch(e) {}
        return found;
      }
    }
  } catch (e) {
    // si falla la lectura, continuar para registrar (no bloquear la operación)
  }

  const mov = { id: Date.now() + Math.floor(Math.random()*100000), tipo, monto: Number(monto), categoria, descripcion, fecha: fechaFinal, hora: getCurrentTimeString(), registrado: false };
  // Adjuntar metadata opcional de cliente/pedido si se proporciona
  if (clienteName) mov.clienteName = clienteName;
  if (pedidoId) mov.pedidoId = pedidoId;
  if (idempotencyKey) mov.idempotencyKey = idempotencyKey;
  // DEBUG: log para verificar llamadas desde otros módulos
  try { console.debug('[DEBUG registrarMovimiento] called', { tipo, monto: Number(monto), categoria, descripcion, fecha: fechaFinal, clienteName, pedidoId, idempotencyKey }); } catch(e) {}
  finanzas.push(mov);
  console.log('[DEBUG] registrarMovimiento -> added', mov);
  guardarFinanzas();
  console.log('[DEBUG] registrarMovimiento -> saved to localStorage');

  // Notificar a UIs React/Next que pueden leer el nuevo movimiento (en la misma pestaña 'storage' no dispara)
  try {
    window.dispatchEvent(new CustomEvent('finanzasUpdated', { detail: mov }));
  } catch (e) {}

  // Llamar al renderer legacy si existe
  if (typeof renderFinanzas === 'function') renderFinanzas();

  // Crear una notificación resumida para la UI si la función addNotification() está disponible.
  try {
    if (typeof addNotification === 'function') {
      let title = mov.tipo === 'ingreso' ? 'Ingreso registrado' : ((mov.tipo === 'egreso' || mov.tipo === 'gasto') ? 'Gasto registrado' : 'Movimiento registrado');
      // Construir cuerpo legible
      let bodyParts = [];
      if (mov.clienteName) bodyParts.push(String(mov.clienteName));
      if (mov.descripcion) bodyParts.push(String(mov.descripcion));
      const montoText = formatCurrencySimple(mov.monto || 0);
      if (montoText) bodyParts.push(montoText);
      if (mov.categoria) bodyParts.push(String(mov.categoria));
      let body = bodyParts.join(' — ');
      if (mov.pedidoId) body += ` (Pedido #${mov.pedidoId})`;

      addNotification({ title, body, date: mov.fecha, meta: { tipo: 'financiero', tipoMovimiento: mov.tipo, pedidoId: mov.pedidoId, clienteName: mov.clienteName } });
    }
  } catch (err) {
    console.warn('Finanzas: no se pudo crear notificación', err);
  }

  return mov;
}

// Registros (cierre de caja)
function verRegistrosPorFecha(fecha) {
  return registros.filter(r => r.fecha === fecha);
}

function cerrarCajaParaFecha(fecha) {
  // Obtener movimientos no registrados para la fecha
  const movimientos = finanzas.filter(m => m.fecha && m.fecha.startsWith(fecha) && !m.registrado);
  if (movimientos.length === 0) return null;

  const total = movimientos.reduce((acc, cur) => acc + (cur.tipo === 'ingreso' ? cur.monto : -cur.monto), 0);
  const registro = { id: Date.now() + Math.floor(Math.random()*100000), fecha, total, movimientos: movimientos.map(m => m.id), cerradoAt: new Date().toISOString() };
  registros.push(registro);
  localStorage.setItem('registros', JSON.stringify(registros));

  // Marcar movimientos como registrados
  finanzas = finanzas.map(m => {
    if (m.fecha && m.fecha.startsWith(fecha)) {
      return { ...m, registrado: true };
    }
    return m;
  });
  guardarFinanzas();
  if (typeof renderFinanzas === 'function') renderFinanzas();
  return registro;
}

// Wire botones de registros si existen
const btnVerRegistros = document.getElementById('btnVerRegistros');
if (btnVerRegistros) {
  btnVerRegistros.addEventListener('click', () => {
    const fecha = document.getElementById('registrosFecha')?.value || new Date().toISOString().slice(0,10);
    const list = verRegistrosPorFecha(fecha);
    const container = document.getElementById('registrosList');
    const empty = document.getElementById('registrosEmpty');
    if (!container || !empty) return;
    if (!list || list.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    // Render cards con espacio para detalle de movimientos
    container.innerHTML = list.map(r => `
      <div class="pedido-card registro-card" data-id="${r.id}" style="cursor:pointer;">
        <div style="padding:12px;">
          <strong>${r.fecha}</strong> - Total: ${formatCurrencySimple(r.total)}
          <div style="font-size:0.85rem; color:#999; margin-top:6px;">Cerrado: ${new Date(r.cerradoAt).toLocaleString()}</div>
        </div>
        <div class="registro-movimientos" style="display:none; padding:8px; border-top:1px solid #333;"></div>
      </div>
    `).join('');

    // Agregar listeners para mostrar/ocultar y renderizar movimientos del registro
    container.querySelectorAll('.registro-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = card.dataset.id;
        const detallesEl = card.querySelector('.registro-movimientos');
        if (!detallesEl) return;
        const isOpen = detallesEl.style.display !== 'none' && detallesEl.style.display !== '';
        if (isOpen) {
          detallesEl.style.display = 'none';
          detallesEl.innerHTML = '';
          return;
        }

        // Encontrar el registro por id
        const registro = list.find(r => String(r.id) === String(id));
        if (!registro) {
          detallesEl.innerHTML = '<div style="color:#999; padding:8px;">Registro no encontrado.</div>';
          detallesEl.style.display = 'block';
          return;
        }

        // Buscar movimientos por ID dentro del array global `finanzas`
        const movimientos = Array.isArray(registro.movimientos) ? registro.movimientos.map(mid => finanzas.find(m => String(m.id) === String(mid))).filter(Boolean) : [];

        if (!movimientos || movimientos.length === 0) {
          detallesEl.innerHTML = '<div style="color:#999; padding:8px;">No se encontraron movimientos para este registro.</div>';
          detallesEl.style.display = 'block';
          return;
        }

        // Renderizar cada movimiento en detalle (incluye hora)
        detallesEl.innerHTML = movimientos.map(m => {
          const tipoClass = m.tipo === 'ingreso' ? 'ingreso' : (m.tipo === 'gasto' ? 'gasto' : 'inversion');
          return `
            <div style="padding:8px; border-bottom:1px solid #2b2b2b; display:flex; justify-content:space-between; gap:12px; align-items:center;">
              <div style="flex:1;">
                <div style="font-weight:700; color:var(--text-primary);">${escapeHtml(m.categoria || 'Sin categoría')} <small style=\"color:#999; margin-left:8px; font-weight:600;\">${escapeHtml(m.fecha || '')}${m.hora ? ' - ' + escapeHtml(m.hora) : ''}</small></div>
                <div style="color:#cfcfcf; font-size:0.95rem;">${escapeHtml(m.descripcion || '')}</div>
              </div>
              <div class="mv-amount ${tipoClass}" style="min-width:140px; text-align:right; font-weight:700;">${formatCurrencySimple(m.monto || 0)}</div>
            </div>
          `;
        }).join('');
        detallesEl.style.display = 'block';
      });
    });
  });
}

const btnCerrarCaja = document.getElementById('btnCerrarCaja');
if (btnCerrarCaja) {
  btnCerrarCaja.addEventListener('click', () => {
    const fecha = document.getElementById('registrosFecha')?.value || new Date().toISOString().slice(0,10);
    if (!confirm(`Cerrar caja para ${fecha}? Esto marcará los movimientos como registrados.`)) return;
    const registro = cerrarCajaParaFecha(fecha);
    if (registro) {
      showNotification('Caja cerrada y registro creado', 'success');
      // refrescar la vista de registros
      document.getElementById('btnVerRegistros') && document.getElementById('btnVerRegistros').click();
    } else {
      showNotification('No hay movimientos para cerrar en esa fecha', 'error');
    }
  });
}

// UI wiring
  const btnNuevoMovimiento = document.getElementById('btnNuevoMovimiento');
if (btnNuevoMovimiento) {
  btnNuevoMovimiento.addEventListener('click', () => {
    const form = document.getElementById('finanzasForm');
    if (!form) return;
    form.style.display = 'block';
    document.getElementById('finanzasMonto').value = '';
    document.getElementById('finanzasFecha').value = new Date().toISOString().slice(0,10);
    document.getElementById('finanzasHora').value = '';
    document.getElementById('finanzasDescripcion').value = '';
    // asegurar que el select esté poblado y el input custom oculto
    renderCategoriasSelect();
    const sel = document.getElementById('finanzasCategoriaSelect');
    if (sel) sel.value = '';
    const inputCat = document.getElementById('finanzasCategoriaCustom'); if (inputCat) inputCat.style.display = 'none';
    // limpiar modo edición si existiera
    const saveBtn = document.getElementById('finanzasGuardar'); if (saveBtn) { delete saveBtn.dataset.editId; saveBtn.textContent = 'Guardar'; }
  });
      // Default tipo: marcar control segmentado
      try {
        const tipoHidden = document.getElementById('finanzasTipo');
        const segBtns = document.querySelectorAll('.segmented-control .seg-btn');
        segBtns.forEach(b => b.classList.remove('active'));
        const val = (tipoHidden && tipoHidden.value) ? tipoHidden.value : 'ingreso';
        const btn = document.querySelector(`.segmented-control .seg-btn[data-value="${val}"]`);
        if (btn) btn.classList.add('active');
      } catch (e) { /* ignore */ }
}

const finanzasCancelar = document.getElementById('finanzasCancelar');
if (finanzasCancelar) finanzasCancelar.addEventListener('click', () => {
  const form = document.getElementById('finanzasForm');
  if (form) form.style.display = 'none';
  // limpiar modo edición
  const saveBtn = document.getElementById('finanzasGuardar');
  if (saveBtn) {
    delete saveBtn.dataset.editId;
    saveBtn.textContent = 'Guardar';
  }
});

const finanzasGuardar = document.getElementById('finanzasGuardar');
if (finanzasGuardar) finanzasGuardar.addEventListener('click', () => {
  const tipo = document.getElementById('finanzasTipo')?.value || 'ingreso';
  // normalizar monto desde el input formateado
  const rawMontoStr = document.getElementById('finanzasMonto')?.value || '0';
  const montoNormalized = normalizeMontoString(rawMontoStr);
  const monto = parseFloat(montoNormalized) || 0;
  const fecha = document.getElementById('finanzasFecha')?.value || new Date().toISOString().slice(0,10);
  let hora = document.getElementById('finanzasHora')?.value || '';
  if (!hora) hora = getCurrentTimeString();
  const categoria = (document.getElementById('finanzasCategoriaSelect')?.value || '').trim() || '';
    const descripcion = document.getElementById('finanzasDescripcion')?.value.trim() || '';
    const metodoPago = document.getElementById('finanzasMetodoPago')?.value || '';

  if (!monto || monto <= 0) { showNotification('Ingrese un monto válido', 'error'); return; }

  // modo edición?
  const editId = finanzasGuardar.dataset.editId;
  if (editId) {
    const idx = finanzas.findIndex(x => String(x.id) === String(editId));
    if (idx !== -1) {
      finanzas[idx] = { ...finanzas[idx], tipo, monto, fecha, hora, categoria, descripcion, metodoPago };
      guardarFinanzas();
      renderFinanzas();
      // limpiar modo edición
      delete finanzasGuardar.dataset.editId;
      finanzasGuardar.textContent = 'Guardar';
      const form = document.getElementById('finanzasForm'); if (form) form.style.display = 'none';
      showNotification('Movimiento actualizado', 'success');
      return;
    }
  }

  // crear nuevo
  finanzas.push({ id: Date.now() + Math.floor(Math.random()*100000), tipo, monto, fecha, hora, categoria, descripcion, metodoPago });
  console.log('[DEBUG] finanzas.push ->', finanzas[finanzas.length-1]);
  guardarFinanzas();
  console.log('[DEBUG] localStorage.finanzas saved, length=', (JSON.parse(localStorage.getItem('finanzas')) || []).length);
  renderFinanzas();

  const form = document.getElementById('finanzasForm');
  if (form) form.style.display = 'none';
  showNotification('Movimiento guardado', 'success');
});

// Formato en tiempo real y navegación por Enter para el campo monto
const montoInput = document.getElementById('finanzasMonto');
if (montoInput) {
  // on input: keep a caret-safe formatting (naive approach: format on blur, parse on input)
  montoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // mover foco al siguiente campo (fecha)
      const fechaInput = document.getElementById('finanzasFecha');
      if (fechaInput) fechaInput.focus();
      return;
    }
  });

  montoInput.addEventListener('blur', (e) => {
    const raw = montoInput.value;
    const normalized = normalizeMontoString(raw);
    const n = parseFloat(normalized);
    if (!isNaN(n)) {
      montoInput.value = formatNumberForDisplay(n);
    }
  });

  // on focus: remove formatting to let user type plain number
  montoInput.addEventListener('focus', (e) => {
    const raw = montoInput.value;
    const normalized = normalizeMontoString(raw);
    montoInput.value = normalized;
  });
}

// Función para actualizar las tarjetas de resumen de finanzas
function updateFinanzasCards() {
  const fin = JSON.parse(localStorage.getItem('finanzas')) || [];
  const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || [];
  const hoy = new Date().toISOString().slice(0,10);

  // Calcular valores
  const ingresos = fin.reduce((s, m) => s + ((m.tipo === 'ingreso' && m.fecha && m.fecha.startsWith(hoy)) ? Number(m.monto || 0) : 0), 0);
  const egresos = fin.reduce((s, m) => s + (((m.tipo === 'egreso' || m.tipo === 'gasto') && m.fecha && m.fecha.startsWith(hoy)) ? Number(m.monto || 0) : 0), 0);
  const equilibrio = ingresos - egresos;

  // Calcular dinero por cobrar
  let porCobrar = 0;
  pedidosCatalogo.forEach(p => {
    const total = Number(p.total || 0);
    const estadoPago = p.estadoPago || '';
    if (estadoPago === 'pagado' || estadoPago === 'pagado_total') return;
    if (estadoPago === 'seña_pagada') {
      const sena = Number(p.senaMonto || p.señaMonto || (total * 0.5));
      porCobrar += Math.max(0, total - sena);
    } else {
      porCobrar += total;
    }
  });

  // Calcular balance acumulado
  const balance = fin.reduce((acc, cur) => {
    if (cur.tipo === 'ingreso') return acc + Number(cur.monto || 0);
    if (cur.tipo === 'egreso' || cur.tipo === 'gasto') return acc - Number(cur.monto || 0);
    return acc;
  }, 0);
  const dineroDisponible = balance;

  // Actualizar elementos del DOM
  const ingresosEl = document.getElementById('movIngresos');
  const egresosEl = document.getElementById('movEgresos');
  const equilibrioEl = document.getElementById('equilibrioDia');
  const balanceEl = document.getElementById('finanzasBalance');
  const disponibleEl = document.getElementById('dineroDisponible');
  const porCobrarEl = document.getElementById('porCobrar');

  if (ingresosEl) ingresosEl.textContent = formatCurrencySimple(ingresos);
  if (egresosEl) egresosEl.textContent = formatCurrencySimple(egresos);
  if (equilibrioEl) equilibrioEl.textContent = formatCurrencySimple(equilibrio);
  if (balanceEl) balanceEl.textContent = formatCurrencySimple(balance);
  if (disponibleEl) disponibleEl.textContent = formatCurrencySimple(dineroDisponible);
  if (porCobrarEl) porCobrarEl.textContent = formatCurrencySimple(porCobrar);

  console.log('Finanzas actualizadas:', {
    ingresos,
    egresos,
    equilibrio,
    balance,
    dineroDisponible,
    porCobrar
  });
}

// inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderFinanzas);
} else {
  renderFinanzas();
}

// Control segmentado: sincronizar botones con input hidden
document.addEventListener('DOMContentLoaded', () => {
  const seg = document.querySelector('.segmented-control');
  if (!seg) return;
  const buttons = seg.querySelectorAll('.seg-btn');
  const hidden = document.getElementById('finanzasTipo');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // marcar visualmente
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // actualizar hidden
      const v = btn.dataset.value;
      if (hidden) hidden.value = v;
    });
  });

  // activar por defecto el botón según valor hidden
  if (hidden && hidden.value) {
    const activeBtn = seg.querySelector(`.seg-btn[data-value="${hidden.value}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    else seg.querySelector('.seg-btn')?.classList.add('active');
  } else {
    seg.querySelector('.seg-btn')?.classList.add('active');
  }
});
