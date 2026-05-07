/**
 * Cliente Supabase para Sistema KOND
 *
 * Re-exporta el cliente singleton de utils/supabaseClient para evitar múltiples
 * instancias de GoTrueClient en el mismo contexto de browser.
 * NO llama createClient() directamente — toda la construcción ocurre en utils/supabaseClient.js.
 */

// Reutilizar el cliente ya construido en utils/supabaseClient (único createClient() del proyecto)
import { supabase as _supabase } from '../utils/supabaseClient';

export const supabase = _supabase;

// Flag para alternar entre localStorage (modo legacy) y Supabase
export const USE_SUPABASE =
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_USE_SUPABASE === 'true') ||
  (typeof window !== 'undefined' && window.KOND_SUPABASE_CONFIG?.useSupabase === true);

/**
 * Helper: Verificar si Supabase está configurado correctamente
 */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return !!(url && key && url.includes('supabase'));
}

/**
 * Helper: Obtener usuario actual autenticado
 */
export async function getCurrentUser() {
  if (!supabase) return null;
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
  if (!supabase) return { url: null, error: new Error('Supabase no configurado') };
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    try {
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { url: publicData.publicUrl, error: null };
    } catch {
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
  if (!supabase) return false;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error('Error eliminando archivo:', error);
    return false;
  }
  return true;
}

export default supabase;
