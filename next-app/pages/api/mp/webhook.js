import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Webhook has no TENANT_ID env context — tenant is resolved from DB via mp_preference_id

const STATUS_MAP = {
  approved: 'pagado',
  pending: 'pendiente_mp',
  in_process: 'pendiente_mp',
  rejected: 'rechazado_mp',
  cancelled: 'rechazado_mp',
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Soporta IPN v1 (?topic=payment&id=...) y Webhooks v2 (body: {type, data.id})
  const { topic, id: queryId } = req.query
  const body = req.body || {}

  const isIPN = topic === 'payment' && queryId
  const isWebhookV2 = body.type === 'payment' && body.data?.id

  if (!isIPN && !isWebhookV2) {
    return res.status(200).end()
  }

  const id = isWebhookV2 ? body.data.id : queryId

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })

    if (!mpRes.ok) {
      console.error('[mp/webhook] Failed to fetch payment:', mpRes.status)
      return res.status(200).end()
    }

    const payment = await mpRes.json()
    const { external_reference, status, id: mp_payment_id } = payment
    const estado_pago = STATUS_MAP[status] ?? 'pendiente_mp'

    console.log('[mp/webhook] payment fetched:', { mp_payment_id, status, external_reference, estado_pago })

    // Resolve tenant from DB using mp_preference_id (external_reference)
    const { data: pedido, error: lookupError } = await supabaseAdmin
      .from('pedidos_catalogo')
      .select('id, tenant_id, estado_pago, mp_payment_status')
      .eq('mp_preference_id', external_reference)
      .single()

    if (lookupError || !pedido) {
      console.error('[mp/webhook] Could not resolve pedido for external_reference:', external_reference, lookupError)
      return res.status(200).end()
    }

    const resolvedTenantId = pedido.tenant_id

    const { data: updated, error } = await supabaseAdmin
      .from('pedidos_catalogo')
      .update({
        mp_payment_id: String(mp_payment_id),
        mp_payment_status: status,
        estado_pago,
      })
      .eq('id', pedido.id)
      .eq('tenant_id', resolvedTenantId)
      .select('id')

    console.log('[mp/webhook] supabase result:', { updated, error, external_reference })
  } catch (err) {
    console.error('[mp/webhook] Unexpected error:', err)
  }

  return res.status(200).end()
}
