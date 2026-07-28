import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  const preference = new Preference(client)

  const { items, payer, back_urls, external_reference, shipping } = req.body

  try {
    const preferenceItems = addShippingItemOnce(items, shipping)
    const result = await preference.create({
      body: {
        items: preferenceItems,
        payer,
        back_urls,
        external_reference,
        auto_return: 'approved',
      },
    })

    if (result.id && external_reference) {
      await persistPreferenceId(external_reference, result.id)
    }

    return res.status(200).json({
      preference_id: result.id,
      init_point: result.init_point,
    })
  } catch (err) {
    console.error('[mp/create-preference] Error:', err)
    return res.status(500).json({ error: err.message || 'Error creating preference' })
  }
}

function addShippingItemOnce(items, shipping) {
  const preferenceItems = Array.isArray(items) ? [...items] : []
  const cost = Number(shipping?.cost || 0)
  if (!shipping || shipping.status !== 'quoted' || !(cost > 0)) return preferenceItems

  return [
    ...preferenceItems,
    {
      title: shipping.serviceName ? `Shipping - ${shipping.serviceName}` : 'Shipping',
      quantity: 1,
      unit_price: Math.round(cost),
      currency_id: shipping.currency || 'ARS',
    }
  ]
}

async function persistPreferenceId(orderId, preferenceId) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenantId) throw new Error('NEXT_PUBLIC_TENANT_ID is required to persist MercadoPago preference')

  const { error } = await supabaseAdmin
    .from('pedidos_catalogo')
    .update({ mp_preference_id: preferenceId, mp_payment_status: 'pending' })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)

  if (error) throw error
}
