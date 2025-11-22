// ============================================
// SUPABASE PRODUCTOS - CRUD OPERATIONS
// Funciones para gestión de productos
// ============================================

import supabase from './supabaseClient';

/**
 * Obtener todos los productos
 */
export async function getAllProductos() {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    // console.log('✅ Productos cargados desde Supabase:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Mapear producto de snake_case a camelCase
 */
export function mapProductoToFrontend(p) {
  if (!p) return null;
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    medidas: p.medidas,
    tiempoUnitario: p.tiempo_unitario || '00:00:30',
    publicado: p.publicado,
    hiddenInProductos: p.hidden_in_productos,
    unidadesPorPlaca: p.unidades_por_placa,
    usoPlacas: p.uso_placas,
    costoPlaca: p.costo_placa,
    costoMaterial: p.costo_material,
    imagen: (p.imagenes_urls && p.imagenes_urls.length > 0) ? p.imagenes_urls[0] : '',
    imagenes: p.imagenes_urls || [],
    materialId: p.material_id,
    material: p.material,
    margenMaterial: p.margen_material || 0,
    precioUnitario: p.precio_unitario || 0,
    precioPromos: p.precio_promos || 0,
    unidades: p.unidades || 1,
    stock: p.stock || 0,
    ensamble: p.ensamble || 'Sin ensamble',
    active: p.active !== false,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

/**
 * Obtener un producto por ID
 */
export async function getProductoById(id) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener solo productos publicados (para catálogo público)
 */
export async function getProductosPublicados() {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('publicado', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    // console.log('✅ Productos publicados cargados desde Supabase:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener productos publicados:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener productos publicados mapeados para el calendario
 */
export async function getProductosPublicadosParaCalendario() {
  try {
    const { data, error } = await getProductosPublicados();
    if (error) throw error;
    
    // Mapear campos de snake_case a camelCase
    const mappedData = (data || []).map(p => mapProductoToFrontend(p));
    
    // console.log('✅ Productos mapeados para calendario:', mappedData?.length || 0);
    return { data: mappedData, error: null };
  } catch (error) {
    console.error('❌ Error al obtener productos para calendario:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo producto
 */
export async function createProducto(producto) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert([{
        nombre: producto.nombre,
        categoria: producto.categoria,
        tipo: producto.tipo,
        medidas: producto.medidas,
        tiempo_unitario: producto.tiempoUnitario,
        publicado: producto.publicado || false,
        hidden_in_productos: producto.hiddenInProductos || false,
        unidades_por_placa: producto.unidadesPorPlaca,
        uso_placas: producto.usoPlacas,
        costo_placa: producto.costoPlaca,
        costo_material: producto.costoMaterial,
        // Usar `imagenes_urls` como campo fuente de verdad.
        imagenes_urls: producto.imagenes || (producto.imagen ? [producto.imagen] : [])
      }])
      .select()
      .single();

    if (error) throw error;
    // console.log('✅ Producto creado en Supabase:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un producto
 */
export async function updateProducto(id, productoUpdate) {
  try {
    const updateData = {};
    
    // Mapear campos camelCase a snake_case
    if (productoUpdate.nombre !== undefined) updateData.nombre = productoUpdate.nombre;
    if (productoUpdate.categoria !== undefined) updateData.categoria = productoUpdate.categoria;
    if (productoUpdate.tipo !== undefined) updateData.tipo = productoUpdate.tipo;
    if (productoUpdate.medidas !== undefined) updateData.medidas = productoUpdate.medidas;
    if (productoUpdate.tiempoUnitario !== undefined) updateData.tiempo_unitario = productoUpdate.tiempoUnitario;
    if (productoUpdate.publicado !== undefined) updateData.publicado = productoUpdate.publicado;
    if (productoUpdate.hiddenInProductos !== undefined) updateData.hidden_in_productos = productoUpdate.hiddenInProductos;
    if (productoUpdate.unidadesPorPlaca !== undefined) updateData.unidades_por_placa = productoUpdate.unidadesPorPlaca;
    if (productoUpdate.usoPlacas !== undefined) updateData.uso_placas = productoUpdate.usoPlacas;
    if (productoUpdate.costoPlaca !== undefined) updateData.costo_placa = productoUpdate.costoPlaca;
    if (productoUpdate.costoMaterial !== undefined) updateData.costo_material = productoUpdate.costoMaterial;
    if (productoUpdate.imagen !== undefined) updateData.imagenes_urls = Array.isArray(productoUpdate.imagen) ? productoUpdate.imagen : [productoUpdate.imagen];
    if (productoUpdate.imagenes !== undefined) updateData.imagenes_urls = productoUpdate.imagenes;

    const { data, error } = await supabase
      .from('productos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    // console.log('✅ Producto actualizado en Supabase:', id);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un producto
 */
export async function deleteProducto(id) {
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    // console.log('✅ Producto eliminado de Supabase:', id);
    return { error: null };
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    return { error: error.message };
  }
}

/**
 * Buscar productos por nombre o categoría
 */
export async function searchProductos(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .or(`nombre.ilike.%${searchTerm}%,categoria.ilike.%${searchTerm}%`)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al buscar productos:', error);
    return { data: null, error: error.message };
  }
}
