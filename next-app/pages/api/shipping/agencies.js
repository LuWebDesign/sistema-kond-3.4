import { getShippingAgencies, toHttpStatus } from '../../../lib/shipping'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  const { provider, provinceCode, services, quoteSnapshot, rates } = req.query || {}
  const parsedQuoteSnapshot = parseJsonQueryValue(quoteSnapshot)
  const parsedRates = parseJsonQueryValue(rates)

  if (!provinceCode && !hasQuoteDerivedPickupSource(parsedQuoteSnapshot) && !hasQuoteDerivedPickupSource(parsedRates)) {
    return res.status(400).json({ agencies: [], error: 'provinceCode is required' })
  }

  try {
    const result = await getShippingAgencies({
      provider,
      provinceCode,
      services,
      quoteSnapshot: parsedQuoteSnapshot,
      rates: parsedRates,
    })
    return res.status(200).json(result)
  } catch (error) {
    console.error('[shipping/agencies] Error:', error)
    if (provider === 'zipnova') return res.status(200).json({ agencies: [] })
    return res.status(toHttpStatus(error)).json({ agencies: [], error: safeAgencyError(error) })
  }
}

function hasQuoteDerivedPickupSource(value) {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return items.some((item) => item?.pickupPoint || item?.pickup_point || item?.quoteSnapshot?.pickupPoint || item?.quote_snapshot?.pickup_point)
}

function parseJsonQueryValue(value) {
  if (!value) return null
  try {
    return JSON.parse(Array.isArray(value) ? value[0] : value)
  } catch {
    return null
  }
}

function safeAgencyError(error) {
  if (error?.name === 'CarrierValidationError') return error.message
  if (error?.name === 'CarrierConfigError') return 'Shipping carrier is not configured'
  return 'Shipping agencies are unavailable'
}
