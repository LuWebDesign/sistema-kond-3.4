// API endpoint para obtener notificaciones
// Uso: GET /api/notifications?target=admin&limit=10

import { getNotifications, getUnreadCount } from '../../../utils/supabaseNotifications'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { target = 'admin', limit = 20 } = req.query

    console.log(`📋 Obteniendo notificaciones para target: ${target}, limit: ${limit}`)

    // Obtener notificaciones
    const notifications = await getNotifications(target, null)

    // Obtener conteo de no leídas
    const unreadCount = await getUnreadCount(target, null)

    console.log(`✅ Encontradas ${notifications.length} notificaciones, ${unreadCount} no leídas`)

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.slice(0, parseInt(limit)),
        unreadCount,
        total: notifications.length
      }
    })

  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}