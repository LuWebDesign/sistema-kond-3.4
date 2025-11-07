// ============================================
// MATERIALES UTILS - Híbrido Supabase + localStorage
// Funciones utilitarias para gestión de materiales con fallback
// ============================================

import { 
  getAllMateriales, 
  createMaterial,
  updateMaterial,
  deleteMaterial 
} from './supabaseMateriales.js'

/**
 * Mapear material de Supabase (snake_case) a formato frontend (camelCase)
 */
export function mapMaterialToFrontend(m) {
  if (!m) return null
  
  return {
    id: m.id,
    nombre: m.nombre,
    tipo: m.tipo || null,
    tamano: m.tamano || null,
    espesor: m.espesor || null,
    unidad: m.unidad || 'cm',
    costoUnitario: m.costo_unitario || 0,
    proveedor: m.proveedor || null,
    stock: m.stock || 0,
    notas: m.notas || null,
    fechaCreacion: m.created_at || new Date().toISOString()
  }
}

/**
 * Mapear material de frontend (camelCase) a formato Supabase (snake_case)
 */
export function mapMaterialToSupabase(m) {
  if (!m) return null
  
  return {
    nombre: m.nombre,
    tipo: m.tipo || null,
    tamano: m.tamano || null,
    espesor: m.espesor || null,
    unidad: m.unidad || 'cm',
    costo_unitario: m.costoUnitario || 0,
    proveedor: m.proveedor || null,
    stock: m.stock || 0,
    notas: m.notas || null
  }
}

/**
 * Cargar todos los materiales (Supabase primero, localStorage como fallback)
 */
export async function loadAllMateriales() {
  try {
    console.log('📦 Cargando materiales desde Supabase...')
    const { data, error } = await getAllMateriales()
    
    if (error) {
      console.warn('⚠️ Error en Supabase, usando localStorage:', error)
      return loadMaterialesFromLocalStorage()
    }
    
    if (data && data.length > 0) {
      const materiales = data.map(mapMaterialToFrontend)
      console.log(`✅ ${materiales.length} materiales cargados desde Supabase`)
      
      // Sincronizar con localStorage para compatibilidad
      if (typeof window !== 'undefined') {
        localStorage.setItem('materiales', JSON.stringify(materiales))
      }
      
      return materiales
    }
    
    // Si Supabase está vacío, intentar con localStorage
    console.log('⚠️ Supabase vacío, usando localStorage')
    return loadMaterialesFromLocalStorage()
    
  } catch (error) {
    console.error('❌ Error cargando materiales:', error)
    return loadMaterialesFromLocalStorage()
  }
}

/**
 * Cargar materiales desde localStorage (fallback)
 */
function loadMaterialesFromLocalStorage() {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem('materiales')
    if (!stored) return []
    
    const materiales = JSON.parse(stored)
    console.log(`📦 ${materiales.length} materiales cargados desde localStorage`)
    return materiales
  } catch (error) {
    console.error('❌ Error leyendo localStorage:', error)
    return []
  }
}

/**
 * Guardar material (crea o actualiza en Supabase + localStorage)
 */
export async function saveMaterial(material, isUpdate = false) {
  try {
    const materialSupabase = mapMaterialToSupabase(material)
    
    let result
    if (isUpdate && material.id) {
      console.log(`📝 Actualizando material ${material.id} en Supabase...`)
      result = await updateMaterial(material.id, materialSupabase)
    } else {
      console.log('📝 Creando nuevo material en Supabase...')
      result = await createMaterial(materialSupabase)
    }
    
    if (result.error) {
      console.error('❌ Error guardando en Supabase:', result.error)
      // Fallback: guardar solo en localStorage
      return saveMaterialToLocalStorage(material, isUpdate)
    }
    
    console.log('✅ Material guardado en Supabase')
    
    // Sincronizar con localStorage
    if (typeof window !== 'undefined') {
      const materiales = await loadAllMateriales()
      localStorage.setItem('materiales', JSON.stringify(materiales))
    }
    
    return { success: true, data: result.data, error: null }
    
  } catch (error) {
    console.error('❌ Error en saveMaterial:', error)
    return saveMaterialToLocalStorage(material, isUpdate)
  }
}

/**
 * Eliminar material (Supabase + localStorage)
 */
export async function removeMaterial(id) {
  try {
    console.log(`🗑️ Eliminando material ${id} de Supabase...`)
    const { error } = await deleteMaterial(id)
    
    if (error) {
      console.error('❌ Error eliminando de Supabase:', error)
      return removeMaterialFromLocalStorage(id)
    }
    
    console.log('✅ Material eliminado de Supabase')
    
    // Sincronizar con localStorage
    if (typeof window !== 'undefined') {
      const materiales = await loadAllMateriales()
      localStorage.setItem('materiales', JSON.stringify(materiales))
    }
    
    return { success: true, error: null }
    
  } catch (error) {
    console.error('❌ Error en removeMaterial:', error)
    return removeMaterialFromLocalStorage(id)
  }
}

/**
 * Fallback: guardar en localStorage
 */
function saveMaterialToLocalStorage(material, isUpdate) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not available' }
  }
  
  try {
    const materiales = loadMaterialesFromLocalStorage()
    
    if (isUpdate && material.id) {
      const index = materiales.findIndex(m => m.id === material.id)
      if (index !== -1) {
        materiales[index] = material
      }
    } else {
      const maxId = materiales.reduce((max, m) => Math.max(max, m.id || 0), 0)
      material.id = maxId + 1
      materiales.push(material)
    }
    
    localStorage.setItem('materiales', JSON.stringify(materiales))
    console.log('💾 Material guardado en localStorage (fallback)')
    
    return { success: true, data: material, error: null }
  } catch (error) {
    console.error('❌ Error guardando en localStorage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fallback: eliminar de localStorage
 */
function removeMaterialFromLocalStorage(id) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not available' }
  }
  
  try {
    const materiales = loadMaterialesFromLocalStorage()
    const filtered = materiales.filter(m => m.id !== id)
    
    localStorage.setItem('materiales', JSON.stringify(filtered))
    console.log('💾 Material eliminado de localStorage (fallback)')
    
    return { success: true, error: null }
  } catch (error) {
    console.error('❌ Error eliminando de localStorage:', error)
    return { success: false, error: error.message }
  }
}
