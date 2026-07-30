import { CarrierConfigError, CarrierValidationError, normalizePackage } from './correoArgentino'

const PROVIDER = 'zipnova'
const DEFAULT_BASE_URL = 'https://api.zipnova.com.ar/v2'
const DEFAULT_TIMEOUT_MS = 12000
const ORIGIN_VALIDATION_TTL_MS = 5 * 60 * 1000
const ORIGIN_VALIDATION_TRANSIENT_TTL_MS = 60 * 1000
const ORIGIN_VALIDATION_TIMEOUT_MS = 1500

let originValidationCache = { key: null, expiresAt: 0, error: null }

export async function getZipnovaRates(input, options = {}) {
  const config = getZipnovaConfig()
  const pkg = normalizePackage(input?.package)
  const postalCodeDestination = normalizePostalCode(input?.postalCodeDestination)
  if (!postalCodeDestination) throw new CarrierValidationError('postalCodeDestination is required', 'missing_destination_postal_code')

  await validateZipnovaOrigin(config, options)

  const response = await zipnovaFetch('/shipments/quote', {
    method: 'POST',
    body: JSON.stringify(buildQuotePayload(input, pkg, postalCodeDestination, config)),
  }, config, options)

  const rates = curateRates(extractList(response), input?.deliveryType)
  return { available: rates.length > 0, rates }
}

export async function getZipnovaAgencies(input) {
  const source = input?.quotes || input?.rates || input?.quote || input?.quoteSnapshot || input?.rate || input?.shipping_quote_snapshot
  const points = (Array.isArray(source) ? source : source ? [source] : [])
    .flatMap((item) => extractPickupPoints(item))
    .map(normalizePickupPoint)
    .filter(Boolean)

  return { agencies: dedupeBy(points, (point) => point.code || point.name) }
}

export async function importZipnovaShipment(order, options = {}) {
  const config = getZipnovaConfig()
  if (!order) throw new CarrierValidationError('Order is required for shipment import', 'missing_order')
  if (!order.adminConfirmed && !order.confirmedByAdmin) {
    throw new CarrierValidationError('Zipnova shipment creation requires explicit admin confirmation', 'missing_admin_confirmation')
  }

  let response
  try {
    response = await zipnovaFetch('/shipments', {
      method: 'POST',
      body: JSON.stringify(buildShipmentPayload(order, config)),
      headers: buildShipmentIdempotencyHeaders(order),
    }, config, { ...options, ambiguousOkJsonParseFailure: true })
  } catch (error) {
    if (isAmbiguousCreateFailure(error)) {
      throw new AmbiguousZipnovaShipmentError('Zipnova shipment creation result is unknown; manual follow-up is required', error)
    }
    throw error
  }

  return normalizeShipmentResult(response)
}

class AmbiguousZipnovaShipmentError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'AmbiguousZipnovaShipmentError'
    this.cause = cause
    this.ambiguousExternalCreate = true
  }
}

export function normalizeZipnovaRate(rate, requestedDeliveryType) {
  const deliveryType = inferDeliveryType(rate)
  if (!deliveryType || (requestedDeliveryType && deliveryType !== requestedDeliveryType)) return null

  const amounts = rate?.amounts || {}
  const cost = numberValue(rate?.cost ?? rate?.price ?? rate?.amount ?? rate?.total ?? rate?.value ?? rate?.tariff ?? amounts.price_incl_tax ?? amounts.price ?? amounts.seller_price_incl_tax ?? amounts.seller_price)
  if (cost == null) return null

  const pickupPoint = deliveryType === 'agency' ? normalizePickupPoint(extractPickupPoints(rate)[0]) : null
  if (deliveryType === 'agency' && !pickupPoint) return null
  const serviceType = rate?.service_type || rate?.serviceType || rate?.service || {}
  const carrier = rate?.carrier || rate?.company || rate?.operator || {}

  return {
    provider: PROVIDER,
    deliveryType,
    serviceCode: stringValue(serviceType?.code ?? rate?.serviceCode ?? rate?.service_code ?? rate?.code ?? rate?.id),
    serviceName: stringValue(serviceType?.name ?? rate?.serviceName ?? rate?.service_name ?? rate?.name ?? rate?.description) || labelFor(deliveryType),
    cost,
    currency: stringValue(rate?.currency ?? rate?.moneda) || 'ARS',
    estimatedDaysMin: integerValue(rate?.estimatedDaysMin ?? rate?.estimated_days_min ?? rate?.minDays ?? rate?.delivery_min_days),
    estimatedDaysMax: integerValue(rate?.estimatedDaysMax ?? rate?.estimated_days_max ?? rate?.maxDays ?? rate?.delivery_max_days ?? rate?.deliveryDays),
    pickupPoint,
    quoteSnapshot: {
      provider: PROVIDER,
      logisticType: stringValue(rate?.logistic_type ?? rate?.logisticType),
      serviceTypeCode: stringValue(serviceType?.code ?? rate?.service_type_code ?? rate?.serviceCode ?? rate?.code),
      carrierId: stringValue(carrier?.id ?? rate?.carrier_id ?? rate?.carrierId),
      quoteId: stringValue(rate?.quote_id ?? rate?.quoteId ?? rate?.id),
      pointId: stringValue(pickupPoint?.code ?? rate?.point_id ?? rate?.pointId),
      pickupPoint,
    },
  }
}

