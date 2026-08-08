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

const PAYMENT_STATUSES = new Set(Object.keys(STATUS_MAP))
const TERMINAL_PAYMENT_STATUSES = new Set(['approved', 'rejected', 'cancelled'])

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
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
      return res.status(503).end()
    }

    const payment = await mpRes.json()
    const { external_reference, preference_id, status, id: mp_payment_id } = payment
    const normalizedStatus = String(status || '').toLowerCase()
    const estado_pago = STATUS_MAP[normalizedStatus]

    console.log('[mp/webhook] payment fetched:', { mp_payment_id, status, external_reference, preference_id, estado_pago })

    if (!mp_payment_id || !PAYMENT_STATUSES.has(normalizedStatus)) {
      console.error('[mp/webhook] Invalid MercadoPago payment payload:', { mp_payment_id, status })
      return res.status(422).end()
    }

    if (String(preference_id).startsWith(INTERNAL_MP_PREFERENCE_CLAIM_PREFIX)) {
      console.error('[mp/webhook] Ignoring internal MercadoPago preference claim sentinel:', { external_reference, preference_id, mp_payment_id })
      return res.status(200).end()
    }

    const { pedido, lookupError } = await resolvePedido(payment)

    if (lookupError || !pedido) {
      console.error('[mp/webhook] Could not resolve pedido for MercadoPago payment:', { external_reference, preference_id, lookupError })
      return res.status(503).end()
    }

    const resolvedTenantId = pedido.tenant_id

    if (shouldIgnorePaymentUpdate(pedido, normalizedStatus)) {
      console.log('[mp/webhook] Ignoring non-monotonic MercadoPago payment update:', {
        pedidoId: pedido.id,
        currentStatus: pedido.mp_payment_status,
        incomingStatus: normalizedStatus,
      })
      return res.status(200).end()
    }

    const { data: updated, error } = await supabaseAdmin
      .from('pedidos_catalogo')
      .update({
        mp_payment_id: String(mp_payment_id),
        mp_payment_status: normalizedStatus,
        estado_pago,
        ...(normalizedStatus === 'approved'
          ? {
              monto_recibido: Number(pedido.total || 0),
              pago_confirmado_origen: 'mercado_pago',
              pago_confirmado_at: pedido.pago_confirmado_at || new Date().toISOString(),
            }
          : {
              pago_confirmado_origen: null,
              pago_confirmado_at: null,
            }),
      })
      .eq('id', pedido.id)
      .eq('tenant_id', resolvedTenantId)
      .select('id')

    console.log('[mp/webhook] supabase result:', { updated, error, external_reference })

    if (error || !updated?.length) {
      return res.status(503).end()
    }

    if (normalizedStatus === 'approved') {
      console.log('[mp/webhook] Payment approved; shipment generation remains pending for explicit admin action:', { pedidoId: pedido.id })
    }

    return res.status(200).end()
  } catch (err) {
    console.error('[mp/webhook] Unexpected error:', err)
    return res.status(503).end()
  }
}

async function resolvePedido(payment) {
  const { external_reference, preference_id, id: mp_payment_id } = payment

  if (preference_id) {
    const { data, error } = await supabaseAdmin
      .from('pedidos_catalogo')
      .select('id, tenant_id, total, mp_preference_id, mp_payment_id, mp_payment_status, estado_pago, pago_confirmado_origen, pago_confirmado_at')
      .eq('mp_preference_id', String(preference_id))
      .limit(2)

    if (error) return { pedido: null, lookupError: error }
    if (data?.length === 1) return { pedido: data[0], lookupError: null }
    if (data?.length > 1) return { pedido: null, lookupError: new Error('Ambiguous MercadoPago preference match') }
  }

  const externalOrderId = parseOrderId(external_reference)
  if (externalOrderId !== null) {
    const { data, error } = await supabaseAdmin
      .from('pedidos_catalogo')
      .select('id, tenant_id, total, mp_preference_id, mp_payment_id, mp_payment_status, estado_pago, pago_confirmado_origen, pago_confirmado_at')
      .eq('id', externalOrderId)
      .limit(2)

    if (error) return { pedido: null, lookupError: error }
    if (data?.length === 1 && matchesPaymentIdentity(data[0], preference_id, mp_payment_id)) {
      return { pedido: data[0], lookupError: null }
    }
    if (data?.length > 1) return { pedido: null, lookupError: new Error('Ambiguous external_reference match') }
  }

  const { data, error } = await supabaseAdmin
    .from('pedidos_catalogo')
    .select('id, tenant_id, total, mp_preference_id, mp_payment_id, mp_payment_status, estado_pago, pago_confirmado_origen, pago_confirmado_at')
    .eq('mp_payment_id', String(mp_payment_id))
    .limit(2)

  if (error) return { pedido: null, lookupError: error }
  if (data?.length === 1 && matchesPaymentIdentity(data[0], preference_id, mp_payment_id, externalOrderId)) {
    return { pedido: data[0], lookupError: null }
  }
  if (data?.length > 1) return { pedido: null, lookupError: new Error('Ambiguous payment ID match') }

  return { pedido: null, lookupError: new Error('No MercadoPago order match') }
}

function matchesPaymentIdentity(pedido, preferenceId, paymentId, externalOrderId = null) {
  if (externalOrderId !== null && String(pedido.id) !== String(externalOrderId)) return false
  if (preferenceId && pedido.mp_preference_id && String(pedido.mp_preference_id) !== String(preferenceId)) return false
  if (paymentId && pedido.mp_payment_id && String(pedido.mp_payment_id) !== String(paymentId)) return false
  return true
}

function parseOrderId(value) {
  const normalized = String(value || '').trim()
  if (!/^\d+$/.test(normalized)) return null
  const orderId = Number(normalized)
  return Number.isSafeInteger(orderId) && orderId > 0 ? orderId : null
}

function shouldIgnorePaymentUpdate(pedido, incomingStatus) {
  if (pedido.pago_confirmado_origen === 'manual_admin') return true
  const currentStatus = String(pedido.mp_payment_status || '').toLowerCase()
  const currentOrderStatus = String(pedido.estado_pago || '').toLowerCase()
  const currentIsApproved = currentStatus === 'approved' || currentOrderStatus === 'pagado' || currentOrderStatus === 'pagado_total'
  if (currentIsApproved && incomingStatus !== 'approved') return true

  const currentIsRejected = TERMINAL_PAYMENT_STATUSES.has(currentStatus) && currentStatus !== 'approved'
  return currentIsRejected && ['pending', 'in_process'].includes(incomingStatus)
}
