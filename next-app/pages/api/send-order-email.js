// API Route: Enviar email de notificación al cliente Y al vendedor de un pedido
// POST /api/send-order-email

import { supabaseAdmin } from '../../utils/supabaseClient'
import { TENANT_ID } from '../../lib/tenant'
import { verifyAdminCookie } from '../../utils/verifyAdminCookie'
import { rateLimit, getClientIp } from '../../utils/rateLimit'
import {
  escapeHtml,
  formatCurrency,
  buildItemsTable,
  wrapEmail,
  buildConfirmadoEmail,
  buildListoEmail,
  buildRecibidoEmail
} from '../../utils/emailTemplates'

const checkRateLimit = rateLimit({ maxRequests: 20, windowMs: 60_000 })

export default async function handler(req, res) {
  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  const ip = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ error: 'Demasiadas solicitudes', retryAfter })
  }

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
  const RESEND_VENDOR_EMAIL = process.env.RESEND_VENDOR_EMAIL

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
    // Use NEXT_PUBLIC_BASE_URL if set (custom domain), otherwise fallback to request host
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? process.env.NEXT_PUBLIC_BASE_URL
      : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000'}`
    const miCuentaUrl = `${baseUrl}/catalog/mis-pedidos`

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

    // Enviar email con Resend al cliente
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

    // Enviar notificación al vendedor solo cuando llega un pedido nuevo
    if (RESEND_VENDOR_EMAIL && (nuevoEstado === 'recibido' || nuevoEstado === 'recibido_mp')) {
      const metodoPago = pedido.metodo_pago || 'desconocido'
      const vendorSubject = `🛒 Nuevo pedido #${pedidoId} — ${clienteNombre}`
      const vendorHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1f2937;">Nuevo pedido recibido</h2>
          <p style="color:#374151;">Hola, llegó un nuevo pedido en tu tienda.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;">
            <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Pedido</td><td style="padding:12px 16px;font-weight:700;font-size:14px;">#${pedidoId}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Cliente</td><td style="padding:12px 16px;font-size:14px;">${escapeHtml(clienteNombre)}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Email cliente</td><td style="padding:12px 16px;font-size:14px;">${escapeHtml(clienteEmail)}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Teléfono</td><td style="padding:12px 16px;font-size:14px;">${escapeHtml(pedido.cliente_telefono || '—')}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Método de pago</td><td style="padding:12px 16px;font-size:14px;">${escapeHtml(metodoPago)}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Total</td><td style="padding:12px 16px;font-weight:700;font-size:16px;color:#10b981;">${formatCurrency(total)}</td></tr>
          </table>
          ${buildItemsTable(items)}
          <div style="margin-top:24px;">
            <a href="${baseUrl}/admin/orders/detalle-pedido/${pedidoId}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Ver pedido en el panel</a>
          </div>
        </div>`

      const vendorRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [RESEND_VENDOR_EMAIL],
          subject: vendorSubject,
          html: vendorHtml
        })
      })

      if (!vendorRes.ok) {
        const vendorErr = await vendorRes.json().catch(() => ({}))
        console.warn('⚠️ Error enviando email al vendedor:', vendorErr)
      } else {
        console.log(`📧 Email de nuevo pedido enviado al vendedor (${RESEND_VENDOR_EMAIL})`)
      }
    }

    return res.status(200).json({ success: true, emailId: resendData.id })

  } catch (error) {
    console.error('Error al enviar email:', error)
    return res.status(200).json({ success: false, error: error.message })
  }
}
