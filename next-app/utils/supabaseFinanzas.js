// ============================================
// SUPABASE FINANZAS - CRUD OPERATIONS
// Funciones para gestión de finanzas
// ============================================

import supabase from './supabaseClient';

// ============================================
// CATEGORÍAS FINANCIERAS
// ============================================

/**
 * Obtener todas las categorías financieras
 */
export async function getCategorias() {
  try {
    const { data, error } = await supabase
      .from('categorias_financieras')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear una nueva categoría
 */
export async function createCategoria(nombre) {
  try {
    const { data, error } = await supabase
      .from('categorias_financieras')
      .insert([{ nombre }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar una categoría
 */
export async function deleteCategoria(id) {
  try {
    const { error } = await supabase
      .from('categorias_financieras')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return { error: error.message };
  }
}

// ============================================
// MOVIMIENTOS FINANCIEROS
// ============================================

/**
 * Obtener todos los movimientos financieros
 */
export async function getMovimientos() {
  try {
    const { data, error } = await supabase
      .from('movimientos_financieros')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener movimientos por rango de fechas
 */
export async function getMovimientosByDateRange(fechaInicio, fechaFin) {
  try {
    const { data, error } = await supabase
      .from('movimientos_financieros')
      .select('*')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener movimientos por fecha:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo movimiento financiero
 */
export async function createMovimiento(movimiento) {
  try {
    const movimientoData = {
      tipo: movimiento.tipo,
      monto: parseFloat(movimiento.monto),
      fecha: movimiento.fecha,
      hora: movimiento.hora || null,
      categoria: movimiento.categoria || null,
      descripcion: movimiento.descripcion || null,
      metodo_pago: movimiento.metodoPago || movimiento.metodo_pago || 'efectivo'
    };

    const { data, error } = await supabase
      .from('movimientos_financieros')
      .insert([movimientoData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un movimiento financiero
 */
export async function updateMovimiento(id, movimiento) {
  try {
    const updateData = {};
    
    if (movimiento.tipo !== undefined) updateData.tipo = movimiento.tipo;
    if (movimiento.monto !== undefined) updateData.monto = parseFloat(movimiento.monto);
    if (movimiento.fecha !== undefined) updateData.fecha = movimiento.fecha;
    if (movimiento.hora !== undefined) updateData.hora = movimiento.hora;
    if (movimiento.categoria !== undefined) updateData.categoria = movimiento.categoria;
    if (movimiento.descripcion !== undefined) updateData.descripcion = movimiento.descripcion;
    if (movimiento.metodoPago !== undefined) updateData.metodo_pago = movimiento.metodoPago;
    if (movimiento.metodo_pago !== undefined) updateData.metodo_pago = movimiento.metodo_pago;

    const { data, error } = await supabase
      .from('movimientos_financieros')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un movimiento financiero
 */
export async function deleteMovimiento(id) {
  try {
    const { error } = await supabase
      .from('movimientos_financieros')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    return { error: error.message };
  }
}

// ============================================
// REGISTROS DE CIERRE
// ============================================

/**
 * Obtener todos los registros de cierre
 */
export async function getRegistrosCierre() {
  try {
    const { data, error } = await supabase
      .from('registros_cierre')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener registros de cierre:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener registro de cierre por fecha
 */
export async function getRegistroCierreByFecha(fecha) {
  try {
    const { data, error } = await supabase
      .from('registros_cierre')
      .select('*')
      .eq('fecha', fecha)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener registro de cierre:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear o actualizar un registro de cierre
 */
export async function upsertRegistroCierre(registro) {
  try {
    const registroData = {
      fecha: registro.fecha,
      efectivo: parseFloat(registro.efectivo || 0),
      transferencia: parseFloat(registro.transferencia || 0),
      tarjeta: parseFloat(registro.tarjeta || 0),
      total: parseFloat(registro.total || 0),
      observaciones: registro.observaciones || null
    };

    const { data, error } = await supabase
      .from('registros_cierre')
      .upsert([registroData], { onConflict: 'fecha' })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al guardar registro de cierre:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un registro de cierre
 */
export async function deleteRegistroCierre(id) {
  try {
    const { error } = await supabase
      .from('registros_cierre')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar registro de cierre:', error);
    return { error: error.message };
  }
}
