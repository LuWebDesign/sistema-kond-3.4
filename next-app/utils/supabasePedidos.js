// ============================================
// SUPABASE PEDIDOS CATÁLOGO - CRUD OPERATIONS
// Funciones para gestión de pedidos del catálogo público
// ============================================

import supabase from './supabaseClient';

/**
 * Obtener tombstones locales (IDs de pedidos eliminados localmente)
 */
function getTombstones() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('pedidosCatalogoDeleted') || '[]') || [];
  } catch (e) {
    return [];
  }
}

/**
 * Agregar un pedido al tombstone local
 */
export function addTombstone(pedidoId) {
  if (typeof window === 'undefined') return;
  try {
    const tomb = getTombstones();
    if (!tomb.includes(pedidoId)) {
      tomb.push(pedidoId);
      localStorage.setItem('pedidosCatalogoDeleted', JSON.stringify(tomb));
    }
  } catch (e) {
    console.warn('No se pudo guardar tombstone local:', e);
  }
}

/**
 * Remover un pedido del tombstone local
 */
export function removeTombstone(pedidoId) {
  if (typeof window === 'undefined') return;
  try {
    const tomb = getTombstones();
    const filtered = tomb.filter(id => id !== pedidoId);
    localStorage.setItem('pedidosCatalogoDeleted', JSON.stringify(filtered));
  } catch (e) {
    console.warn('No se pudo limpiar tombstone local:', e);
  }
}

/**
 * Filtrar pedidos aplicando tombstones locales
 */
function applyTombstoneFilter(pedidos) {
  if (!pedidos || !Array.isArray(pedidos)) return pedidos;
  const tombstones = getTombstones();
  if (tombstones.length === 0) return pedidos;
  return pedidos.filter(p => !tombstones.includes(p.id));
}

/**
 * Obtener todos los pedidos catálogo (solo admins)
 * Automáticamente filtra pedidos eliminados localmente
 */
