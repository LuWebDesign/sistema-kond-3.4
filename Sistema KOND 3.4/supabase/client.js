/**
 * Cliente Supabase para Sistema KOND
 * 
 * Este archivo configura la conexión a Supabase y provee helpers
 * para operaciones comunes (productos, pedidos, comprobantes).
 */

import { createClient } from '@supabase/supabase-js';

// Configuración (estas variables deben estar en .env o window.KOND_SUPABASE_CONFIG)
const envUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) || '';
const envAnon = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || '';

// Si estamos en el navegador, permitir configuración desde window (útil para build estático o HTML puro)
const browserConfig = (typeof window !== 'undefined' && window.KOND_SUPABASE_CONFIG) ? window.KOND_SUPABASE_CONFIG : {};

const SUPABASE_URL = envUrl || browserConfig.url || '';
const SUPABASE_ANON_KEY = envAnon || browserConfig.anonKey || '';

// Crear cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Flag para alternar entre localStorage (modo legacy) y Supabase
export const USE_SUPABASE = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_USE_SUPABASE === 'true') || (browserConfig.useSupabase === true);

/**
 * Helper: Verificar si Supabase está configurado correctamente
 */
export function isSupabaseConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase');
}

/**
 * Helper: Obtener usuario actual autenticado
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
  return user;
}

/**
 * Helper: Subir archivo a Supabase Storage
 * @param {File} file - Archivo a subir
 * @param {string} bucket - Bucket de storage (ej: 'comprobantes')
 * @param {string} path - Ruta dentro del bucket
 * @returns {Promise<{url: string, error: any}>}
 */
export async function uploadFile(file, bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Obtener URL pública si el bucket es público
    try {
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { url: publicData.publicUrl, error: null };
    } catch (err) {
      // Si falla, devolver path (el caller puede solicitar signed URL desde el servidor)
      return { url: data.path, error: null };
    }
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return { url: null, error };
  }
}

/**
 * Helper: Eliminar archivo de Supabase Storage
 */
export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) {
    console.error('Error eliminando archivo:', error);
    return false;
  }
  return true;
}

// Exportar para uso directo en otros módulos
export default supabase;
