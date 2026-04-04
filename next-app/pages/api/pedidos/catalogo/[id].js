import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { createNotification } from '../../../../utils/supabaseNotifications'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'DELETE') {
    try {
      const supabase = supabaseAdmin()

      // Primero eliminar items relacionados (columna FK: pedido_catalogo_id)
      const { error: itemsError } = await supabase
        .from('pedidos_catalogo_items')
        .delete()
        .eq('pedido_catalogo_id', id)

      if (itemsError) throw itemsError

      // Luego eliminar el pedido
      const { error: pedidoError } = await supabase
        .from('pedidos_catalogo')
        .delete()
        .eq('id', id)

      if (pedidoError) throw pedidoError

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error eliminando pedido catalogo:', error)
      // En desarrollo devolvemos el mensaje de error para facilitar debugging
      return res.status(500).json({ error: error?.message || 'Error al eliminar pedido' })
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const supabase = supabaseAdmin()
      const payload = req.body || {}

      console.log('📝 PUT/PATCH request para pedido', id, '- payload recibido:', JSON.stringify(payload).substring(0, 200))

      // Mapear campos del frontend (camelCase) a snake_case de la DB
      const updateData = {}
      if (payload.cliente) {
        if (payload.cliente.nombre !== undefined) updateData.cliente_nombre = payload.cliente.nombre
        if (payload.cliente.apellido !== undefined) updateData.cliente_apellido = payload.cliente.apellido
        if (payload.cliente.telefono !== undefined) updateData.cliente_telefono = payload.cliente.telefono
        if (payload.cliente.email !== undefined) updateData.cliente_email = payload.cliente.email
        if (payload.cliente.direccion !== undefined) updateData.cliente_direccion = payload.cliente.direccion
      }
      if (payload.metodoPago !== undefined) updateData.metodo_pago = payload.metodoPago
      if (payload.estadoPago !== undefined) updateData.estado_pago = payload.estadoPago
      if (payload.comprobante !== undefined) updateData.comprobante_url = payload.comprobante
      if (payload._comprobanteOmitted !== undefined) updateData.comprobante_omitido = payload._comprobanteOmitted
      if (payload.fechaSolicitudEntrega !== undefined) updateData.fecha_solicitud_entrega = payload.fechaSolicitudEntrega
      if (payload.fechaConfirmadaEntrega !== undefined) updateData.fecha_confirmada_entrega = payload.fechaConfirmadaEntrega
      if (payload.fechaProduccion !== undefined) updateData.fecha_produccion = payload.fechaProduccion
      if (payload.fechaProduccionCalendario !== undefined) updateData.fecha_produccion_calendario = payload.fechaProduccionCalendario
      if (payload.fechaEntrega !== undefined) updateData.fecha_entrega = payload.fechaEntrega
      if (payload.fechaEntregaCalendario !== undefined) updateData.fecha_entrega_calendario = payload.fechaEntregaCalendario
      if (payload.estado !== undefined) updateData.estado = payload.estado
      if (payload.total !== undefined) updateData.total = payload.total
      if (payload.montoRecibido !== undefined) updateData.monto_recibido = payload.montoRecibido
      if (payload.asignadoAlCalendario !== undefined) updateData.asignado_al_calendario = payload.asignadoAlCalendario
      if (payload.notas !== undefined) updateData.notas = payload.notas
      if (payload.notasAdmin !== undefined) updateData.notas_admin = payload.notasAdmin

      if (Object.keys(updateData).length === 0) {
        console.warn('⚠️ No hay campos para actualizar en el payload')
        return res.status(400).json({ error: 'No hay campos para actualizar' })
      }

      console.log('🔄 Actualizando en Supabase con:', updateData)

      const { data, error } = await supabase
        .from('pedidos_catalogo')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Pedido actualizado exitosamente en Supabase')

      // Notificar al comprador si el pedido pasó a 'listo'
      if (payload.estado === 'listo') {
        const clienteEmail = payload.cliente?.email || data?.cliente_email
        if (clienteEmail) {
          try {
            await createNotification({
              title: '🎉 Tu pedido está listo',
              body: `Tu pedido #${id} está listo para ser entregado o retirado. ¡Gracias por tu compra!`,
              type: 'success',
              meta: {
                tipo: 'pedido_listo',
                target: 'user',
                pedidoId: id,
                userId: clienteEmail,
                createdAt: new Date().toISOString()
              },
              targetUser: 'user'
            })
            console.log('🔔 Notificación enviada al comprador:', clienteEmail)
          } catch (notifError) {
            // No bloquear la respuesta si falla la notificación
            console.warn('⚠️ No se pudo crear notificación para el comprador:', notifError.message)
          }
        }
      }

      // Enviar email al cliente cuando el estado cambia a 'confirmado' o 'listo'
      if (payload.estado === 'confirmado' || payload.estado === 'listo') {
        try {
          const protocol = req.headers['x-forwarded-proto'] || 'http'
          const host = req.headers.host
          const emailRes = await fetch(`${protocol}://${host}/api/send-order-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedidoId: id, nuevoEstado: payload.estado })
          })
          const emailResult = await emailRes.json()
          if (emailResult.success) {
            console.log(`📧 Email "${payload.estado}" enviado para pedido #${id}`)
          } else {
            console.warn(`⚠️ Email no enviado para pedido #${id}:`, emailResult.reason || emailResult.error)
          }
        } catch (emailError) {
          // No bloquear el update si falla el email
          console.warn('⚠️ Error al enviar email de notificación:', emailError.message)
        }
      }

      return res.status(200).json({ success: true, pedido: data })
    } catch (error) {
      console.error('❌ Error actualizando pedido catalogo:', error)
      return res.status(500).json({ error: error?.message || 'Error al actualizar pedido' })
    }
  }

  res.setHeader('Allow', ['DELETE', 'PUT', 'PATCH'])
  return res.status(405).json({ error: 'Método no permitido' })
}
