import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FAILED_PAYMENT_STATUSES = new Set(['rejected', 'cancelled'])
const PAID_ORDER_STATUSES = new Set(['pagado', 'pagado_total'])
const INTERNAL_MP_PREFERENCE_CLAIM_PREFIX = 'kond-mp-claim:'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  const preference = new Preference(client)

  const { payer, back_urls, external_reference } = req.body
  let preferenceClaimId = null

  try {
    const order = await getOrderForPreference(external_reference)
    assertPreferenceCanBeCreated(order)
    const preferenceItems = buildPreferenceItems(order)
    assertPreferenceTotalMatchesOrder(preferenceItems, order)
    preferenceClaimId = await claimPreferenceCreation(order.id)

    const result = await preference.create({
      body: {
        items: preferenceItems,
        payer,
        back_urls,
        external_reference,
        auto_return: 'approved',
      },
    })
    if (!result.id) throw new Error('MercadoPago did not return a preference id')
    await persistPreferenceId(external_reference, result.id, preferenceClaimId)

    return res.status(200).json({
      preference_id: result.id,
      init_point: result.init_point,
    })
  } catch (err) {
    if (preferenceClaimId) {
      await clearPreferenceClaim(external_reference, preferenceClaimId)
    }
    console.error('[mp/create-preference] Error:', err)
    return res.status(err.statusCode || 500).json({ error: err.message || 'Error creating preference' })
  }
}

function addShippingItemOnce(items, shipping) {
  const preferenceItems = Array.isArray(items) ? [...items] : []
  const costCents = currencyToCents(shipping?.cost)
  if (!shipping || shipping.status !== 'quoted' || !(costCents > 0)) return preferenceItems

  return [
    ...preferenceItems,
    {
      title: shipping.serviceName ? `Shipping - ${shipping.serviceName}` : 'Shipping',
      quantity: 1,
      unit_price: centsToCurrency(costCents),
      currency_id: shipping.currency || 'ARS',
    }
  ]
}

async function getOrderForPreference(orderId) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenantId) throw new Error('NEXT_PUBLIC_TENANT_ID is required to create MercadoPago preference')
  if (!orderId) throw new Error('external_reference is required')

  const { data, error } = await supabaseAdmin
    .from('pedidos_catalogo')
    .select(`
      id, total, estado_pago, mp_preference_id, mp_payment_status,
      shipping_status, shipping_service_name, shipping_cost, shipping_currency
    `)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) throw new Error('Order not found for MercadoPago preference')
  return data
}

function buildPreferenceItems(order) {
  const orderTotalCents = currencyToCents(order.total)
  const shippingCostCents = order.shipping_status === 'quoted' ? currencyToCents(order.shipping_cost) : 0
  const productAmountCents = orderTotalCents - shippingCostCents
  if (!(productAmountCents > 0)) throw new Error('Invalid order amount for MercadoPago preference')

  const items = [{
    title: 'Order products',
    quantity: 1,
    unit_price: centsToCurrency(productAmountCents),
    currency_id: 'ARS',
  }]

  return addShippingItemOnce(items, {
    status: order.shipping_status,
    serviceName: order.shipping_service_name,
    cost: order.shipping_cost,
    currency: order.shipping_currency,
  })
}

function assertPreferenceTotalMatchesOrder(items, order) {
  const preferenceTotalCents = items.reduce((sum, item) => {
    return sum + currencyToCents(item.unit_price) * (Number(item.quantity) || 1)
  }, 0)
  const orderTotalCents = currencyToCents(order.total)

  if (preferenceTotalCents !== orderTotalCents) {
    throw new Error('MercadoPago amount does not match the persisted order total')
  }
}

function assertPreferenceCanBeCreated(order) {
  const paymentStatus = String(order.mp_payment_status || 'none').toLowerCase()
  const orderPaymentStatus = String(order.estado_pago || '').toLowerCase()

  if (PAID_ORDER_STATUSES.has(orderPaymentStatus) || paymentStatus === 'approved') {
    throw httpError(409, 'This order already has a terminal payment state')
  }

  if (order.mp_preference_id && !FAILED_PAYMENT_STATUSES.has(paymentStatus)) {
    throw httpError(409, 'This order already has an active MercadoPago preference')
  }
}

async function claimPreferenceCreation(orderId) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenantId) throw new Error('NEXT_PUBLIC_TENANT_ID is required to claim MercadoPago preference creation')

  const claimId = `${INTERNAL_MP_PREFERENCE_CLAIM_PREFIX}${orderId}:${Date.now()}`
  const { error } = await supabaseAdmin
    .from('pedidos_catalogo')
    .update({ mp_preference_id: claimId, mp_payment_status: 'pending' })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .or('mp_preference_id.is.null,mp_payment_status.in.(rejected,cancelled)')
    .or('mp_payment_status.is.null,mp_payment_status.eq.none,mp_payment_status.eq.rejected,mp_payment_status.eq.cancelled')
    .select('id')
    .single()

  if (error) throw httpError(409, 'This order already has an active MercadoPago preference')
  return claimId
}

async function persistPreferenceId(orderId, preferenceId, claimId) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenantId) throw new Error('NEXT_PUBLIC_TENANT_ID is required to persist MercadoPago preference')

  const { error } = await supabaseAdmin
    .from('pedidos_catalogo')
    .update({ mp_preference_id: preferenceId, mp_payment_status: 'pending' })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .eq('mp_preference_id', claimId)
    .eq('mp_payment_status', 'pending')
    .select('id')
    .single()

  if (error) throw httpError(409, 'MercadoPago preference could not be attached because the order already has a payment preference or terminal state')
}

async function clearPreferenceClaim(orderId, claimId) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenantId) return

  const { error } = await supabaseAdmin
    .from('pedidos_catalogo')
    .update({ mp_preference_id: null, mp_payment_status: 'none' })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .eq('mp_preference_id', claimId)
    .eq('mp_payment_status', 'pending')

  if (error) console.error('[mp/create-preference] Could not clear failed preference claim:', error)
}

function currencyToCents(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round((number + Number.EPSILON) * 100)
}

function centsToCurrency(cents) {
  return Number((cents / 100).toFixed(2))
}

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}
