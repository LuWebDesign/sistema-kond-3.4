// ============================================
// PRODUCTOS UTILS - Híbrido Supabase + localStorage
// Funciones utilitarias para gestión de productos con fallback
// ============================================

import { 
  getAllProductos, 
  getProductosPublicados,
  createProducto,
  updateProducto,
  deleteProducto 
} from './supabaseProductos.js'

/**
 * Mapear producto de Supabase (snake_case) a formato frontend (camelCase)
 */
export function mapProductoToFrontend(p) {
  if (!p) return null
  
  const unidadesPorPlaca = p.unidades_por_placa || 1
  const costoPlaca = p.costo_placa || 0
  const costoMaterialCalculado = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
  
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    medidas: p.medidas,
    tiempoUnitario: p.tiempo_unitario || '00:00:30',
    active: p.active !== undefined ? p.active : true,
    publicado: p.publicado !== undefined ? p.publicado : false,
    hiddenInProductos: p.hidden_in_productos || false,
    unidadesPorPlaca: unidadesPorPlaca,
    usoPlacas: p.uso_placas || 0,
    costoPlaca: costoPlaca,
    costoMaterial: parseFloat(costoMaterialCalculado.toFixed(2)),
    materialId: p.material_id || '',
    material: p.material || '',
    margenMaterial: p.margen_material || 0,
    precioUnitario: p.precio_unitario || 0,
    precioPromos: p.precio_promos || 0,
    unidades: p.unidades || 1,
    ensamble: p.ensamble || 'Sin ensamble',
    imagen: p.imagen_url || '',
    fechaCreacion: p.created_at || new Date().toISOString()
  }
}

/**
 * Mapear producto de frontend (camelCase) a formato Supabase (snake_case)
 */
export function mapProductoToSupabase(p) {
  if (!p) return null
  
  return {
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    medidas: p.medidas,
    tiempo_unitario: p.tiempoUnitario,
    active: p.active !== undefined ? p.active : true,
    publicado: p.publicado !== undefined ? p.publicado : false,
    hidden_in_productos: p.hiddenInProductos || false,
    unidades_por_placa: p.unidadesPorPlaca,
    uso_placas: p.usoPlacas,
    costo_placa: p.costoPlaca,
    costo_material: p.costoMaterial,
    material_id: p.materialId || null,
    material: p.material || null,
    margen_material: p.margenMaterial || 0,
    precio_unitario: p.precioUnitario || 0,
    precio_promos: p.precioPromos || 0,
    unidades: p.unidades || 1,
    ensamble: p.ensamble || 'Sin ensamble',
    imagen_url: p.imagen || null
  }
}

/**
 * Cargar todos los productos (Supabase primero, localStorage como fallback)
 */
export async function loadAllProductos() {
  try {
    console.log('📦 Cargando productos desde Supabase...')
    const { data, error } = await getAllProductos()
    
    if (error) {
      console.warn('⚠️ Error en Supabase, usando localStorage:', error)
      return loadProductosFromLocalStorage()
    }
    
    if (data && data.length > 0) {
      const productos = data.map(mapProductoToFrontend)
      
      // Sincronizar con localStorage para compatibilidad
      if (typeof window !== 'undefined') {
        localStorage.setItem('productosBase', JSON.stringify(productos))
      }
      
      return productos
    }
    
    // Si Supabase está vacío, intentar con localStorage
    console.log('⚠️ Supabase vacío, usando localStorage')
    return loadProductosFromLocalStorage()
    
  } catch (error) {
    console.error('❌ Error cargando productos:', error)
    return loadProductosFromLocalStorage()
  }
}

/**
 * Cargar solo productos publicados (para catálogo público)
 */
export async function loadProductosPublicados() {
  try {
    console.log('📦 Cargando productos publicados desde Supabase...')
    const { data, error } = await getProductosPublicados()
    
    if (error) {
      console.warn('⚠️ Error en Supabase, usando localStorage:', error)
      return loadProductosFromLocalStorage().filter(p => p.publicado)
    }
    
    if (data && data.length > 0) {
      const productos = data.map(mapProductoToFrontend)
      return productos
    }
    
    // Si Supabase está vacío, intentar con localStorage
    return loadProductosFromLocalStorage().filter(p => p.publicado)
    
  } catch (error) {
    console.error('❌ Error cargando productos publicados:', error)
    return loadProductosFromLocalStorage().filter(p => p.publicado)
  }
}

