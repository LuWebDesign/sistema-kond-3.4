/**
 * Utilidad para limpiar tombstones antiguos del localStorage
 * Elimina IDs que ya no existen en el servidor (fueron eliminados exitosamente)
 */

import { getAllProductos } from './supabaseProductos'
import { getAllPedidosCatalogo } from './supabasePedidos'

/**
 * Limpia tombstones de productos que ya no existen en Supabase
 * Ejecutar periódicamente o al cargar páginas admin
 */
export async function cleanProductTombstones() {
  if (typeof window === 'undefined') return { cleaned: 0 }
  
  try {
    // Obtener IDs de productos actuales en Supabase
    const { data: productos, error } = await getAllProductos()
    if (error || !productos) {
      console.warn('No se pudo verificar productos para limpieza de tombstones')
      return { cleaned: 0 }
    }
    
    const existingIds = new Set(productos.map(p => p.id))
    
    // Obtener tombstones actuales
    let tombstones = []
    try {
      tombstones = JSON.parse(localStorage.getItem('productosDeleted') || '[]') || []
    } catch (e) {
      return { cleaned: 0 }
    }
    
    const before = tombstones.length
    
    // Filtrar: mantener solo IDs que NO existen en servidor (aún pendientes de confirmar)
    // Si el ID NO está en servidor, significa que fue eliminado exitosamente → limpiar tombstone
    const cleaned = tombstones.filter(id => existingIds.has(id))
    
    if (cleaned.length < before) {
      localStorage.setItem('productosDeleted', JSON.stringify(cleaned))
      const removedCount = before - cleaned.length
      console.log(`🧹 Productos: ${removedCount} tombstone(s) antiguo(s) limpiado(s)`)
      return { cleaned: removedCount }
    }
    
    return { cleaned: 0 }
  } catch (error) {
    console.error('Error limpiando tombstones de productos:', error)
    return { cleaned: 0 }
  }
}

/**
 * Limpia tombstones de pedidos que ya no existen en Supabase
 */
export async function cleanPedidoTombstones() {
  if (typeof window === 'undefined') return { cleaned: 0 }
  
  try {
    // Obtener IDs de pedidos actuales en Supabase
    const { data: pedidos, error } = await getAllPedidosCatalogo()
    if (error || !pedidos) {
      console.warn('No se pudo verificar pedidos para limpieza de tombstones')
      return { cleaned: 0 }
    }
    
    const existingIds = new Set(pedidos.map(p => p.id))
    
    // Obtener tombstones actuales
    let tombstones = []
    try {
      tombstones = JSON.parse(localStorage.getItem('pedidosCatalogoDeleted') || '[]') || []
    } catch (e) {
      return { cleaned: 0 }
    }
    
    const before = tombstones.length
    
    // Filtrar: mantener solo IDs que NO existen en servidor
    const cleaned = tombstones.filter(id => existingIds.has(id))
    
    if (cleaned.length < before) {
      localStorage.setItem('pedidosCatalogoDeleted', JSON.stringify(cleaned))
      const removedCount = before - cleaned.length
      console.log(`🧹 Pedidos: ${removedCount} tombstone(s) antiguo(s) limpiado(s)`)
      return { cleaned: removedCount }
    }
    
    return { cleaned: 0 }
  } catch (error) {
    console.error('Error limpiando tombstones de pedidos:', error)
    return { cleaned: 0 }
  }
}

/**
 * Limpia todos los tombstones antiguos
 * Llamar al iniciar páginas admin o periódicamente
 */
export async function cleanAllTombstones() {
  const results = await Promise.all([
    cleanProductTombstones(),
    cleanPedidoTombstones()
  ])
  
  const totalCleaned = results.reduce((sum, r) => sum + r.cleaned, 0)
  
  if (totalCleaned > 0) {
    console.log(`✨ Total: ${totalCleaned} tombstone(s) limpiado(s)`)
  }
  
  return {
    productos: results[0].cleaned,
    pedidos: results[1].cleaned,
    total: totalCleaned
  }
}

/**
 * Obtiene estadísticas de tombstones actuales
 */
export function getTombstoneStats() {
  if (typeof window === 'undefined') return { productos: 0, pedidos: 0 }
  
  try {
    const productTombs = JSON.parse(localStorage.getItem('productosDeleted') || '[]') || []
    const pedidoTombs = JSON.parse(localStorage.getItem('pedidosCatalogoDeleted') || '[]') || []
    
    return {
      productos: productTombs.length,
      pedidos: pedidoTombs.length,
      total: productTombs.length + pedidoTombs.length,
      productIds: productTombs,
      pedidoIds: pedidoTombs
    }
  } catch (e) {
    return { productos: 0, pedidos: 0, total: 0 }
  }
}