export function normalizeShipmentResult(result) {
  const shipment = result?.shipment || result?.data || result || {}
  return {
    imported: true,
    provider: PROVIDER,
    shipmentId: stringValue(shipment?.shipmentId ?? shipment?.shipment_id ?? shipment?.id),
    trackingNumber: stringValue(shipment?.trackingNumber ?? shipment?.tracking_number ?? shipment?.tracking ?? shipment?.code),
    status: stringValue(shipment?.status ?? shipment?.state) || 'imported',
    labelUrl: stringValue(shipment?.labelUrl ?? shipment?.label_url ?? shipment?.label),
    importedAt: new Date().toISOString(),
  }
}

export function getZipnovaConfig() {
  const baseUrl = stringValue(process.env.ZIPNOVA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const token = stringValue(process.env.ZIPNOVA_API_TOKEN)
  const secret = stringValue(process.env.ZIPNOVA_API_SECRET)
  const accountId = stringValue(process.env.ZIPNOVA_ACCOUNT_ID)
  const originId = stringValue(process.env.ZIPNOVA_ORIGIN_ID)

  if (!baseUrl || !token || !secret || !accountId || !originId) {
    throw new CarrierConfigError('Zipnova carrier configuration is incomplete')
  }

  return { baseUrl, token, secret, accountId, originId }
}

function buildQuotePayload(input, pkg, postalCodeDestination, config) {
  const destinationState = stringValue(input?.destinationState || input?.state || input?.provinceName || input?.provinceCode)
  const destinationCity = stringValue(input?.destinationCity || input?.city || input?.locality || destinationState)

  return {
    account_id: config.accountId,
    origin_id: config.originId,
    source: 'sistema-kond',
    declared_value: Math.max(1, Math.round(numberValue(input?.declaredValue ?? input?.declared_value) ?? 1)),
    items: buildQuoteItems(input, pkg),
    destination: {
      city: destinationCity,
      state: destinationState,
      zipcode: postalCodeDestination,
    },
  }
}

function buildQuoteItems(input, pkg) {
  const sourceItems = Array.isArray(input?.items) && input.items.length > 0 ? input.items : [input?.item || {}]
  return sourceItems.map((item, index) => ({
    sku: stringValue(item?.sku || item?.id || item?.productId || item?.idProducto) || `kond-item-${index + 1}`,
    weight: Math.max(1, Math.round(numberValue(item?.weight ?? item?.weightGrams) ?? pkg.weightGrams)),
    height: Math.max(1, Math.round(numberValue(item?.height ?? item?.heightCm) ?? pkg.heightCm)),
    width: Math.max(1, Math.round(numberValue(item?.width ?? item?.widthCm) ?? pkg.widthCm)),
    length: Math.max(1, Math.round(numberValue(item?.length ?? item?.lengthCm) ?? pkg.lengthCm)),
    description: stringValue(item?.description || item?.name) || 'KOND checkout item',
    classification_id: integerValue(item?.classification_id ?? item?.classificationId) || 1,
  }))
}

function buildShipmentPayload(order, config) {
  const quote = order.shipping_quote_snapshot || order.quote || {}
  return {
    account_id: config.accountId,
    origin_id: config.originId,
    external_reference: stringValue(order.id || order.external_reference),
    logistic_type: quote.logisticType || quote.logistic_type,
    service_type: { code: quote.serviceTypeCode || quote.service_type_code || order.shipping_service_code },
    carrier: { id: quote.carrierId || quote.carrier_id },
    point_id: quote.pointId || quote.point_id,
    recipient: order.recipient || order.customer || order.customerData || {},
    destination: order.shipping_destination_snapshot || order.destination || {},
    agency: order.shipping_agency_snapshot || order.agency || quote.pickupPoint || null,
  }
}

function buildShipmentIdempotencyHeaders(order) {
  const externalReference = stringValue(order.id || order.external_reference)
  return externalReference ? { 'Idempotency-Key': `kond-zipnova-shipment-${externalReference}` } : {}
}

async function validateZipnovaOrigin(config, options = {}) {
  const now = Date.now()
  const cacheKey = `${config.baseUrl}|${config.accountId}|${config.originId}`
  if (originValidationCache.key === cacheKey && originValidationCache.expiresAt > now) {
    if (originValidationCache.error) throw originValidationCache.error
    return
  }

  try {
    const response = await zipnovaFetch(`/addresses/${encodeURIComponent(config.originId)}`, { method: 'GET' }, config, {
      ...options,
      timeoutMs: Number(options.originValidationTimeoutMs ?? process.env.ZIPNOVA_ORIGIN_VALIDATION_TIMEOUT_MS ?? ORIGIN_VALIDATION_TIMEOUT_MS),
    })
    const address = normalizeAddressResponse(response)
    assertZipnovaOriginIsUsable(address, config)
    originValidationCache = { key: cacheKey, expiresAt: now + ORIGIN_VALIDATION_TTL_MS, error: null }
  } catch (error) {
    const validationError = normalizeOriginValidationError(error)
    if (validationError) {
      originValidationCache = { key: cacheKey, expiresAt: now + ORIGIN_VALIDATION_TTL_MS, error: validationError }
      throw validationError
    }

    if (!error?.status || error.status >= 500) {
      originValidationCache = { key: cacheKey, expiresAt: now + ORIGIN_VALIDATION_TRANSIENT_TTL_MS, error: null }
      return
    }
    throw error
  }
}

function normalizeAddressResponse(response) {
  return response?.address || response?.data?.address || response?.data || response
}

function assertZipnovaOriginIsUsable(address, config) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    throw new CarrierValidationError('Zipnova origin address is not available', 'origin_not_found')
  }
  if (address.use_for_shipping === false) {
    throw new CarrierValidationError('Zipnova origin is not enabled for shipping', 'origin_not_enabled_for_shipping')
  }

  const accounts = Array.isArray(address.accounts) ? address.accounts : null
  if (!accounts || accounts.length === 0) return

  const account = accounts.find((item) => stringValue(item?.id) === config.accountId)
  if (!account) {
    throw new CarrierValidationError('Zipnova origin does not belong to the configured account', 'origin_account_mismatch')
  }
  if (account.options?.use_for_shipping === false) {
    throw new CarrierValidationError('Zipnova origin is not enabled for shipping on the configured account', 'origin_not_enabled_for_shipping')
  }
}

