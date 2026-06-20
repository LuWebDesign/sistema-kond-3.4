// ============================================
// SUPABASE MATERIALES - CRUD OPERATIONS
// Funciones para gestión de materiales de inventario
// ============================================

import supabase from './supabaseClient';
import { TENANT_ID } from '../lib/tenant';

// ============================================
// MATERIALES
// ============================================

/**
 * Obtener todos los materiales
 */
export async function getAllMateriales() {
  try {
    const { data, error } = await supabase
      .from('materiales')
      .select('id, nombre, tipo, tamano, espesor, unidad, costo_unitario, proveedor, stock, notas')
      .eq('tenant_id', TENANT_ID)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener materiales:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener un material por ID
 */
export async function getMaterialById(id) {
  try {
    const { data, error } = await supabase
      .from('materiales')
      .select('id, nombre, tipo, tamano, espesor, unidad, costo_unitario, proveedor, stock, notas')
      .eq('tenant_id', TENANT_ID)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener material:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo material
 */
export async function createMaterial(material) {
  try {
    // console.log('📝 Creando material:', material.nombre);
    
    const { data, error } = await supabase
      .from('materiales')
      .insert([{
        nombre: material.nombre,
        tipo: material.tipo || null,
        tamano: material.tamano || null,
        espesor: material.espesor || null,
        unidad: material.unidad || 'cm',
        costo_unitario: material.costoUnitario || 0,
        proveedor: material.proveedor || null,
        stock: material.stock || 0,
        notas: material.notas || null,
        tenant_id: TENANT_ID
      }])
      .select()
      .single();

    if (error) throw error;
    
    // console.log('✅ Material creado en Supabase:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al crear material:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Actualizar un material existente
 */
export async function updateMaterial(id, materialUpdate) {
  try {
    // console.log('📝 Actualizando material:', id);
    
    const updateData = {};
    
    // Mapear campos camelCase a snake_case
    if (materialUpdate.nombre !== undefined) updateData.nombre = materialUpdate.nombre;
    if (materialUpdate.tipo !== undefined) updateData.tipo = materialUpdate.tipo;
    if (materialUpdate.tamano !== undefined) updateData.tamano = materialUpdate.tamano;
    if (materialUpdate.espesor !== undefined) updateData.espesor = materialUpdate.espesor;
    if (materialUpdate.unidad !== undefined) updateData.unidad = materialUpdate.unidad;
    if (materialUpdate.costoUnitario !== undefined) updateData.costo_unitario = materialUpdate.costoUnitario;
    if (materialUpdate.proveedor !== undefined) updateData.proveedor = materialUpdate.proveedor;
    if (materialUpdate.stock !== undefined) updateData.stock = materialUpdate.stock;
    if (materialUpdate.notas !== undefined) updateData.notas = materialUpdate.notas;

    const { data, error } = await supabase
      .from('materiales')
      .update(updateData)
      .eq('tenant_id', TENANT_ID)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // console.log('✅ Material actualizado en Supabase');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al actualizar material:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Eliminar un material
 */
export async function deleteMaterial(id) {
  try {
    // console.log('🗑️ Eliminando material:', id);
    
    const { error } = await supabase
      .from('materiales')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .eq('id', id);

    if (error) throw error;
    
    // console.log('✅ Material eliminado de Supabase');
    return { error: null };
  } catch (error) {
    console.error('❌ Error al eliminar material:', error);
    return { error: error.message };
  }
}

/**
 * Actualizar stock de un material
 */
export async function updateStock(id, nuevoStock) {
  try {
    const { data, error } = await supabase
      .from('materiales')
      .update({ stock: nuevoStock })
      .eq('tenant_id', TENANT_ID)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al actualizar stock:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// PROVEEDORES
// ============================================

/**
 * Obtener todos los proveedores
 */
export async function getAllProveedores() {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener proveedores:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo proveedor
 */
export async function createProveedor(proveedor) {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .insert([{
        nombre: proveedor.nombre,
        contacto: proveedor.contacto || null,
        telefono: proveedor.telefono || null,
        email: proveedor.email || null,
        direccion: proveedor.direccion || null,
        notas: proveedor.notas || null
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al crear proveedor:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// TAMAÑOS
// ============================================

/**
 * Obtener todos los tamaños
 */
export async function getAllTamanos() {
  try {
    const { data, error } = await supabase
      .from('tamanos_materiales')
      .select('*')
      .order('valor', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener tamaños:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo tamaño
 */
export async function createTamano(valor, descripcion = null) {
  try {
    const { data, error } = await supabase
      .from('tamanos_materiales')
      .insert([{ valor, descripcion }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al crear tamaño:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// ESPESORES
// ============================================

/**
 * Obtener todos los espesores
 */
export async function getAllEspesores() {
  try {
    const { data, error } = await supabase
      .from('espesores_materiales')
      .select('*')
      .order('valor', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al obtener espesores:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Crear un nuevo espesor
 */
export async function createEspesor(valor, descripcion = null) {
  try {
    const { data, error } = await supabase
      .from('espesores_materiales')
      .insert([{ valor, descripcion }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error al crear espesor:', error);
    return { data: null, error: error.message };
  }
}
