// ============================================
// SUPABASE PRODUCTOS - CRUD OPERATIONS
// Funciones para gestión de productos
// ============================================

import supabase from './supabaseClient.js';

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
    console.log('✅ Productos cargados desde Supabase:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return { data: null, error: error.message };
  }
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
    console.log('✅ Productos publicados cargados desde Supabase:', data?.length || 0);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener productos publicados:', error);
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
        imagen_url: producto.imagen || null,
      }])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Producto creado en Supabase:', data.id);
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
    if (productoUpdate.imagen !== undefined) updateData.imagen_url = productoUpdate.imagen;

    const { data, error } = await supabase
      .from('productos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Producto actualizado en Supabase:', id);
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
    console.log('✅ Producto eliminado de Supabase:', id);
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

/**
 * Mapear producto de Supabase (snake_case) a frontend (camelCase)
 */
export function mapProductoToFrontend(productoDB) {
  if (!productoDB) return null;
  
  return {
    id: productoDB.id,
    nombre: productoDB.nombre,
    categoria: productoDB.categoria,
    tipo: productoDB.tipo,
    medidas: productoDB.medidas,
    tiempoUnitario: productoDB.tiempo_unitario,
    publicado: productoDB.publicado,
    hiddenInProductos: productoDB.hidden_in_productos,
    unidadesPorPlaca: productoDB.unidades_por_placa,
    usoPlacas: productoDB.uso_placas,
    costoPlaca: productoDB.costo_placa,
    costoMaterial: productoDB.costo_material,
    imagen: productoDB.imagen_url,
    createdAt: productoDB.created_at,
    updatedAt: productoDB.updated_at
  };
}
