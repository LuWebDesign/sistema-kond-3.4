import { MercadoPagoConfig, Preference } from 'mercadopago'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
  const preference = new Preference(client)

  const { items, payer, back_urls, external_reference } = req.body

  try {
    const result = await preference.create({
      body: {
        items,
        payer,
        back_urls,
        external_reference,
        auto_return: 'approved',
      },
    })

    return res.status(200).json({
      preference_id: result.id,
      init_point: result.init_point,
    })
  } catch (err) {
    console.error('[mp/create-preference] Error:', err)
    return res.status(500).json({ error: err.message || 'Error creating preference' })
  }
}