/**
 * Cargar productos desde localStorage (fallback)
 */
function loadProductosFromLocalStorage() {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem('productosBase')
    if (!stored) return []
    
    const productos = JSON.parse(stored)
    console.log(`📦 ${productos.length} productos cargados desde localStorage`)
    return productos
  } catch (error) {
    console.error('❌ Error leyendo localStorage:', error)
    return []
  }
}

/**
 * Guardar producto (crea o actualiza en Supabase + localStorage)
 */
export async function saveProducto(producto, isUpdate = false) {
  try {
    const productoSupabase = mapProductoToSupabase(producto)
    
    let result
    if (isUpdate && producto.id) {
      console.log(`📝 Actualizando producto ${producto.id} en Supabase...`)
      result = await updateProducto(producto.id, productoSupabase)
    } else {
      console.log('📝 Creando nuevo producto en Supabase...')
      result = await createProducto(productoSupabase)
    }
    
    if (result.error) {
      console.error('❌ Error guardando en Supabase:', result.error)
      // Fallback: guardar solo en localStorage
      return saveProductoToLocalStorage(producto, isUpdate)
    }
    
    console.log('✅ Producto guardado en Supabase')
    
    // Sincronizar con localStorage
    if (typeof window !== 'undefined') {
      const productos = await loadAllProductos()
      localStorage.setItem('productosBase', JSON.stringify(productos))
    }
    
    return { success: true, data: result.data, error: null }
    
  } catch (error) {
    console.error('❌ Error en saveProducto:', error)
    return saveProductoToLocalStorage(producto, isUpdate)
  }
}

/**
 * Eliminar producto (Supabase + localStorage)
 */
export async function removeProducto(id) {
  try {
    console.log(`🗑️ Eliminando producto ${id} de Supabase...`)
    const { error } = await deleteProducto(id)
    
    if (error) {
      console.error('❌ Error eliminando de Supabase:', error)
      return removeProductoFromLocalStorage(id)
    }
    
    console.log('✅ Producto eliminado de Supabase')
    
    // Sincronizar con localStorage
    if (typeof window !== 'undefined') {
      const productos = await loadAllProductos()
      localStorage.setItem('productosBase', JSON.stringify(productos))
    }
    
    return { success: true, error: null }
    
  } catch (error) {
    console.error('❌ Error en removeProducto:', error)
    return removeProductoFromLocalStorage(id)
  }
}

/**
 * Fallback: guardar en localStorage
 */
function saveProductoToLocalStorage(producto, isUpdate) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not available' }
  }
  
  try {
    const productos = loadProductosFromLocalStorage()
    
    if (isUpdate && producto.id) {
      const index = productos.findIndex(p => p.id === producto.id)
      if (index !== -1) {
        productos[index] = producto
      }
    } else {
      const maxId = productos.reduce((max, p) => Math.max(max, p.id || 0), 0)
      producto.id = maxId + 1
      productos.push(producto)
    }
    
    localStorage.setItem('productosBase', JSON.stringify(productos))
    console.log('💾 Producto guardado en localStorage (fallback)')
    
    return { success: true, data: producto, error: null }
  } catch (error) {
    console.error('❌ Error guardando en localStorage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fallback: eliminar de localStorage
 */
function removeProductoFromLocalStorage(id) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not available' }
  }
  
  try {
    const productos = loadProductosFromLocalStorage()
    const filtered = productos.filter(p => p.id !== id)
    
    localStorage.setItem('productosBase', JSON.stringify(filtered))
    console.log('💾 Producto eliminado de localStorage (fallback)')
    
    return { success: true, error: null }
  } catch (error) {
    console.error('❌ Error eliminando de localStorage:', error)
    return { success: false, error: error.message }
  }
}
