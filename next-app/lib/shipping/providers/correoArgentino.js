const PROVIDER = 'correo_argentino'
const ORIGIN_POSTAL_CODE = '1842'
const MIN_WEIGHT_GRAMS = 1
const MAX_WEIGHT_GRAMS = 25000
const MAX_SIDE_CM = 150
const TOKEN_REFRESH_SKEW_MS = 60_000

let tokenCache = { token: null, expiresAt: 0 }

export class CarrierValidationError extends Error {
  constructor(message, code = 'carrier_validation_error') {
    super(message)
    this.name = 'CarrierValidationError'
    this.code = code
  }
}

export class CarrierConfigError extends Error {
  constructor(message, code = 'carrier_config_error') {
    super(message)
    this.name = 'CarrierConfigError'
    this.code = code
  }
}

export const isCarrierValidationError = (error) => error instanceof CarrierValidationError || error?.name === 'CarrierValidationError'
export const isCarrierConfigError = (error) => error instanceof CarrierConfigError || error?.name === 'CarrierConfigError'

export async function getCorreoRates(input, options = {}) {
  const config = getCorreoConfig()
  const pkg = normalizePackage(input?.package)
  const postalCodeDestination = normalizePostalCode(input?.postalCodeDestination)
  if (!postalCodeDestination) throw new CarrierValidationError('postalCodeDestination is required', 'missing_destination_postal_code')

  const response = await correoFetch('/rates', {
    method: 'POST',
    body: JSON.stringify({
      customerId: config.customerId,
      postalCodeOrigin: ORIGIN_POSTAL_CODE,
      postalCodeDestination,
      weight: pkg.weightGrams,
      height: pkg.heightCm,
      width: pkg.widthCm,
      length: pkg.lengthCm,
    }),
  }, config, options)

  const rates = extractList(response).map((rate) => normalizeRate(rate, input?.deliveryType)).filter(Boolean)
  return { available: rates.length > 0, rates }
}

export async function getCorreoAgencies(input, options = {}) {
  const config = getCorreoConfig()
  const provinceCode = String(input?.provinceCode || '').trim().toUpperCase()
  if (!provinceCode) throw new CarrierValidationError('provinceCode is required', 'missing_province_code')

  const params = new URLSearchParams({ customerId: config.customerId, provinceCode })
  normalizeServices(input?.services).forEach((service) => params.append('services', service))
  const response = await correoFetch(`/agencies?${params.toString()}`, { method: 'GET' }, config, options)
  return { agencies: extractList(response).map(normalizeAgency).filter(Boolean) }
}

export async function importCorreoShipment(order, options = {}) {
  const config = getCorreoConfig()
  const response = await correoFetch('/shipping/import', {
    method: 'POST',
    body: JSON.stringify(buildImportPayload(order, config.customerId)),
  }, config, options)
  return normalizeImportResult(response)
}

export function normalizePackage(pkg) {
  const weightKg = positiveNumber(pkg?.weightKg)
  const lengthCm = positiveNumber(pkg?.lengthCm)
  const widthCm = positiveNumber(pkg?.widthCm)
  const heightCm = positiveNumber(pkg?.heightCm)
  if (!weightKg || !lengthCm || !widthCm || !heightCm) {
    throw new CarrierValidationError('Package weight and dimensions are required', 'missing_package_data')
  }

  const weightGrams = Math.round(weightKg * 1000)
  if (weightGrams < MIN_WEIGHT_GRAMS || weightGrams > MAX_WEIGHT_GRAMS) {
    throw new CarrierValidationError('Package weight must be between 1g and 25000g', 'invalid_package_weight')
  }
  if ([lengthCm, widthCm, heightCm].some((side) => side > MAX_SIDE_CM)) {
    throw new CarrierValidationError('Package dimensions must not exceed 150cm per side', 'invalid_package_dimensions')
  }
  return { weightKg, weightGrams, lengthCm, widthCm, heightCm }
}

export function normalizeRate(rate, requestedDeliveryType) {
  const deliveryType = inferDeliveryType(rate)
  if (requestedDeliveryType && deliveryType !== requestedDeliveryType) return null

  const cost = numberValue(rate?.cost ?? rate?.price ?? rate?.amount ?? rate?.tarifa ?? rate?.valor ?? rate?.total)
  if (cost == null) return null

  return {
    provider: PROVIDER,
    deliveryType,
    serviceCode: String(rate?.serviceCode ?? rate?.productCode ?? rate?.code ?? rate?.id ?? '').trim(),
    serviceName: String(rate?.serviceName ?? rate?.productName ?? rate?.name ?? rate?.descripcion ?? 'Shipping').trim(),
    cost,
    currency: String(rate?.currency ?? rate?.moneda ?? 'ARS').trim() || 'ARS',
    estimatedDaysMin: integerValue(rate?.estimatedDaysMin ?? rate?.deliveryMinDays ?? rate?.minDays),
    estimatedDaysMax: integerValue(rate?.estimatedDaysMax ?? rate?.deliveryMaxDays ?? rate?.maxDays ?? rate?.deliveryDays),
  }
}

