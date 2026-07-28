import { getShippingAgencies, toHttpStatus } from '../../../lib/shipping'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  const { provider, provinceCode, services } = req.query || {}

  if (!provinceCode) {
    return res.status(400).json({ agencies: [], error: 'provinceCode is required' })
  }

  try {
    const result = await getShippingAgencies({ provider, provinceCode, services })
    return res.status(200).json(result)
  } catch (error) {
    console.error('[shipping/agencies] Error:', error)
    return res.status(toHttpStatus(error)).json({ agencies: [], error: safeAgencyError(error) })
  }
}

function safeAgencyError(error) {
  if (error?.name === 'CarrierValidationError') return error.message
  if (error?.name === 'CarrierConfigError') return 'Shipping carrier is not configured'
  return 'Shipping agencies are unavailable'
}
