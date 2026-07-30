import { getShippingRates } from '../../../lib/shipping'
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')
  const {
    provider,
    postalCodeDestination,
    provinceCode,
    destinationCity,
    destinationState,
    declaredValue,
    deliveryType,
    package: packageData,
    items,
  } = req.body || {}

  if (!postalCodeDestination) {
    return res.status(400).json({ available: false, rates: [], error: 'Ingresá tu código postal para calcular el envío.', status: 'missing_destination' })
  }
  if (!destinationCity || !destinationState) {
    return res.status(400).json({
      available: false,
      rates: [],
      error: 'Ingresá ciudad y provincia para calcular el envío con más precisión.',
      status: 'missing_destination',
    })
  }

  const result = await getShippingRates({
    provider,
    postalCodeDestination,
    provinceCode,
    destinationCity,
    destinationState,
    declaredValue,
    deliveryType,
    package: packageData,
    items,
  })

  return res.status(200).json(result)
}