export async function getAllPedidosCatalogo() {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(
          id,
          pedido_catalogo_id,
          producto_id,
          producto_nombre,
          producto_precio,
          cantidad,
          medidas,
          created_at
        )
      `)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    
    // Aplicar filtro de tombstones
    const filtered = applyTombstoneFilter(data);
    
    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error al obtener pedidos catálogo:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener un pedido catálogo por ID
 * Automáticamente filtra pedidos eliminados localmente
 */
export async function getPedidoCatalogoById(id) {
  try {
    // Verificar si está en tombstones antes de consultar
    const tombstones = getTombstones();
    if (tombstones.includes(id)) {
      return { data: null, error: 'Pedido eliminado localmente' };
    }

    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(
          id,
          pedido_catalogo_id,
          producto_id,
          producto_nombre,
          producto_precio,
          cantidad,
          medidas,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener pedido catálogo:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo pedido catálogo (público)
 */
export async function createPedidoCatalogo(pedido, items) {
  try {
    // 1. Crear el pedido principal
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos_catalogo')
      .insert([{
        cliente_nombre: pedido.cliente.nombre,
        cliente_apellido: pedido.cliente.apellido,
        cliente_telefono: pedido.cliente.telefono,
        cliente_email: pedido.cliente.email,
        cliente_direccion: pedido.cliente.direccion,
        metodo_pago: pedido.metodoPago,
        estado_pago: pedido.estadoPago || 'sin_seña',
        comprobante_url: pedido.comprobante || null,
        comprobante_omitido: pedido.comprobanteOmitido || false,
        fecha_solicitud_entrega: pedido.fechaSolicitudEntrega || null,
        total: pedido.total,
      }])
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // 2. Crear los items del pedido
    const itemsData = items.map(item => ({
      pedido_catalogo_id: pedidoData.id,
      producto_id: item.idProducto || item.producto_id,
      producto_nombre: item.name || item.producto_nombre,
      producto_precio: item.price || item.producto_precio,
      cantidad: item.quantity || item.cantidad,
      medidas: item.measures || item.medidas,
    }));

    const { data: itemsInserted, error: itemsError } = await supabase
      .from('pedidos_catalogo_items')
      .insert(itemsData)
      .select();

    if (itemsError) throw itemsError;

    return { 
      data: { 
        pedido: pedidoData, 
        items: itemsInserted 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error al crear pedido catálogo:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un pedido catálogo (solo admins)
 */
export async function updatePedidoCatalogo(id, pedidoUpdate) {
  try {
    const updateData = {};
    
    // Mapear campos camelCase a snake_case
    if (pedidoUpdate.cliente?.nombre) updateData.cliente_nombre = pedidoUpdate.cliente.nombre;
    if (pedidoUpdate.cliente?.apellido) updateData.cliente_apellido = pedidoUpdate.cliente.apellido;
    if (pedidoUpdate.cliente?.telefono) updateData.cliente_telefono = pedidoUpdate.cliente.telefono;
    if (pedidoUpdate.cliente?.email) updateData.cliente_email = pedidoUpdate.cliente.email;
    if (pedidoUpdate.cliente?.direccion) updateData.cliente_direccion = pedidoUpdate.cliente.direccion;
    if (pedidoUpdate.metodoPago) updateData.metodo_pago = pedidoUpdate.metodoPago;
    if (pedidoUpdate.estadoPago) updateData.estado_pago = pedidoUpdate.estadoPago;
    if (pedidoUpdate.comprobante !== undefined) updateData.comprobante_url = pedidoUpdate.comprobante;
    if (pedidoUpdate.comprobanteOmitido !== undefined) updateData.comprobante_omitido = pedidoUpdate.comprobanteOmitido;
    if (pedidoUpdate.fechaSolicitudEntrega) updateData.fecha_solicitud_entrega = pedidoUpdate.fechaSolicitudEntrega;
    if (pedidoUpdate.total) updateData.total = pedidoUpdate.total;

    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar pedido catálogo:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar estado de pago de un pedido
 */
export async function updateEstadoPago(id, estadoPago) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .update({ estado_pago: estadoPago })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un pedido catálogo (solo admins)
 * Nota: Los items se eliminan automáticamente por CASCADE
 */
export async function deletePedidoCatalogo(id) {
  try {
    const { error } = await supabase
      .from('pedidos_catalogo')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al eliminar pedido catálogo:', error);
    return { error: error.message };
  }
}

/**
 * Subir comprobante de pago a Storage
 */
export async function uploadComprobante(file, pedidoId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `pedido-${pedidoId}-${Date.now()}.${fileExt}`;
    const filePath = `comprobantes/${fileName}`;

    const { data, error } = await supabase.storage
      .from('comprobantes-pago')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Obtener URL (privada, solo admins pueden acceder)
    const { data: urlData } = supabase.storage
      .from('comprobantes-pago')
      .getPublicUrl(filePath);

    return { data: { path: filePath, url: urlData.publicUrl }, error: null };
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener URL firmada de comprobante (solo admins, 1 hora de validez)
 */
export async function getComprobanteSignedUrl(filePath) {
  try {
    const { data, error } = await supabase.storage
      .from('comprobantes-pago')
      .createSignedUrl(filePath, 3600); // 1 hora

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener URL firmada:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Filtrar pedidos por estado de pago
 * Automáticamente filtra pedidos eliminados localmente
 */
export async function getPedidosByEstadoPago(estadoPago) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(
          id,
          pedido_catalogo_id,
          producto_id,
          producto_nombre,
          producto_precio,
          cantidad,
          medidas,
          created_at
        )
      `)
      .eq('estado_pago', estadoPago)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    
    // Aplicar filtro de tombstones
    const filtered = applyTombstoneFilter(data);
    
    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error al filtrar pedidos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Filtrar pedidos por método de pago
 * Automáticamente filtra pedidos eliminados localmente
 */
export async function getPedidosByMetodoPago(metodoPago) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(
          id,
          pedido_catalogo_id,
          producto_id,
          producto_nombre,
          producto_precio,
          cantidad,
          medidas,
          created_at
        )
      `)
      .eq('metodo_pago', metodoPago)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    
    // Aplicar filtro de tombstones
    const filtered = applyTombstoneFilter(data);
    
    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error al filtrar pedidos por método:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Buscar pedidos por cliente (nombre, teléfono o email)
 * Automáticamente filtra pedidos eliminados localmente
 */
export async function searchPedidosByCliente(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(
          id,
          pedido_catalogo_id,
          producto_id,
          producto_nombre,
          producto_precio,
          cantidad,
          medidas,
          created_at
        )
      `)
      .or(`cliente_nombre.ilike.%${searchTerm}%,cliente_telefono.ilike.%${searchTerm}%,cliente_email.ilike.%${searchTerm}%`)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    
    // Aplicar filtro de tombstones
    const filtered = applyTombstoneFilter(data);
    
    return { data: filtered, error: null };
  } catch (error) {
    console.error('Error al buscar pedidos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener pedidos de un cliente específico por email (vista pública)
 * Automáticamente filtra pedidos eliminados localmente
 */
export async function getPedidosByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(
          id,
          pedido_catalogo_id,
          producto_id,
          producto_nombre,
          producto_precio,
          cantidad,
          medidas,
          created_at
        )
      `)
      .eq('cliente_email', email)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    
    // Aplicar filtro de tombstones
    const filtered = applyTombstoneFilter(data);
    
    console.log('✅ Pedidos del usuario cargados desde Supabase:', filtered?.length || 0);
    return { data: filtered, error: null };
  } catch (error) {
    console.error('❌ Error al obtener pedidos del usuario:', error);
    return { data: null, error: error.message };
  }
}
