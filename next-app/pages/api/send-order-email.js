// API Route: Enviar email de notificación al cliente de un pedido
// POST /api/send-order-email

import { supabaseAdmin } from '../../utils/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { pedidoId, nuevoEstado } = req.body || {}

  if (!pedidoId || !nuevoEstado) {
    return res.status(400).json({ error: 'Faltan parámetros: pedidoId, nuevoEstado' })
  }

  if (!['confirmado', 'listo'].includes(nuevoEstado)) {
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
    } else {
      subject = '📦 Tu pedido está listo - KOND'
      bodyHtml = buildListoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })
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

// ───────────── HTML Templates ─────────────

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

function buildItemsTable(items) {
  if (!items || items.length === 0) {
    return '<p style="color:#6b7280;font-style:italic;">Sin detalle de productos</p>'
  }

  const rows = items.map(item => {
    const nombre = escapeHtml(item.producto_nombre || 'Producto')
    const cantidad = Number(item.cantidad || 1)
    const precio = Number(item.producto_precio || 0)
    const medidas = item.medidas ? `<br><span style="color:#6b7280;font-size:12px;">${escapeHtml(item.medidas)}</span>` : ''
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1f2937;">
          ${nombre}${medidas}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;color:#1f2937;">
          ${cantidad}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#1f2937;">
          ${formatCurrency(precio * cantidad)}
        </td>
      </tr>`
  }).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Producto</th>
          <th style="padding:10px 16px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Cant.</th>
          <th style="padding:10px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`
}

function wrapEmail(content) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KOND</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">KOND</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Este email fue enviado automáticamente por KOND.<br>
                Si tenés alguna duda, respondé a este email o contactanos por WhatsApp.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildConfirmadoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl }) {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#ecfdf5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">✅</div>
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#1f2937;">¡Pedido Confirmado!</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;">Pedido #${escapeHtml(String(pedidoId))}</p>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px 0;">
      Hola <strong>${escapeHtml(clienteNombre)}</strong>,<br>
      Tu pedido fue confirmado y ya estamos trabajando en él.
    </p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#1f2937;">Detalle del pedido</h3>
      ${buildItemsTable(items)}
      <div style="text-align:right;padding:12px 16px 0;border-top:2px solid #3b82f6;">
        <span style="font-size:13px;color:#6b7280;">Total</span>
        <span style="display:block;font-size:20px;font-weight:700;color:#1f2937;">${formatCurrency(total)}</span>
      </div>
    </div>

    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 24px 0;">
      Te vamos a avisar cuando tu pedido esté listo. Podés seguir el estado desde tu cuenta.
    </p>

    <div style="text-align:center;">
      <a href="${escapeHtml(miCuentaUrl)}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Ver mi pedido
      </a>
    </div>`

  return wrapEmail(content)
}

function buildListoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl }) {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">📦</div>
      <h2 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#1f2937;">¡Tu pedido está listo!</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;">Pedido #${escapeHtml(String(pedidoId))}</p>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px 0;">
      Hola <strong>${escapeHtml(clienteNombre)}</strong>,<br>
      Tu pedido ya está listo. Nos vamos a contactar con vos para coordinar la entrega o retiro.
    </p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#1f2937;">Detalle del pedido</h3>
      ${buildItemsTable(items)}
      <div style="text-align:right;padding:12px 16px 0;border-top:2px solid #3b82f6;">
        <span style="font-size:13px;color:#6b7280;">Total</span>
        <span style="display:block;font-size:20px;font-weight:700;color:#1f2937;">${formatCurrency(total)}</span>
      </div>
    </div>

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">
        📞 <strong>¿Cómo sigue?</strong><br>
        Nos vamos a comunicar con vos por teléfono o WhatsApp para coordinar la entrega. Si tenés alguna preferencia de horario, podés indicarla desde tu cuenta.
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${escapeHtml(miCuentaUrl)}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Ver mi cuenta
      </a>
    </div>`

  return wrapEmail(content)
}
