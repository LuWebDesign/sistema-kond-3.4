// API Route: Enviar email de notificación al cliente de un pedido
// POST /api/send-order-email

import { supabaseAdmin } from '../../utils/supabaseClient'
import { TENANT_ID } from '../../lib/tenant'
import {
  escapeHtml,
  formatCurrency,
  buildItemsTable,
  wrapEmail,
  buildConfirmadoEmail,
  buildListoEmail,
  buildRecibidoEmail
} from '../../utils/emailTemplates'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { pedidoId, nuevoEstado } = req.body || {}

  if (!pedidoId || !nuevoEstado) {
    return res.status(400).json({ error: 'Faltan parámetros: pedidoId, nuevoEstado' })
  }

  const VALID_STATES = ['confirmado', 'listo', 'recibido', 'recibido_mp']
  if (!VALID_STATES.includes(nuevoEstado)) {
    return res.status(400).json({ error: 'Estado no soportado para email' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn('⚠️ RESEND_API_KEY o RESEND_FROM_EMAIL no configurados, omitiendo email')
    return res.status(200).json({ success: false, skipped: true, reason: 'Resend no configurado' })
  }

  try {
    // Obtener pedido con items desde la base de datos
    const supabase = supabaseAdmin()
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos_catalogo')
      .select('*, pedidos_catalogo_items(*)')
      .eq('id', pedidoId)
      .eq('tenant_id', TENANT_ID)
      .single()

    if (pedidoError || !pedido) {
      console.error('Error obteniendo pedido para email:', pedidoError)
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    const clienteEmail = pedido.cliente_email
    if (!clienteEmail) {
      return res.status(200).json({ success: false, skipped: true, reason: 'El cliente no tiene email' })
    }

    const clienteNombre = [pedido.cliente_nombre, pedido.cliente_apellido].filter(Boolean).join(' ') || 'Cliente'
    const items = pedido.pedidos_catalogo_items || []
    const total = Number(pedido.total || 0)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kond.vercel.app'
    const miCuentaUrl = `${baseUrl}/catalog/user`

    let subject, bodyHtml

    if (nuevoEstado === 'confirmado') {
      subject = '✅ Tu pedido fue confirmado - KOND'
      bodyHtml = buildConfirmadoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })
    } else if (nuevoEstado === 'listo') {
      subject = '📦 Tu pedido está listo - KOND'
      bodyHtml = buildListoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })
    } else if (nuevoEstado === 'recibido') {
      subject = '🛒 Pedido recibido - KOND'
      bodyHtml = buildRecibidoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })
    } else {
      // recibido_mp
      subject = '✅ Pago confirmado - KOND'
      bodyHtml = buildRecibidoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })
    }

    // Enviar email con Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [clienteEmail],
        subject,
        html: bodyHtml
      })
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('❌ Error de Resend:', resendData)
      return res.status(200).json({ success: false, error: resendData })
    }

    console.log(`📧 Email "${nuevoEstado}" enviado a ${clienteEmail} (pedido #${pedidoId})`)
    return res.status(200).json({ success: true, emailId: resendData.id })

  } catch (error) {
    console.error('Error al enviar email:', error)
    return res.status(200).json({ success: false, error: error.message })
  }
}
