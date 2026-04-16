// ============================================
// SUPABASE NOTIFICATIONS - CRUD OPERATIONS
// Funciones para gestión de notificaciones en Supabase
// ============================================

import { supabase, supabaseAdmin } from './supabaseClient';

// Helper to detect whether the Supabase client is initialized. In local dev
// environments we may not have NEXT_PUBLIC_SUPABASE_URL / ANON_KEY set and the
// exported `supabase` will be null. Guard calls that assume the client exists
// so the app can run in offline/fallback mode (localStorage) during development.
const isSupabaseReady = () => !!(supabase && typeof supabase.from === 'function');

/**
 * Obtener notificaciones para un usuario específico
 * @param {string} targetUser - 'admin' o 'user'
 * @param {string} userId - ID del usuario (opcional para admin)
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getNotifications(targetUser = 'admin', userId = null) {
  // If supabase client is not initialized (common in local dev without envs),
  // fallback to reading notifications from localStorage so the UI doesn't crash.
  if (!isSupabaseReady()) {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('notifications')
        const list = stored ? JSON.parse(stored) : []
        // Filter by targetUser if present
        const filtered = list.filter(n => {
          if (!n) return false
          if (!targetUser) return true
          return String(n.target_user || 'admin') === String(targetUser)
        })
        // If user-specific, further filter by meta.userId when present
        if (targetUser === 'user' && userId) {
          return filtered.filter(n => n.meta && String(n.meta.userId) === String(userId))
        }
        return filtered
      } catch (err) {
        return []
      }
    }

    return []
  }

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('target_user', targetUser)
      .order('created_at', { ascending: false })
      .limit(50); // Limitar a las 50 más recientes

    // Para usuarios específicos, filtrar por userId en meta
    if (targetUser === 'user' && userId) {
      query = query.eq('meta->>userId', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getNotifications:', error);
    return [];
  }
}

/**
 * Crear una nueva notificación
 * @param {Object} notification - Datos de la notificación
 * @param {string} notification.title - Título de la notificación
 * @param {string} notification.body - Cuerpo de la notificación
 * @param {string} notification.type - Tipo: 'success', 'error', 'warning', 'info', etc.
 * @param {Object} notification.meta - Metadatos adicionales
 * @param {string} notification.targetUser - Usuario objetivo: 'admin' o 'user'
 * @returns {Promise<Object>} Notificación creada
 */
export async function createNotification({
  title,
  body,
  type = 'info',
  meta = {},
  targetUser = 'admin'
}) {
  try {
    // Usar cliente administrativo para operaciones server-side (ignora RLS)
    const client = supabaseAdmin();

    const { data, error } = await client
      .from('notifications')
      .insert([{
        title,
        body,
        type,
        meta,
        target_user: targetUser,
        read: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando notificación:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en createNotification:', error);
    throw error;
  }
}

/**
 * Marcar notificación como leída
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function markNotificationAsRead(notificationId) {
  try {
    // Usar cliente público (respeta RLS)
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marcando notificación como leída:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en markNotificationAsRead:', error);
    return false;
  }
}

/**
 * Marcar todas las notificaciones como leídas para un usuario
 * @param {string} targetUser - 'admin' o 'user'
 * @param {string} userId - ID del usuario (opcional para admin)
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function markAllNotificationsAsRead(targetUser = 'admin', userId = null) {
  try {
    // Usar cliente público (respeta RLS)
    let query = supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('target_user', targetUser)
      .eq('read', false);

    // Para usuarios específicos, filtrar por userId en meta
    if (targetUser === 'user' && userId) {
      query = query.eq('meta->>userId', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en markAllNotificationsAsRead:', error);
    return false;
  }
}

/**
 * Eliminar una notificación
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function deleteNotification(notificationId) {
  try {
    // Usar cliente público (respeta RLS)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error eliminando notificación:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en deleteNotification:', error);
    return false;
  }
}

/**
 * Limpiar todas las notificaciones leídas antiguas (más de 30 días)
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function cleanupOldNotifications() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Usar cliente administrativo para operaciones server-side
    const client = supabaseAdmin();

    const { error } = await client
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error limpiando notificaciones antiguas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en cleanupOldNotifications:', error);
    return false;
  }
}

/**
 * Obtener conteo de notificaciones no leídas
 * @param {string} targetUser - 'admin' o 'user'
 * @param {string} userId - ID del usuario (opcional para admin)
 * @returns {Promise<number>} Número de notificaciones no leídas
 */
export async function getUnreadCount(targetUser = 'admin', userId = null) {
  // Guard contra falta de cliente Supabase en dev
  if (!isSupabaseReady()) {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('notifications')
        const list = stored ? JSON.parse(stored) : []
        let filtered = list.filter(n => String(n.target_user || 'admin') === String(targetUser))
        if (targetUser === 'user' && userId) {
          filtered = filtered.filter(n => n.meta && String(n.meta.userId) === String(userId))
        }
        return filtered.filter(n => !n.read).length
      } catch (err) {
        return 0
      }
    }

    return 0
  }

  try {
    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('target_user', targetUser)
      .eq('read', false);

    // Para usuarios específicos, filtrar por userId en meta
    if (targetUser === 'user' && userId) {
      query = query.eq('meta->>userId', userId);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error obteniendo conteo de notificaciones:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error en getUnreadCount:', error);
    return 0;
  }
}
