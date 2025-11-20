// ============================================
// API ROUTE: GET /api/notifications
// Obtener notificaciones desde Supabase
// ============================================

import { getNotifications, getUnreadCount } from '../../../utils/supabaseNotifications'

/**
 * Handler para obtener notificaciones
 * 
 * GET /api/notifications?targetUser=admin&userId=xxx&limit=50
 * 
 * Query params:
 * - targetUser: 'admin' | 'user' (default: 'admin')
 * - userId: ID del usuario (opcional, para filtrar notificaciones de usuario)
 * - limit: Límite de resultados (default: 50)
 * 
 * Response:
 * {
 *   success: true,
 *   notifications: [...],
 *   unreadCount: 5,
 *   total: 25
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Solo se permite GET en este endpoint'
    })
  }

  try {
    // Soportar ambos parámetros: target (legacy) y targetUser (nuevo)
    const targetUser = req.query.targetUser || req.query.target || 'admin'
    const userId = req.query.userId || null
    const limit = parseInt(req.query.limit || '50', 10)

    console.log('📥 [API] Obteniendo notificaciones:', {
      targetUser,
      userId: userId || 'N/A',
      limit,
      timestamp: new Date().toISOString()
    })

    // Validar targetUser
    if (!['admin', 'user'].includes(targetUser)) {
      return res.status(400).json({
        error: 'Invalid targetUser',
        message: 'targetUser debe ser "admin" o "user"'
      })
    }

    // Obtener notificaciones y conteo de no leídas en paralelo
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(targetUser, userId),
      getUnreadCount(targetUser, userId)
    ])

    console.log('✅ [API] Notificaciones obtenidas:', {
      total: notifications.length,
      unreadCount,
      targetUser
    })

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.slice(0, limit),
        unreadCount,
        total: notifications.length
      },
      // Mantener compatibilidad con formato anterior
      notifications: notifications.slice(0, limit),
      unreadCount,
      total: notifications.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [API] Error obteniendo notificaciones:', error)
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Error al obtener notificaciones',
      details: error.message,
      success: false
    })
  }
}