function normalizeOriginValidationError(error) {
  if (error?.name === 'CarrierValidationError') return error
  if (error?.status === 403) {
    return new CarrierValidationError('Zipnova origin address is not accessible', 'origin_not_accessible')
  }
  if (error?.status === 404) {
    return new CarrierValidationError('Zipnova origin address was not found', 'origin_not_found')
  }
  return null
}

async function zipnovaFetch(path, init, config, options = {}) {
  const fetchImpl = options.fetch || fetch
  const { signal, clear } = buildTimeoutSignal(options)
  const basic = Buffer.from(`${config.token}:${config.secret}`).toString('base64')
  try {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
        Authorization: `Basic ${basic}`,
      },
    })
    return parseCarrierResponse(response, options)
  } finally {
    clear()
  }
}

function buildTimeoutSignal(options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? process.env.ZIPNOVA_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  if (!(timeoutMs > 0) || typeof AbortController === 'undefined') {
    return { signal: options.signal, clear: () => {} }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  if (typeof timeout.unref === 'function') timeout.unref()

  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

async function parseCarrierResponse(response, options = {}) {
  const text = await response.text()
  let body = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch (error) {
      if (response.ok && options.ambiguousOkJsonParseFailure) {
        throw new AmbiguousZipnovaShipmentError('Zipnova shipment creation returned malformed JSON after a successful response; manual follow-up is required', error)
      }
      if (response.ok) throw error
      body = {}
    }
  }
  if (response.ok) return body

  const error = new Error(body?.message || body?.error || `Carrier request failed with status ${response.status}`)
  error.status = response.status
  throw error
}

function isAmbiguousCreateFailure(error) {
  if (!error) return false
  if (error.status) return false
  return ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name) || !!error.code
}

