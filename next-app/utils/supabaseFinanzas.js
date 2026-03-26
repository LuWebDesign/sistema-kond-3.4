// ============================================
// SUPABASE FINANZAS - CRUD OPERATIONS
// Usa API route /api/admin/finanzas con supabaseAdmin
// para bypass de RLS
// ============================================

const API_URL = '/api/admin/finanzas';

async function apiCall(method, body = null, queryParams = '') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const url = queryParams ? `${API_URL}?${queryParams}` : API_URL;
  const resp = await fetch(url, opts);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'Error en API finanzas');
  }
  return resp.json();
}

// ============================================
// CATEGORÍAS FINANCIERAS
// ============================================

export async function getCategorias() {
  try {
    const result = await apiCall('GET', null, 'type=categorias');
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return { data: null, error: error.message };
  }
}

export async function createCategoria(nombre) {
  try {
    const result = await apiCall('POST', { action: 'createCategoria', nombre });
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return { data: null, error: error.message };
  }
}

export async function deleteCategoria(id) {
  try {
    await apiCall('DELETE', { type: 'categoria', id });
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return { error: error.message };
  }
}

export async function updateCategoria(id, nombre) {
  try {
    const result = await apiCall('PUT', { action: 'updateCategoria', id, nombre });
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return { data: null, error: error.message };
  }
}

export async function bulkUpdateMovimientosCategoria(oldName, newName) {
  try {
    const result = await apiCall('PUT', { action: 'bulkUpdateCategoria', oldName, newName });
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al actualizar categoría en movimientos:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// MOVIMIENTOS FINANCIEROS
// ============================================

export async function getMovimientos() {
  try {
    const result = await apiCall('GET', null, 'type=movimientos');
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return { data: null, error: error.message };
  }
}

export async function getMovimientosByDateRange(fechaInicio, fechaFin) {
  // Para rangos de fecha, obtenemos todos y filtramos client-side
  try {
    const result = await apiCall('GET', null, 'type=movimientos');
    const filtered = (result.data || []).filter(m =>
      m.fecha >= fechaInicio && m.fecha <= fechaFin
    );
    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error al obtener movimientos por fecha:', error);
    return { data: null, error: error.message };
  }
}

export async function createMovimiento(movimiento) {
  try {
    const result = await apiCall('POST', { action: 'createMovimiento', movimiento });
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    return { data: null, error: error.message };
  }
}

export async function updateMovimiento(id, movimiento) {
  try {
    const result = await apiCall('PUT', { action: 'updateMovimiento', id, movimiento });
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);
    return { data: null, error: error.message };
  }
}

export async function deleteMovimiento(id) {
  try {
    await apiCall('DELETE', { type: 'movimiento', id });
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    return { error: error.message };
  }
}

// ============================================
// REGISTROS DE CIERRE
// ============================================

export async function getRegistrosCierre() {
  try {
    const result = await apiCall('GET', null, 'type=registros');
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al obtener registros de cierre:', error);
    return { data: null, error: error.message };
  }
}

export async function getRegistroCierreByFecha(fecha) {
  try {
    const result = await apiCall('GET', null, 'type=registros');
    const registro = (result.data || []).find(r => r.fecha === fecha) || null;
    return { data: registro, error: null };
  } catch (error) {
    console.error('Error al obtener registro de cierre:', error);
    return { data: null, error: error.message };
  }
}

export async function upsertRegistroCierre(registro) {
  try {
    const result = await apiCall('POST', { action: 'upsertRegistroCierre', registro });
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error al guardar registro de cierre:', error);
    return { data: null, error: error.message };
  }
}

export async function deleteRegistroCierre(id) {
  try {
    await apiCall('DELETE', { type: 'registroCierre', id });
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar registro de cierre:', error);
    return { error: error.message };
  }
}
