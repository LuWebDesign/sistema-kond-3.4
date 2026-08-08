import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { createNotification } from '../../../../utils/supabaseNotifications'
import { TENANT_ID } from '../../../../lib/tenant'
import { verifyAdminCookie } from '../../../../utils/verifyAdminCookie'

const ORDER_SELECT = `
  id, cliente_email, estado, estado_pago, monto_recibido,
  mp_preference_id, mp_payment_id, mp_payment_status,
  pago_confirmado_origen, pago_confirmado_at,
  cliente_nombre, cliente_apellido, cliente_telefono, cliente_direccion,
  cliente_localidad, cliente_codigo_postal, cliente_provincia, cliente_notas,
  metodo_pago, metodo_entrega, comprobante_url, comprobante_omitido,
  fecha_solicitud_entrega, fecha_produccion, fecha_produccion_calendario,
  fecha_entrega_calendario, fecha_confirmada_entrega,
  total, envio_gratis, asignado_al_calendario,
  shipping_provider, shipping_delivery_type, shipping_service_code,
  shipping_service_name, shipping_cost, shipping_currency,
  shipping_quote_snapshot, shipping_destination_snapshot, shipping_agency_snapshot,
  shipping_status, shipping_import_status, shipping_import_result,
  shipping_imported_at, shipping_manual_followup_required, shipping_tracking_number,
  created_at, updated_at
`

export default async function handler(req, res) {
  const { id } = req.query

  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  if (req.method === 'DELETE') {
    try {
      const supabase = supabaseAdmin()

      // Primero eliminar items relacionados (columna FK: pedido_catalogo_id)
      const { error: itemsError } = await supabase
        .from('pedidos_catalogo_items')
        .delete()
        .eq('pedido_catalogo_id', id)
        .eq('tenant_id', TENANT_ID)

      if (itemsError) throw itemsError

      // Luego eliminar el pedido
      const { error: pedidoError } = await supabase
        .from('pedidos_catalogo')
        .delete()
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)

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

      const paymentAction = payload.paymentAction
      if (paymentAction !== undefined && paymentAction !== 'manual_confirm') {
        return res.status(400).json({ error: 'Acción de pago no válida' })
      }

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
      if (payload.asignadoAlCalendario !== undefined) updateData.asignado_al_calendario = payload.asignadoAlCalendario
      if (payload.notas !== undefined) updateData.notas = payload.notas
      if (payload.notasAdmin !== undefined) updateData.notas_admin = payload.notasAdmin

      const shipping = payload.shipping || {}
      const shippingFields = {
        shipping_provider: shipping.provider,
        shipping_delivery_type: shipping.deliveryType,
        shipping_service_code: shipping.serviceCode,
        shipping_service_name: shipping.serviceName,
        shipping_cost: shipping.cost,
        shipping_currency: shipping.currency,
        shipping_quote_snapshot: shipping.quoteSnapshot,
        shipping_destination_snapshot: shipping.destinationSnapshot,
        shipping_agency_snapshot: shipping.agencySnapshot,
        shipping_status: shipping.status,
        shipping_import_status: shipping.importStatus,
        shipping_import_result: shipping.importResult,
        shipping_imported_at: shipping.importedAt,
        shipping_manual_followup_required: shipping.manualFollowupRequired,
        shipping_tracking_number: shipping.trackingNumber,
      }
      for (const [field, value] of Object.entries(shippingFields)) {
        if (value !== undefined) updateData[field] = value
      }

      if (paymentAction === 'manual_confirm') {
        const { data: currentOrder, error: currentOrderError } = await supabase
          .from('pedidos_catalogo')
          .select('metodo_pago, mp_payment_status, estado_pago, pago_confirmado_origen')
          .eq('id', id)
          .eq('tenant_id', TENANT_ID)
          .single()

        if (currentOrderError) throw currentOrderError

        const isMercadoPagoApproved = currentOrder.mp_payment_status === 'approved'
          || currentOrder.pago_confirmado_origen === 'mercado_pago'

        if (currentOrder.metodo_pago === 'mercadopago' || isMercadoPagoApproved) {
          return res.status(409).json({ error: 'No se puede confirmar manualmente un pago de Mercado Pago aprobado' })
        }

        const montoRecibido = Number(payload.montoRecibido)
        if (!Number.isFinite(montoRecibido) || montoRecibido < 0 || payload.estadoPago === undefined) {
          return res.status(400).json({ error: 'La confirmación manual requiere estado y monto válidos' })
        }

        updateData.estado_pago = payload.estadoPago
        updateData.monto_recibido = montoRecibido
        updateData.pago_confirmado_origen = montoRecibido > 0 ? 'manual_admin' : null
        updateData.pago_confirmado_at = montoRecibido > 0 ? new Date().toISOString() : null
      }

      if (Object.keys(updateData).length === 0) {
        console.warn('⚠️ No hay campos para actualizar en el payload')
        return res.status(400).json({ error: 'No hay campos para actualizar' })
      }

      console.log('🔄 Actualizando en Supabase con:', updateData)

      const { data, error } = await supabase
        .from('pedidos_catalogo')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', TENANT_ID)
        .select(ORDER_SELECT)
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
