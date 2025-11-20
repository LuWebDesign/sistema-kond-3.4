// ============================================
// SUPABASE PEDIDOS CATÁLOGO - CRUD OPERATIONS
// Funciones para gestión de pedidos del catálogo público
// ============================================

import supabase from './supabaseClient';

/**
 * Generar ID aleatorio de 4 dígitos único para pedidos catálogo
 */
async function generateRandomPedidoId() {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generar número aleatorio entre 1000 y 9999
    const randomId = Math.floor(Math.random() * 9000) + 1000;

    try {
      // Verificar si el ID ya existe
      const { data, error } = await supabase
        .from('pedidos_catalogo')
        .select('id')
        .eq('id', randomId)
        .limit(1);

      // Si no hay error y no hay datos, el ID está disponible
      if (!error && (!data || data.length === 0)) {
        return randomId;
      }

      // Si hay datos, el ID ya existe, intentar otro
      if (data && data.length > 0) {
        attempts++;
        continue;
      }

      // Si hay error, intentar otro ID (podría ser problema de permisos)
      console.warn(`Error verificando ID ${randomId}:`, error);
      attempts++;

    } catch (err) {
      console.warn(`Error verificando ID ${randomId}:`, err);
      attempts++;
    }
  }

  // Si después de 100 intentos no encontramos un ID único, lanzar error
  throw new Error('No se pudo generar un ID único para el pedido después de múltiples intentos');
}

/**
 * Obtener todos los pedidos catálogo (solo admins)
 */
export async function getAllPedidosCatalogo() {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener pedidos catálogo:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener pedidos catálogo mapeados para el calendario
 * (convierte snake_case a camelCase)
 */
export async function getPedidosCatalogoParaCalendario() {
  try {
    const { data, error } = await getAllPedidosCatalogo();
    if (error) throw error;
    
    // Mapear campos de snake_case a camelCase para compatibilidad con calendario
    const mappedData = (data || []).map(pedido => ({
      id: pedido.id,
      cliente: {
        nombre: pedido.cliente_nombre,
        apellido: pedido.cliente_apellido,
        telefono: pedido.cliente_telefono,
        email: pedido.cliente_email,
        direccion: pedido.cliente_direccion,
      },
      items: (pedido.items || []).map(item => ({
        id: item.id,
        pedidoCatalogoId: item.pedido_catalogo_id,
        idProducto: item.producto_id,
        name: item.producto_nombre,
        price: item.producto_precio,
        quantity: item.cantidad,
        measures: item.medidas,
        imagen: item.producto_imagen,
      })),
      productos: (pedido.items || []).map(item => ({
        id: item.id,
        pedidoCatalogoId: item.pedido_catalogo_id,
        productId: item.producto_id,
        idProducto: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        imagen: item.producto_imagen,
        measures: item.medidas,
      })),
      metodoPago: pedido.metodo_pago,
      estadoPago: pedido.estado_pago,
      estado: pedido.estado || 'pendiente',
      comprobante: pedido.comprobante_url,
      comprobanteOmitido: pedido.comprobante_omitido || false,
      fechaSolicitudEntrega: pedido.fecha_solicitud_entrega,
      fechaCreacion: pedido.fecha_creacion,
      fechaEntregaCalendario: pedido.fecha_entrega_calendario,
      fechaProduccionCalendario: pedido.fecha_produccion_calendario,
      asignadoAlCalendario: pedido.asignado_al_calendario || false,
      total: pedido.total,
      createdAt: pedido.created_at,
      updatedAt: pedido.updated_at,
      // Compatibilidad con código antiguo
      fecha: pedido.fecha_creacion,
    }));
    
    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error al obtener pedidos catálogo para calendario:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener un pedido catálogo por ID
 */
export async function getPedidoCatalogoById(id) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
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
    // Validaciones básicas
    if (!pedido || !pedido.cliente || !items || items.length === 0) {
      throw new Error('Datos del pedido incompletos');
    }
    
    if (!pedido.cliente.nombre || !pedido.cliente.telefono) {
      throw new Error('Nombre y teléfono del cliente son requeridos');
    }
    
    if (!pedido.metodoPago || !pedido.total || pedido.total <= 0) {
      throw new Error('Método de pago y total válido son requeridos');
    }

    // Generar ID aleatorio de 4 dígitos
    const randomId = await generateRandomPedidoId();
    
    // 1. Crear el pedido principal
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos_catalogo')
      .insert([{
        id: randomId,
        cliente_nombre: pedido.cliente.nombre || '',
        cliente_apellido: pedido.cliente.apellido || '',
        cliente_telefono: pedido.cliente.telefono || '',
        cliente_email: pedido.cliente.email || '',
        cliente_direccion: pedido.cliente.direccion || '',
        metodo_pago: pedido.metodoPago,
        estado_pago: pedido.estadoPago || 'sin_seña',
        comprobante_url: pedido.comprobante || null,
        comprobante_omitido: pedido.comprobanteOmitido || false,
        fecha_solicitud_entrega: pedido.fechaSolicitudEntrega || null,
        total: Number(pedido.total) || 0,
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
      producto_imagen: item.imagen || item.image || null,
    }));

    const { data: itemsInserted, error: itemsError } = await supabase
      .from('pedidos_catalogo_items')
      .insert(itemsData)
      .select();

    if (itemsError) throw itemsError;

    // NOTA: Registro automático de movimientos financieros deshabilitado temporalmente
    // Se reactivará cuando se reconstruya el módulo de finanzas
    // console.log('💰 Pedido creado sin registro financiero automático (módulo deshabilitado)');

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
 * Actualizar monto recibido de un pedido y registrar movimiento financiero
 */
export async function updateMontoRecibido(id, montoRecibido, nuevoEstadoPago) {
  try {
    // 1. Obtener datos actuales del pedido
    const { data: pedidoActual, error: errorGet } = await supabase
      .from('pedidos_catalogo')
      .select('*')
      .eq('id', id)
      .single();

    if (errorGet) throw errorGet;

    // 2. Actualizar monto_recibido y estado_pago en el pedido
    const { data: pedidoActualizado, error: errorUpdate } = await supabase
      .from('pedidos_catalogo')
      .update({ 
        monto_recibido: montoRecibido,
        estado_pago: nuevoEstadoPago 
      })
      .eq('id', id)
      .select()
      .single();

    if (errorUpdate) throw errorUpdate;

    // NOTA: Registro automático de movimientos financieros deshabilitado temporalmente
    // Se reactivará cuando se reconstruya el módulo de finanzas
    // console.log('💰 Monto recibido actualizado sin registro financiero automático (módulo deshabilitado)');

    return { data: pedidoActualizado, error: null };
  } catch (error) {
    console.error('Error al actualizar monto recibido:', error);
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
 */
export async function getPedidosByEstadoPago(estadoPago) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .eq('estado_pago', estadoPago)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al filtrar pedidos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Filtrar pedidos por método de pago
 */
export async function getPedidosByMetodoPago(metodoPago) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .eq('metodo_pago', metodoPago)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al filtrar pedidos por método:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Buscar pedidos por cliente (nombre, teléfono o email)
 */
export async function searchPedidosByCliente(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .or(`cliente_nombre.ilike.%${searchTerm}%,cliente_telefono.ilike.%${searchTerm}%,cliente_email.ilike.%${searchTerm}%`)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al buscar pedidos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener pedidos de un cliente específico por email (vista pública)
 */
export async function getPedidosByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .eq('cliente_email', email)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    // console.log('✅ Pedidos del usuario cargados desde Supabase:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener pedidos del usuario:', error);
    return { data: null, error: error.message };
  }
}
