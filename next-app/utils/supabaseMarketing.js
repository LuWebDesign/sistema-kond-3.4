// ============================================
// SUPABASE MARKETING - CRUD OPERATIONS
// Funciones para gestión de promociones y cupones
// ============================================

import supabase from './supabaseClient';

// ============================================
// PROMOCIONES
// ============================================

/**
 * Obtener todas las promociones
 */
export async function getPromociones() {
  try {
    const { data, error } = await supabase
      .from('promociones')
      .select('*')
      .order('prioridad', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener promociones:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener promociones activas (público)
 */
export async function getPromocionesActivas() {
  try {
    const { data, error } = await supabase
      .from('promociones')
      .select('*')
      .eq('activo', true)
      .order('prioridad', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener promociones activas:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear una nueva promoción
 */
export async function createPromocion(promocion) {
  try {
    const promoData = {
      nombre: promocion.nombre,
      tipo: promocion.tipo,
      valor: promocion.valor ? parseFloat(promocion.valor) : null,
      aplica_a: promocion.aplicaA || promocion.aplica_a,
      categoria: promocion.categoria || null,
      producto_id: promocion.productoId || promocion.producto_id || null,
      fecha_inicio: promocion.fechaInicio || promocion.fecha_inicio || null,
      fecha_fin: promocion.fechaFin || promocion.fecha_fin || null,
      activo: promocion.activo !== undefined ? promocion.activo : true,
      prioridad: promocion.prioridad || 0,
      badge_texto: promocion.badgeTexto || promocion.badge_texto || null,
      badge_color: promocion.badgeColor || promocion.badge_color || null,
      badge_text_color: promocion.badgeTextColor || promocion.badge_text_color || null,
      descuento_porcentaje: promocion.descuentoPorcentaje || promocion.descuento_porcentaje ? parseFloat(promocion.descuentoPorcentaje || promocion.descuento_porcentaje) : null,
      descuento_monto: promocion.descuentoMonto || promocion.descuento_monto ? parseFloat(promocion.descuentoMonto || promocion.descuento_monto) : null,
      precio_especial: promocion.precioEspecial || promocion.precio_especial ? parseFloat(promocion.precioEspecial || promocion.precio_especial) : null
    };

    const { data, error } = await supabase
      .from('promociones')
      .insert([promoData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al crear promoción:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar una promoción
 */
export async function updatePromocion(id, promocion) {
  try {
    const updateData = {};
    
    if (promocion.nombre !== undefined) updateData.nombre = promocion.nombre;
    if (promocion.tipo !== undefined) updateData.tipo = promocion.tipo;
    if (promocion.valor !== undefined) updateData.valor = parseFloat(promocion.valor);
    if (promocion.aplicaA !== undefined) updateData.aplica_a = promocion.aplicaA;
    if (promocion.aplica_a !== undefined) updateData.aplica_a = promocion.aplica_a;
    if (promocion.categoria !== undefined) updateData.categoria = promocion.categoria;
    if (promocion.productoId !== undefined) updateData.producto_id = promocion.productoId;
    if (promocion.producto_id !== undefined) updateData.producto_id = promocion.producto_id;
    if (promocion.fechaInicio !== undefined) updateData.fecha_inicio = promocion.fechaInicio;
    if (promocion.fecha_inicio !== undefined) updateData.fecha_inicio = promocion.fecha_inicio;
    if (promocion.fechaFin !== undefined) updateData.fecha_fin = promocion.fechaFin;
    if (promocion.fecha_fin !== undefined) updateData.fecha_fin = promocion.fecha_fin;
    if (promocion.activo !== undefined) updateData.activo = promocion.activo;
    if (promocion.prioridad !== undefined) updateData.prioridad = promocion.prioridad;
    if (promocion.badgeTexto !== undefined) updateData.badge_texto = promocion.badgeTexto;
    if (promocion.badge_texto !== undefined) updateData.badge_texto = promocion.badge_texto;
    if (promocion.badgeColor !== undefined) updateData.badge_color = promocion.badgeColor;
    if (promocion.badge_color !== undefined) updateData.badge_color = promocion.badge_color;
    if (promocion.badgeTextColor !== undefined) updateData.badge_text_color = promocion.badgeTextColor;
    if (promocion.badge_text_color !== undefined) updateData.badge_text_color = promocion.badge_text_color;
    if (promocion.descuentoPorcentaje !== undefined) updateData.descuento_porcentaje = parseFloat(promocion.descuentoPorcentaje);
    if (promocion.descuento_porcentaje !== undefined) updateData.descuento_porcentaje = parseFloat(promocion.descuento_porcentaje);
    if (promocion.descuentoMonto !== undefined) updateData.descuento_monto = parseFloat(promocion.descuentoMonto);
    if (promocion.descuento_monto !== undefined) updateData.descuento_monto = parseFloat(promocion.descuento_monto);
    if (promocion.precioEspecial !== undefined) updateData.precio_especial = parseFloat(promocion.precioEspecial);
    if (promocion.precio_especial !== undefined) updateData.precio_especial = parseFloat(promocion.precio_especial);

    const { data, error } = await supabase
      .from('promociones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar promoción:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar una promoción
 */
export async function deletePromocion(id) {
  try {
    const { error } = await supabase
      .from('promociones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar promoción:', error);
    return { error: error.message };
  }
}

// ============================================
// CUPONES
// ============================================

/**
 * Obtener todos los cupones
 */
export async function getCupones() {
  try {
    const { data, error } = await supabase
      .from('cupones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener cupones:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener cupones activos (público)
 */
export async function getCuponesActivos() {
  try {
    const { data, error } = await supabase
      .from('cupones')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false});

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener cupones activos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Validar un cupón por código (público)
 */
export async function validateCupon(codigo) {
  try {
    const { data, error } = await supabase
      .from('cupones')
      .select('*')
      .eq('codigo', codigo.toUpperCase())
      .eq('activo', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al validar cupón:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo cupón
 */
export async function createCupon(cupon) {
  try {
    const cuponData = {
      codigo: cupon.codigo.toUpperCase(),
      nombre: cupon.nombre,
      tipo: cupon.tipo,
      valor: parseFloat(cupon.valor),
      monto_minimo: cupon.montoMinimo || cupon.monto_minimo ? parseFloat(cupon.montoMinimo || cupon.monto_minimo) : 0,
      usos_maximos: cupon.usosMaximos || cupon.usos_maximos || null,
      usos_actuales: 0,
      fecha_inicio: cupon.fechaInicio || cupon.fecha_inicio || null,
      fecha_expiracion: cupon.fechaExpiracion || cupon.fecha_expiracion || null,
      activo: cupon.activo !== undefined ? cupon.activo : true
    };

    const { data, error } = await supabase
      .from('cupones')
      .insert([cuponData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al crear cupón:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un cupón
 */
export async function updateCupon(id, cupon) {
  try {
    const updateData = {};
    
    if (cupon.codigo !== undefined) updateData.codigo = cupon.codigo.toUpperCase();
    if (cupon.nombre !== undefined) updateData.nombre = cupon.nombre;
    if (cupon.tipo !== undefined) updateData.tipo = cupon.tipo;
    if (cupon.valor !== undefined) updateData.valor = parseFloat(cupon.valor);
    if (cupon.montoMinimo !== undefined) updateData.monto_minimo = parseFloat(cupon.montoMinimo);
    if (cupon.monto_minimo !== undefined) updateData.monto_minimo = parseFloat(cupon.monto_minimo);
    if (cupon.usosMaximos !== undefined) updateData.usos_maximos = cupon.usosMaximos;
    if (cupon.usos_maximos !== undefined) updateData.usos_maximos = cupon.usos_maximos;
    if (cupon.usosActuales !== undefined) updateData.usos_actuales = cupon.usosActuales;
    if (cupon.usos_actuales !== undefined) updateData.usos_actuales = cupon.usos_actuales;
    if (cupon.fechaInicio !== undefined) updateData.fecha_inicio = cupon.fechaInicio;
    if (cupon.fecha_inicio !== undefined) updateData.fecha_inicio = cupon.fecha_inicio;
    if (cupon.fechaExpiracion !== undefined) updateData.fecha_expiracion = cupon.fechaExpiracion;
    if (cupon.fecha_expiracion !== undefined) updateData.fecha_expiracion = cupon.fecha_expiracion;
    if (cupon.activo !== undefined) updateData.activo = cupon.activo;

    const { data, error } = await supabase
      .from('cupones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar cupón:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Incrementar uso de un cupón
 */
export async function incrementarUsoCupon(id) {
  try {
    // Obtener el cupón actual
    const { data: cupon, error: getError } = await supabase
      .from('cupones')
      .select('usos_actuales')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    // Incrementar el contador
    const { data, error } = await supabase
      .from('cupones')
      .update({ usos_actuales: (cupon.usos_actuales || 0) + 1 })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al incrementar uso de cupón:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un cupón
 */
export async function deleteCupon(id) {
  try {
    const { error } = await supabase
      .from('cupones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar cupón:', error);
    return { error: error.message };
  }
}
