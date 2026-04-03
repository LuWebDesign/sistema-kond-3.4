// ============================================
// SUPABASE COTIZACIONES CORTE - CRUD OPERATIONS
// Funciones para gestión de cotizaciones de servicio de corte
// ============================================

import supabase from './supabaseClient';

/**
 * Obtener todas las cotizaciones
 */
export async function getAllCotizaciones() {
  try {
    const { data, error } = await supabase
      .from('cotizaciones_corte')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener una cotización por ID
 */
export async function getCotizacionById(id) {
  try {
    const { data, error } = await supabase
      .from('cotizaciones_corte')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear nueva cotización
 */
export async function createCotizacion(cotizacion) {
  try {
    const parseFloat_ = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      const p = parseFloat(v);
      return isNaN(p) ? 0 : p;
    };

    const parseInt_ = (v) => {
      if (v === null || v === undefined || v === '') return 1;
      const p = parseInt(v, 10);
      return isNaN(p) ? 1 : p;
    };

    const parseMaterialId = (v) => {
      if (v === null || v === undefined || v === '' || (typeof v === 'string' && v.trim() === '')) return null;
      const p = parseInt(String(v).trim(), 10);
      return isNaN(p) ? null : p;
    };

    const cotizacionData = {
      cliente_nombre: cotizacion.clienteNombre || '',
      cliente_telefono: cotizacion.clienteTelefono || '',
      cliente_email: cotizacion.clienteEmail || '',
      descripcion: cotizacion.descripcion || '',
      medidas: cotizacion.medidas || '',
      cantidad: parseInt_(cotizacion.cantidad),
      material_id: parseMaterialId(cotizacion.materialId),
      material_nombre: cotizacion.materialNombre || '',
      costo_material: parseFloat_(cotizacion.costoMaterial),
      tiempo_maquina: cotizacion.tiempoMaquina || '00:00:00',
      costo_hora_maquina: parseFloat_(cotizacion.costoHoraMaquina),
      costo_tiempo_maquina: parseFloat_(cotizacion.costoTiempoMaquina),
      costo_diseno: parseFloat_(cotizacion.costoDiseno),
      subtotal: parseFloat_(cotizacion.subtotal),
      margen: parseFloat_(cotizacion.margen),
      total: parseFloat_(cotizacion.total),
      estado: cotizacion.estado || 'pendiente',
      notas: cotizacion.notas || ''
    };

    const { data, error } = await supabase
      .from('cotizaciones_corte')
      .insert([cotizacionData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al crear cotización:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar cotización
 */
export async function updateCotizacion(id, updates) {
  try {
    // Mapear camelCase a snake_case
    const fieldMap = {
      clienteNombre: 'cliente_nombre',
      clienteTelefono: 'cliente_telefono',
      clienteEmail: 'cliente_email',
      descripcion: 'descripcion',
      medidas: 'medidas',
      cantidad: 'cantidad',
      materialId: 'material_id',
      materialNombre: 'material_nombre',
      costoMaterial: 'costo_material',
      tiempoMaquina: 'tiempo_maquina',
      costoHoraMaquina: 'costo_hora_maquina',
      costoTiempoMaquina: 'costo_tiempo_maquina',
      costoDiseno: 'costo_diseno',
      subtotal: 'subtotal',
      margen: 'margen',
      total: 'total',
      estado: 'estado',
      notas: 'notas'
    };

    const mappedUpdates = { updated_at: new Date().toISOString() };
    for (const [key, val] of Object.entries(updates)) {
      const dbKey = fieldMap[key] || key;
      mappedUpdates[dbKey] = val;
    }

    const { data, error } = await supabase
      .from('cotizaciones_corte')
      .update(mappedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar cotización
 */
export async function deleteCotizacion(id) {
  try {
    const { error } = await supabase
      .from('cotizaciones_corte')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: true, error: null };
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    return { deleted: false, error: error.message };
  }
}