export function normalizeAgency(agency) {
  const code = String(agency?.code ?? agency?.agencyCode ?? agency?.id ?? agency?.sucursal ?? '').trim()
  const name = String(agency?.name ?? agency?.agencyName ?? agency?.nombre ?? agency?.description ?? '').trim()
  if (!code && !name) return null

  return {
    provider: PROVIDER,
    code,
    name,
    provinceCode: String(agency?.provinceCode ?? agency?.province ?? agency?.provincia ?? '').trim().toUpperCase(),
    postalCode: normalizePostalCode(agency?.postalCode ?? agency?.zipCode ?? agency?.codigoPostal),
    address: String(agency?.address ?? agency?.direccion ?? '').trim(),
    city: String(agency?.city ?? agency?.localidad ?? '').trim(),
    services: normalizeServices(agency?.services ?? agency?.servicios),
  }
}

export function normalizeImportResult(result) {
  return {
    provider: PROVIDER,
    imported: true,
    shipmentId: String(result?.shipmentId ?? result?.id ?? result?.shippingId ?? '').trim(),
    trackingNumber: String(result?.trackingNumber ?? result?.tracking ?? result?.numeroSeguimiento ?? '').trim(),
    status: String(result?.status ?? result?.estado ?? 'imported').trim(),
    importedAt: new Date().toISOString(),
  }
}

export function resetCorreoTokenCache() {
  tokenCache = { token: null, expiresAt: 0 }
}

function getCorreoConfig() {
  const baseUrl = String(process.env.CORREO_ARGENTINO_BASE_URL || '').trim().replace(/\/+$/, '')
  const username = String(process.env.CORREO_ARGENTINO_USERNAME || '').trim()
  const password = String(process.env.CORREO_ARGENTINO_PASSWORD || '').trim()
  const customerId = String(process.env.CORREO_ARGENTINO_CUSTOMER_ID || '').trim()
  if (!baseUrl || !username || !password || !customerId) {
    throw new CarrierConfigError('Correo Argentino carrier configuration is incomplete')
  }
  return { baseUrl, username, password, customerId }
}

async function correoFetch(path, init, config, options = {}) {
  const fetchImpl = options.fetch || fetch
  const token = await getToken(config, fetchImpl)
  let response = await authorizedFetch(path, init, config, fetchImpl, token)
  if (response.status === 401) {
    resetCorreoTokenCache()
    response = await authorizedFetch(path, init, config, fetchImpl, await getToken(config, fetchImpl, true))
  }
  return parseCarrierResponse(response)
}

function authorizedFetch(path, init, config, fetchImpl, token) {
  return fetchImpl(`${config.baseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}), Authorization: `Bearer ${token}` },
  })
}

async function getToken(config, fetchImpl, forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && tokenCache.token && tokenCache.expiresAt - TOKEN_REFRESH_SKEW_MS > now) return tokenCache.token

  const basic = Buffer.from(`${config.username}:${config.password}`).toString('base64')
  const body = await parseCarrierResponse(await fetchImpl(`${config.baseUrl}/token`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Basic ${basic}` },
  }))
  const token = body?.token || body?.access_token || body?.accessToken
  if (!token) throw new Error('Correo Argentino token response did not include a token')

  tokenCache = { token, expiresAt: now + Number(body?.expires_in || body?.expiresIn || 3600) * 1000 }
  return token
}

async function parseCarrierResponse(response) {
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}
  if (response.ok) return body

  const error = new Error(body?.message || body?.error || `Carrier request failed with status ${response.status}`)
  error.status = response.status
  throw error
}

function buildImportPayload(order, customerId) {
  if (!order) throw new CarrierValidationError('Order is required for shipment import', 'missing_order')
  return {
    customerId,
    orderId: order.id,
    deliveryType: order.shipping_delivery_type || order.deliveryType,
    serviceCode: order.shipping_service_code || order.serviceCode,
    recipient: order.recipient || order.customer || order.customerData || {},
    destination: order.shipping_destination_snapshot || order.destination || {},
    agency: order.shipping_agency_snapshot || order.agency || null,
    quote: order.shipping_quote_snapshot || order.quote || null,
  }
}

function inferDeliveryType(rate) {
  const explicit = normalizeDeliveryType(rate?.deliveryType || rate?.deliveredType || rate?.tipoEntrega || rate?.tipo_servicio || rate?.type)
  if (explicit) return explicit

  const text = [rate?.serviceName, rate?.productName, rate?.name, rate?.descripcion].map((value) => String(value || '').toLowerCase()).join(' ')
  if (text.includes('sucursal')) return 'agency'
  return 'home'
}

function normalizeDeliveryType(value) {
  const key = String(value || '').trim().toLowerCase()
  return { domicilio: 'home', home: 'home', address: 'home', d: 'home', sucursal: 'agency', agency: 'agency', branch: 'agency', s: 'agency' }[key]
}

function extractList(response) {
  return [response, response?.rates, response?.agencies, response?.data, response?.items, response?.results].find(Array.isArray) || []
}

function normalizeServices(services) {
  if (!services) return []
  return (Array.isArray(services) ? services : String(services).split(',')).map(String).map((value) => value.trim()).filter(Boolean)
}

function normalizePostalCode(value) {
  return String(value || '').replace(/\D/g, '').trim()
}

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function integerValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : null
}
