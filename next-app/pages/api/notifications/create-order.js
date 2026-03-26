// API endpoint para crear notificaciones de pedidos
// Uso: POST /api/notifications/create-order

import { createNotification } from '../../../utils/supabaseNotifications'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      pedidoId,
      cliente,
      total,
      metodoPago,
      items,
      formatCurrency
    } = req.body

    console.log('📝 [API] Creando notificación para pedido:', {
      pedidoId,
      clienteNombre: cliente?.nombre,
      total,
      itemsCount: items?.length,
      timestamp: new Date().toISOString()
    })

    // Crear notificación para el admin
    const notification = await createNotification({
      title: '🛒 Nuevo pedido recibido',
      body: `${cliente.nombre || cliente.name} ${cliente.apellido} realizó un pedido por ${formatCurrency ? formatCurrency(total) : total} (${items.length} producto${items.length !== 1 ? 's' : ''})`,
      type: 'success',
      meta: {
        tipo: 'nuevo_pedido',
        target: 'admin',
        pedidoId: pedidoId,
        cliente: cliente,
        total: total,
        metodoPago: metodoPago,
        items: items,
        createdAt: new Date().toISOString(),
        source: 'api-create-order'
      },
      targetUser: 'admin'
    })

    // Crear notificación para el comprador (si tiene email)
    if (cliente?.email) {
      await createNotification({
        title: '✅ Pedido recibido',
        body: `Tu pedido fue recibido y está pendiente de confirmación. Total: ${formatCurrency ? formatCurrency(total) : total}`,
        type: 'success',
        meta: {
          tipo: 'pedido_recibido',
          target: 'user',
          pedidoId: pedidoId,
          userId: cliente.email,
          createdAt: new Date().toISOString()
        },
        targetUser: 'user'
      })
    }

    console.log('✅ [API] Notificación creada exitosamente:', {
      notificationId: notification.id,
      pedidoId: pedidoId
    })

    res.status(200).json({
      success: true,
      notification: notification
    })

  } catch (error) {
    console.error('❌ [API] Error creando notificación:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}