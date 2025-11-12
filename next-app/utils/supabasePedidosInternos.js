// ============================================
// SUPABASE PEDIDOS INTERNOS - CRUD OPERATIONS
// Funciones para gestión de pedidos internos (calendario)
// ============================================

import supabase from './supabaseClient';

/**
 * Obtener todos los pedidos internos
 */
export async function getAllPedidosInternos() {
  try {
    const { data, error } = await supabase
      .from('pedidos_internos')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    
    // Mapear campos de snake_case a camelCase para compatibilidad con código existente
    const mappedData = (data || []).map(pedido => ({
      id: pedido.id,
      nroPedido: pedido.nro_pedido || null,
      cliente: pedido.cliente,
      producto: pedido.producto,
      cantidad: pedido.cantidad,
      fechaEntrega: pedido.fecha_entrega,
      estado: pedido.estado,
      precioUnitario: pedido.precio_unitario,
      precioTotal: pedido.precio_total,
      tiempoEstimado: pedido.tiempo_estimado,
      fechaCreacion: pedido.fecha_creacion,
      createdAt: pedido.created_at,
      updatedAt: pedido.updated_at,
      // Campos adicionales que pueden existir en localStorage
      asignadoAlCalendario: pedido.asignado_al_calendario || false,
      fechaAsignadaCalendario: pedido.fecha_asignada_calendario || null,
      fecha: pedido.fecha_entrega || pedido.fecha, // compatibilidad
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error al obtener pedidos internos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener un pedido interno por ID
 */
export async function getPedidoInternoById(id) {
  try {
    const { data, error } = await supabase
      .from('pedidos_internos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Mapear campos
    const mappedData = {
      id: data.id,
      cliente: data.cliente,
      producto: data.producto,
      cantidad: data.cantidad,
      fechaEntrega: data.fecha_entrega,
      estado: data.estado,
      precioUnitario: data.precio_unitario,
      precioTotal: data.precio_total,
      tiempoEstimado: data.tiempo_estimado,
      fechaCreacion: data.fecha_creacion,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      asignadoAlCalendario: data.asignado_al_calendario || false,
      fechaAsignadaCalendario: data.fecha_asignada_calendario || null,
      fecha: data.fecha_entrega || data.fecha,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error al obtener pedido interno:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo pedido interno
 */
export async function createPedidoInterno(pedido) {
  try {
    // Mapear campos de camelCase a snake_case
    const pedidoData = {
      cliente: pedido.cliente,
      producto: pedido.producto || null,
      cantidad: pedido.cantidad || 1,
      fecha_entrega: pedido.fechaEntrega || pedido.fecha || null,
      estado: pedido.estado || 'pendiente',
      precio_unitario: pedido.precioUnitario || 0,
      precio_total: pedido.precioTotal || 0,
      tiempo_estimado: pedido.tiempoEstimado || null,
      asignado_al_calendario: pedido.asignadoAlCalendario || false,
      fecha_asignada_calendario: pedido.fechaAsignadaCalendario || null,
    };

    const { data, error } = await supabase
      .from('pedidos_internos')
      .insert([pedidoData])
      .select()
      .single();

    if (error) throw error;
    // Generar folio humano si la columna existe: PI-YYYY-#####
    try {
      const year = new Date(data.fecha_creacion || Date.now()).getFullYear();
      const padded = String(data.id).padStart(5, '0');
      const folio = `PI-${year}-${padded}`;
      await supabase
        .from('pedidos_internos')
        .update({ nro_pedido: folio })
        .eq('id', data.id);
      data.nro_pedido = folio;
    } catch (_) {}
    
    // Mapear respuesta
    const mappedData = {
      id: data.id,
      nroPedido: data.nro_pedido || null,
      cliente: data.cliente,
      producto: data.producto,
      cantidad: data.cantidad,
      fechaEntrega: data.fecha_entrega,
      estado: data.estado,
      precioUnitario: data.precio_unitario,
      precioTotal: data.precio_total,
      tiempoEstimado: data.tiempo_estimado,
      fechaCreacion: data.fecha_creacion,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      asignadoAlCalendario: data.asignado_al_calendario,
      fechaAsignadaCalendario: data.fecha_asignada_calendario,
      fecha: data.fecha_entrega,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error al crear pedido interno:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un pedido interno existente
 */
export async function updatePedidoInterno(id, updates) {
  try {
    // Mapear campos de camelCase a snake_case
    const updateData = {};
    
    if (updates.cliente !== undefined) updateData.cliente = updates.cliente;
    if (updates.producto !== undefined) updateData.producto = updates.producto;
    if (updates.cantidad !== undefined) updateData.cantidad = updates.cantidad;
    if (updates.fechaEntrega !== undefined) updateData.fecha_entrega = updates.fechaEntrega;
    if (updates.fecha !== undefined) updateData.fecha_entrega = updates.fecha;
    if (updates.estado !== undefined) updateData.estado = updates.estado;
    if (updates.precioUnitario !== undefined) updateData.precio_unitario = updates.precioUnitario;
    if (updates.precioTotal !== undefined) updateData.precio_total = updates.precioTotal;
    if (updates.tiempoEstimado !== undefined) updateData.tiempo_estimado = updates.tiempoEstimado;
    if (updates.asignadoAlCalendario !== undefined) updateData.asignado_al_calendario = updates.asignadoAlCalendario;
    if (updates.fechaAsignadaCalendario !== undefined) updateData.fecha_asignada_calendario = updates.fechaAsignadaCalendario;

    const { data, error } = await supabase
      .from('pedidos_internos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Mapear respuesta
    const mappedData = {
      id: data.id,
      nroPedido: data.nro_pedido || null,
      cliente: data.cliente,
      producto: data.producto,
      cantidad: data.cantidad,
      fechaEntrega: data.fecha_entrega,
      estado: data.estado,
      precioUnitario: data.precio_unitario,
      precioTotal: data.precio_total,
      tiempoEstimado: data.tiempo_estimado,
      fechaCreacion: data.fecha_creacion,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      asignadoAlCalendario: data.asignado_al_calendario,
      fechaAsignadaCalendario: data.fecha_asignada_calendario,
      fecha: data.fecha_entrega,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error al actualizar pedido interno:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un pedido interno
 */
export async function deletePedidoInterno(id) {
  try {
    const { error } = await supabase
      .from('pedidos_internos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('Error al eliminar pedido interno:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener pedidos internos por rango de fechas (útil para el calendario)
 */
export async function getPedidosInternosByDateRange(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('pedidos_internos')
      .select('*')
      .gte('fecha_entrega', startDate)
      .lte('fecha_entrega', endDate)
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;
    
    // Mapear campos
    const mappedData = (data || []).map(pedido => ({
      id: pedido.id,
      nroPedido: pedido.nro_pedido || null,
      cliente: pedido.cliente,
      producto: pedido.producto,
      cantidad: pedido.cantidad,
      fechaEntrega: pedido.fecha_entrega,
      estado: pedido.estado,
      precioUnitario: pedido.precio_unitario,
      precioTotal: pedido.precio_total,
      tiempoEstimado: pedido.tiempo_estimado,
      fechaCreacion: pedido.fecha_creacion,
      createdAt: pedido.created_at,
      updatedAt: pedido.updated_at,
      asignadoAlCalendario: pedido.asignado_al_calendario || false,
      fechaAsignadaCalendario: pedido.fecha_asignada_calendario || null,
      fecha: pedido.fecha_entrega,
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error al obtener pedidos por rango de fechas:', error);
    return { data: null, error: error.message };
  }
}
