// ============================================
// SUPABASE PRODUCTOS - CRUD OPERATIONS
// Funciones para gestión de productos
// ============================================

import supabase, { isSupabaseReady } from './supabaseClient';

// ── Module-level helpers ─────────────────────────────────────────────────────

/**
 * Parse a material_id value: accepts numbers, numeric strings, or Date.now()
 * timestamps. Returns null for empty/invalid values.
 */
function parseMaterialId(value) {
  if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  const str = String(value).trim();
  if (str === '') return null;
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? null : parsed;
}

// ────────────────────────────────────────────────────────────────────────────

/**
 * Obtener todos los productos (solo admins)
 */
export async function getAllProductos() {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase not configured' }
    }
    const cols = ['id','nombre','categoria','tipo','precio_unitario','imagenes_urls','publicado','created_at'].join(',');
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(cols)
        .order('created_at', { ascending: false })
        .range(0, 999);
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 999);
      if (error) return { data: null, error: error.message };
      return { data, error: null };
    }
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Obtener productos publicados (público)
 */
export async function getProductosPublicados() {
  try {
    if (!isSupabaseReady()) {
      try {
        const resp = await fetch('/api/productos?page=1&per_page=200')
        if (!resp.ok) throw new Error('Server API /api/productos returned ' + resp.status)
        const body = await resp.json()
        const productos = body && body.productos ? body.productos : []
        // aplicar filtros equivalentes: publicado = true && hidden_in_productos = false
        const filtered = (productos || []).filter(p => p.publicado && !p.hidden_in_productos)
        return { data: filtered, error: null }
      } catch (err) {
        return { data: null, error: err.message || String(err) }
      }
    }
    const cols = ['id','nombre','categoria','tipo','precio_unitario','imagenes_urls','publicado'].join(',');
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(cols)
        .eq('publicado', true)
        .eq('hidden_in_productos', false)
        .order('created_at', { ascending: false })
        .range(0, 199);
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('publicado', true)
        .eq('hidden_in_productos', false)
        .order('created_at', { ascending: false })
        .range(0, 199);
      if (error) return { data: null, error: error.message };
      return { data, error: null };
    }
  } catch (error) {
    // Intentar fallback a la API server-side para evitar que la página quede vacía
    try {
      const resp = await fetch('/api/productos?page=1&per_page=200')
      if (!resp.ok) throw new Error('Server API /api/productos returned ' + resp.status)
      const body = await resp.json()
      const productos = body && body.productos ? body.productos : []
      const filtered = (productos || []).filter(p => p.publicado && !p.hidden_in_productos)
      return { data: filtered, error: null }
    } catch (err) {
      return { data: null, error: error.message || String(error) }
    }
  }
}

/**
 * Obtener un producto por ID
 */
export async function getProductoById(id) {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase not configured' }
    }
    const cols = ['id','nombre','categoria','tipo','precio_unitario','imagenes_urls','publicado','dimensiones','material','created_at','updated_at'].join(',');
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(cols)
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return { data: null, error: error.message };
      return { data, error: null };
    }
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Generar ID aleatorio de 4 dígitos único
 */
async function generateRandomId() {
  let attempts = 0;
  const maxAttempts = 100;
  
    while (attempts < maxAttempts) {
    // Generar número aleatorio entre 1000 y 9999
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    
    // Verificar si el ID ya existe
    const { data, error } = await supabase
      .from('productos')
      .select('id')
      .eq('id', randomId)
      .single();
    
    // Si no existe (error porque no se encontró), usamos este ID
    if (error && error.code === 'PGRST116') {
      return randomId;
    }
    
    attempts++;
  }
  
  // Si después de 100 intentos no encontramos un ID único, lanzar error
  throw new Error('No se pudo generar un ID único después de múltiples intentos');
}

/**
 * Crear un nuevo producto
 */
