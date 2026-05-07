import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

  const { topic, id } = req.query

  if (topic !== 'payment') {
    return res.status(200).end()
  }

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

    const { error } = await supabaseAdmin
      .from('pedidos_catalogo')
      .update({
        mp_payment_id: String(mp_payment_id),
        mp_payment_status: status,
        estado_pago,
      })
      .eq('id', external_reference)
      .select('id')

    if (error) {
      console.error('[mp/webhook] Supabase update error:', error)
    }
  } catch (err) {
    console.error('[mp/webhook] Unexpected error:', err)
  }

  return res.status(200).end()
}
