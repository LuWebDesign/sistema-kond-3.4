import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '../../../utils/rateLimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Webhook has no TENANT_ID env context — tenant is resolved from DB via mp_preference_id
const INTERNAL_MP_PREFERENCE_CLAIM_PREFIX = 'kond-mp-claim:'

const checkRateLimit = rateLimit({ maxRequests: 60, windowMs: 60_000 })

const STATUS_MAP = {
  approved: 'pagado',
  pending: 'pendiente_mp',
  in_process: 'pendiente_mp',
  rejected: 'rechazado_mp',
  cancelled: 'rechazado_mp',
}

export default async function handler(req, res) {
  const ip = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).end()
  }

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
    const { external_reference, preference_id, status, id: mp_payment_id } = payment
    const estado_pago = STATUS_MAP[status] ?? 'pendiente_mp'

    console.log('[mp/webhook] payment fetched:', { mp_payment_id, status, external_reference, preference_id, estado_pago })

    if (!preference_id) {
      console.error('[mp/webhook] Missing preference_id; refusing service-role fallback lookup by external_reference:', { external_reference, mp_payment_id })
      return res.status(200).end()
    }

    if (String(preference_id).startsWith(INTERNAL_MP_PREFERENCE_CLAIM_PREFIX)) {
      console.error('[mp/webhook] Ignoring internal MercadoPago preference claim sentinel:', { external_reference, preference_id, mp_payment_id })
      return res.status(200).end()
    }

    const lookupQuery = supabaseAdmin
      .from('pedidos_catalogo')
      .select('id, tenant_id, mp_preference_id')

    lookupQuery.eq('mp_preference_id', preference_id)

    const { data: pedido, error: lookupError } = await lookupQuery
      .single()

    if (lookupError || !pedido) {
      console.error('[mp/webhook] Could not resolve pedido for MercadoPago payment:', { external_reference, preference_id, lookupError })
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

    if (!error && status === 'approved') {
      console.log('[mp/webhook] Payment approved; shipment generation remains pending for explicit admin action:', { pedidoId: pedido.id })
    }
  } catch (err) {
    console.error('[mp/webhook] Unexpected error:', err)
  }

  return res.status(200).end()
}