export async function createProducto(producto) {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase not configured' }
    }
    // Función helper para convertir valores vacíos a null o número válido
    const parseIntOrNull = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseInt(value);
      return isNaN(parsed) ? null : parsed;
    };

    const parseFloatOrZero = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Generar ID aleatorio de 4 dígitos
    const randomId = await generateRandomId();

    // Construir payload compatible con el schema actual (compatibilidad hacia atrás):
    // - La BBDD canonical en repo usa `imagen` (URL simple) y `stock_actual`.
    // - Mantenemos valores derivados (material como string) para evitar escribir columnas inexistentes.
    const productData = {
      id: randomId,
      nombre: producto.nombre,
      categoria: producto.categoria,
      tipo: producto.tipo || 'Stock',
      medidas: producto.medidas,
      tiempo_unitario: producto.tiempoUnitario || producto.tiempo_unitario || '00:00:30',
      publicado: producto.publicado || false,
      hidden_in_productos: producto.hiddenInProductos || producto.hidden_in_productos || false,
      unidades_por_placa: parseIntOrNull(producto.unidadesPorPlaca || producto.unidades_por_placa) || 1,
      uso_placas: parseIntOrNull(producto.usoPlacas || producto.uso_placas) || 0,
      costo_placa: parseFloatOrZero(producto.costoPlaca || producto.costo_placa),
      // Compatibilidad: la BBDD puede tener `imagen` (url única) o `imagenes_urls` (array).
      // Guardar siempre `imagen` con la primera imagen disponible (si existe) para maximizar compatibilidad.
      imagen: (producto.imagenes && producto.imagenes.length > 0)
        ? producto.imagenes[0]
        : (producto.imagen || null),
      // Guardar material como string (campo presente en schema.sql). Evitar escribir material_id por defecto.
      material: producto.material || '',
      margen_material: parseFloatOrZero(producto.margenMaterial || producto.margen_material),
      precio_unitario: parseFloatOrZero(producto.precioUnitario || producto.precio_unitario),
      precio_promos: parseFloatOrZero(producto.precioPromos || producto.precio_promos),
      unidades: parseIntOrNull(producto.unidades) || 1,
      // Usar stock_actual que existe en schema.sql
      stock_actual: parseIntOrNull(producto.stock) || 0,
      ensamble: producto.ensamble || 'Sin ensamble',
      active: producto.active !== undefined ? producto.active : true,
      description: producto.description || ''
    };

    const { data, error } = await supabase
      .from('productos')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un producto existente
 */