function curateRates(rates, requestedDeliveryType) {
  const normalized = rates.map((rate) => normalizeZipnovaRate(rate, requestedDeliveryType)).filter(Boolean)
  return ['home', 'agency'].map((type) => normalized.find((rate) => rate.deliveryType === type)).filter(Boolean)
}

function inferDeliveryType(rate) {
  const serviceType = rate?.service_type || rate?.serviceType || {}
  const explicit = normalizeDeliveryType(rate?.deliveryType || rate?.delivery_type || serviceType?.code || serviceType?.name || rate?.logistic_type || rate?.type)
  if (explicit) return explicit

  if (extractPickupPoints(rate).length > 0) return 'agency'
  const text = [rate?.serviceName, rate?.service_name, rate?.name, rate?.description, rate?.logistic_type]
    .map((value) => String(value || '').toLowerCase())
    .join(' ')
  if (text.includes('sucursal') || text.includes('pickup') || text.includes('point')) return 'agency'
  return 'home'
}

function extractPickupPoints(value) {
  return [
    value?.pickupPoint,
    value?.pickup_point,
    value?.point,
    value?.agency,
    value?.branch,
    value?.points,
    value?.pickup_points,
    value?.quoteSnapshot?.pickupPoint,
    value?.quote_snapshot?.pickup_point,
  ]
    .flatMap((item) => Array.isArray(item) ? item : item ? [item] : [])
}

function normalizePickupPoint(point) {
  if (!point) return null
  const code = stringValue(point?.code ?? point?.id ?? point?.point_id ?? point?.pointId)
  const name = stringValue(point?.name ?? point?.description ?? point?.branch_name)
  if (!code && !name) return null
  return {
    provider: PROVIDER,
    code,
    name,
    provinceCode: stringValue(point?.provinceCode ?? point?.province_code ?? point?.province).toUpperCase(),
    postalCode: normalizePostalCode(point?.postalCode ?? point?.postal_code ?? point?.zipCode),
    address: stringValue(point?.address ?? point?.street),
    city: stringValue(point?.city ?? point?.locality),
  }
}

function extractList(response) {
  const results = response?.results && typeof response.results === 'object' && !Array.isArray(response.results)
    ? Object.values(response.results)
    : response?.results

  return [
    response,
    response?.rates,
    response?.quotes,
    response?.data,
    response?.items,
    results,
    response?.all_results,
    response?.data?.rates,
    response?.data?.quotes,
    response?.data?.items,
    response?.data?.results,
    response?.data?.all_results,
  ].find(Array.isArray) || []
}

function dedupeBy(items, keyFn) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyFn(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function labelFor(deliveryType) {
  return deliveryType === 'agency' ? 'Pickup point shipping' : 'Home delivery shipping'
}

function normalizeDeliveryType(value) {
  const key = String(value || '').trim().toLowerCase()
  return { home: 'home', domicilio: 'home', address: 'home', door: 'home', standard_delivery: 'home', agency: 'agency', pickup: 'agency', pickup_point: 'agency', point: 'agency', branch: 'agency', sucursal: 'agency' }[key]
}

function normalizePostalCode(value) {
  return String(value || '').replace(/\D/g, '').trim()
}

function stringValue(value) {
  return String(value ?? '').trim()
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function integerValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : null
}
