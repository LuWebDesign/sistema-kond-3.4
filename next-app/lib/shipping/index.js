import {
  getCorreoAgencies,
  getCorreoRates,
  importCorreoShipment,
  isCarrierConfigError,
  isCarrierValidationError,
} from './providers/correoArgentino'
import { getZipnovaAgencies, getZipnovaRates, importZipnovaShipment } from './providers/zipnova'

export const SHIPPING_PROVIDER = 'zipnova'
export const DELIVERY_TYPES = { HOME: 'home', AGENCY: 'agency' }

const PROVIDERS = {
  zipnova: {
    getRates: getZipnovaRates,
    getAgencies: getZipnovaAgencies,
    importShipment: importZipnovaShipment,
  },
  correo_argentino: {
    getRates: getCorreoRates,
    getAgencies: getCorreoAgencies,
    importShipment: importCorreoShipment,
  },
}

export function getShippingProvider(provider = SHIPPING_PROVIDER) {
  const selected = PROVIDERS[provider]
  if (!selected) throw new Error(`Unsupported shipping provider: ${provider}`)
  return selected
}

export async function getShippingRates(input) {
  const provider = input?.provider || SHIPPING_PROVIDER
  try {
    return await getShippingProvider(provider).getRates({ ...input, provider })
  } catch (error) {
    return normalizeUnavailableQuote(error)
  }
}

export function getShippingAgencies(input) {
  const provider = input?.provider || SHIPPING_PROVIDER
  return getShippingProvider(provider).getAgencies({ ...input, provider })
}

export function importShippingShipment(input) {
  const provider = input?.provider || input?.shipping_provider || SHIPPING_PROVIDER
  return getShippingProvider(provider).importShipment({ ...input, provider })
}

export function normalizeUnavailableQuote(error) {
  const status = isCarrierValidationError(error) ? 'invalid_package' : 'carrier_unavailable'
  return { available: false, rates: [], status, error: { code: error?.code || status, message: safeErrorMessage(error) } }
}

export function toHttpStatus(error) {
  if (isCarrierValidationError(error)) return 400
  if (isCarrierConfigError(error)) return 503
  return 502
}

function safeErrorMessage(error) {
  if (isCarrierValidationError(error)) return error.message
  if (isCarrierConfigError(error)) return 'Shipping carrier is not configured'
  return 'Shipping quote is unavailable'
}
