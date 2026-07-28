import { getShippingRates } from '../../../lib/shipping'
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')
  const { provider, postalCodeDestination, provinceCode, deliveryType, package: packageData } = req.body || {}

  if (!postalCodeDestination) {
    return res.status(400).json({ available: false, rates: [], error: 'postalCodeDestination is required' })
  }

  const result = await getShippingRates({
    provider,
    postalCodeDestination,
    provinceCode,
    deliveryType,
    package: packageData,
  })

  return res.status(200).json(result)
}