export async function updateProducto(id, producto) {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase not configured' }
    }
    const updateData = {};
    
    // Mapear campos camelCase a snake_case
    if (producto.nombre !== undefined) updateData.nombre = producto.nombre;
    if (producto.categoria !== undefined) updateData.categoria = producto.categoria;
    if (producto.tipo !== undefined) updateData.tipo = producto.tipo;
    if (producto.medidas !== undefined) updateData.medidas = producto.medidas;
    if (producto.tiempoUnitario !== undefined) updateData.tiempo_unitario = producto.tiempoUnitario;
    if (producto.tiempo_unitario !== undefined) updateData.tiempo_unitario = producto.tiempo_unitario;
    if (producto.publicado !== undefined) updateData.publicado = producto.publicado;
    if (producto.hiddenInProductos !== undefined) updateData.hidden_in_productos = producto.hiddenInProductos;
    if (producto.hidden_in_productos !== undefined) updateData.hidden_in_productos = producto.hidden_in_productos;
    if (producto.unidadesPorPlaca !== undefined) updateData.unidades_por_placa = producto.unidadesPorPlaca;
    if (producto.unidades_por_placa !== undefined) updateData.unidades_por_placa = producto.unidades_por_placa;
    if (producto.usoPlacas !== undefined) updateData.uso_placas = producto.usoPlacas;
    if (producto.uso_placas !== undefined) updateData.uso_placas = producto.uso_placas;
    if (producto.costoPlaca !== undefined) updateData.costo_placa = producto.costoPlaca;
    if (producto.costo_placa !== undefined) updateData.costo_placa = producto.costo_placa;
    // costo_material: NO se actualiza, se calcula automáticamente como costoPlaca / unidadesPorPlaca
    // Actualizar `imagen` / `imagenes_urls` desde cualquiera de las formas aceptadas.
    // Preferimos escribir `imagen` (cadena) para compatibilidad con schema.sql; si se proporcionan múltiples
    // imágenes, también intentamos escribir `imagenes_urls` cuando sea posible.
    if (producto.imagenes !== undefined) {
      // Si viene un array, usar la primera como `imagen` y mantener el array en `imagenes_urls` si deseado
      if (Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
        updateData.imagen = producto.imagenes[0];
        updateData.imagenes_urls = producto.imagenes;
      } else if (typeof producto.imagenes === 'string') {
        updateData.imagen = producto.imagenes;
      }
    } else if (producto.imagen !== undefined) {
      if (Array.isArray(producto.imagen) && producto.imagen.length > 0) {
        updateData.imagen = producto.imagen[0];
        updateData.imagenes_urls = producto.imagen;
      } else if (typeof producto.imagen === 'string') {
        updateData.imagen = producto.imagen;
      }
    }
    
    // Nuevos campos - con parseo especial para material_id
    if (producto.materialId !== undefined) updateData.material_id = parseMaterialId(producto.materialId);
    if (producto.material_id !== undefined) updateData.material_id = parseMaterialId(producto.material_id);
    if (producto.material !== undefined) updateData.material = producto.material;
    if (producto.margenMaterial !== undefined) updateData.margen_material = producto.margenMaterial;
    if (producto.margen_material !== undefined) updateData.margen_material = producto.margen_material;
    if (producto.precioUnitario !== undefined) updateData.precio_unitario = producto.precioUnitario;
    if (producto.precio_unitario !== undefined) updateData.precio_unitario = producto.precio_unitario;
    if (producto.precioPromos !== undefined) updateData.precio_promos = producto.precioPromos;
    if (producto.precio_promos !== undefined) updateData.precio_promos = producto.precio_promos;
    if (producto.unidades !== undefined) updateData.unidades = producto.unidades;
    // Compatibilidad con schema: escribir stock_actual si llega stock
    if (producto.stock !== undefined) updateData.stock_actual = producto.stock;
    if (producto.ensamble !== undefined) updateData.ensamble = producto.ensamble;
    if (producto.active !== undefined) updateData.active = producto.active;
    if (producto.description !== undefined) updateData.description = producto.description;

    const { data, error } = await supabase
      .from('productos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un producto
 */
export async function deleteProducto(id) {
  try {
    if (!isSupabaseReady()) {
      return { error: 'Supabase not configured' }
    }
    // 1) Revisar si existen referencias en pedidos_catalogo_items
    const { data: items, error: itemsErr } = await supabase
      .from('pedidos_catalogo_items')
      .select('id, pedido_catalogo_id, producto_nombre, producto_precio, pedidos_catalogo(estado)')
      .eq('producto_id', id);

    if (itemsErr) {
      // Fallback: intentar borrado directo y retornar error si falla
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    }

    // Si no hay referencias, borrar físicamente
    if (!items || items.length === 0) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    }

    // Separar items según estado del pedido
    const toKeep = []; // items pertenecientes a pedidos entregados
    const toRemove = []; // items pertenecientes a pedidos NO entregados

    for (const it of items) {
      const estado = (it.pedidos_catalogo && it.pedidos_catalogo[0] && it.pedidos_catalogo[0].estado) || null;
      if (String(estado).toLowerCase() === 'entregado') {
        toKeep.push(it.id);
      } else {
        toRemove.push(it.id);
      }
    }

    // 2) Eliminar items que pertenecen a pedidos NO entregados (permitir borrar referencias temporales)
    if (toRemove.length > 0) {
      const { error: delItemsErr } = await supabase
        .from('pedidos_catalogo_items')
        .delete()
        .in('id', toRemove);

      if (delItemsErr) {
        throw delItemsErr;
      }
    }

    // 3) Para items de pedidos entregados: desvincular producto_id para conservar el registro histórico
    //    y asegurarnos de que producto_nombre/producto_precio estén poblados.
    if (toKeep.length > 0) {
      // Obtener datos actuales del producto para rellenar nombre/precio si es necesario
      const { data: prod, error: prodErr } = await supabase.from('productos').select('*').eq('id', id).single();
      if (prodErr) {
        throw prodErr;
      }

      const updatePayload = {
        producto_nombre: prod.nombre || undefined,
        producto_precio: prod.precio_unitario !== undefined ? prod.precio_unitario : undefined,
        producto_id: null
      };

      const { error: updateItemsErr } = await supabase
        .from('pedidos_catalogo_items')
        .update(updatePayload)
        .in('id', toKeep);

      if (updateItemsErr) {
        throw updateItemsErr;
      }
    }

    // 4) Ahora que no hay referencias FK activas, borrar el producto físicamente
    const { error: finalDelErr } = await supabase.from('productos').delete().eq('id', id);
    if (finalDelErr) {
      // Si por alguna razón falla, loguear y devolver error
      throw finalDelErr;
    }

    return { error: null, deleted: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Toggle visibilidad de producto (publicado)
 */
export async function toggleProductoPublicado(id, publicado) {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase not configured' }
    }
    const { data, error } = await supabase
      .from('productos')
      .update({ publicado })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Subir imagen de producto a Storage
 */
export async function uploadProductoImagen(file, productoId) {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase not configured' }
    }
    // Comprimir la imagen antes de subir (máx 1200px, quality 0.82 → ~80-180KB típico)
    let fileToUpload = file
    try {
      if (typeof window !== 'undefined') {
        const { compressImage } = await import('./catalogUtils')
        const blob = await compressImage(file, 1200, 0.82)
        if (blob && blob.size) {
          fileToUpload = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        }
      }
    } catch (compressErr) {
    }

    const fileName = `${productoId}-${Date.now()}.jpg`;
    const filePath = `productos/${fileName}`;

    const { data, error } = await supabase.storage
      .from('productos-imagenes')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('productos-imagenes')
      .getPublicUrl(filePath);

    return { data: { path: filePath, url: urlData.publicUrl }, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar imagen de producto del Storage
 */
export async function deleteProductoImagen(imagePath) {
  try {
    if (!isSupabaseReady()) {
      return { error: 'Supabase not configured' }
    }
    const { error } = await supabase.storage
      .from('productos-imagenes')
      .remove([imagePath]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}
