import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const rootDir = path.resolve(import.meta.dirname, '..', '..')
const appDir = path.join(rootDir, 'next-app')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function assertIncludes(source, needle, label) {
  assert.ok(source.includes(needle), `${label} must include ${needle}`)
}

function assertNotIncludes(source, needle, label) {
  assert.ok(!source.includes(needle), `${label} must not include ${needle}`)
}

function loadZipnovaModule(env = {}) {
  const sourcePath = path.join(appDir, 'lib', 'shipping', 'providers', 'zipnova.js')
  const source = fs.readFileSync(sourcePath, 'utf8')
  const transformed = source
    .replace(/import \{ CarrierConfigError, CarrierValidationError, normalizePackage \} from '\.\/correoArgentino'\s*/, '')
    .replace(/export async function /g, 'async function ')
    .replace(/export function /g, 'function ')
    .concat(`
module.exports = {
  getZipnovaRates,
  getZipnovaAgencies,
  importZipnovaShipment,
  normalizeZipnovaRate,
  normalizeShipmentResult,
  getZipnovaConfig,
}
`)

  class CarrierConfigError extends Error {
    constructor(message) {
      super(message)
      this.name = 'CarrierConfigError'
    }
  }

  class CarrierValidationError extends Error {
    constructor(message, code) {
      super(message)
      this.name = 'CarrierValidationError'
      this.code = code
    }
  }

  const sandbox = {
    Buffer,
    CarrierConfigError,
    CarrierValidationError,
    normalizePackage(packageData = {}) {
      return {
        weightGrams: packageData.weightGrams || 500,
        heightCm: packageData.heightCm || 10,
        widthCm: packageData.widthCm || 10,
        lengthCm: packageData.lengthCm || 10,
      }
    },
    process: { env },
    module: { exports: {} },
  }

  vm.runInNewContext(transformed, sandbox, { filename: sourcePath })
  return { ...sandbox.module.exports, CarrierConfigError, CarrierValidationError }
}

async function checkZipnovaAdapter() {
  const missingConfig = loadZipnovaModule({})
  assert.throws(() => missingConfig.getZipnovaConfig(), { name: 'CarrierConfigError' }, 'missing Zipnova env must throw a config error')

  const env = {
    ZIPNOVA_BASE_URL: 'https://zipnova.test/v2',
    ZIPNOVA_ACCOUNT_ID: 'account-placeholder',
    ZIPNOVA_ORIGIN_ID: 'origin-placeholder',
    ZIPNOVA_API_TOKEN: 'token-placeholder',
    ZIPNOVA_API_SECRET: 'secret-placeholder',
  }
  const zipnova = loadZipnovaModule(env)
  const fetchCalls = []
  const expectedAuth = `Basic ${Buffer.from(`${env.ZIPNOVA_API_TOKEN}:${env.ZIPNOVA_API_SECRET}`).toString('base64')}`

  const quotesResponse = {
    quotes: [
      {
        id: 'quote-home-1',
        logistic_type: 'home',
        service_type: { code: 'HOME_STD', name: 'Standard home' },
        carrier: { id: 'carrier-1' },
        cost: 1234.56,
        currency: 'ARS',
        estimated_days_min: 2,
        estimated_days_max: 4,
      },
      {
        id: 'quote-pickup-1',
        logistic_type: 'pickup',
        service_type: { code: 'PICKUP_STD', name: 'Pickup standard' },
        carrier: { id: 'carrier-2' },
        price: 900,
        pickup_points: [{ id: 'point-1', name: 'Pickup Point 1', postal_code: '1000', address: 'Main 123', city: 'CABA' }],
      },
      {
        id: 'quote-home-2',
        logistic_type: 'home',
        service_type: { code: 'HOME_EXP', name: 'Express home' },
        carrier: { id: 'carrier-3' },
        cost: 2000,
      },
    ],
  }

  const ratesResult = await zipnova.getZipnovaRates({
    postalCodeDestination: 'C1000ABC',
    provinceCode: 'c',
    package: { weightGrams: 700, heightCm: 8, widthCm: 9, lengthCm: 10 },
  }, {
    async fetch(url, init) {
      fetchCalls.push({ url, init })
      assert.equal(init.headers.Authorization, expectedAuth, 'Zipnova requests must use server-side Basic Auth')
      assertNotIncludes(init.body, env.ZIPNOVA_API_TOKEN, 'quote request body')
      assertNotIncludes(init.body, env.ZIPNOVA_API_SECRET, 'quote request body')
      return { ok: true, text: async () => JSON.stringify(quotesResponse) }
    },
  })

  assert.equal(fetchCalls[0].url, 'https://zipnova.test/v2/quotes')
  assert.equal(ratesResult.available, true)
  assert.equal(ratesResult.rates.length, 2, 'quote curation should keep one home and one pickup option')
  assert.equal(JSON.stringify(ratesResult.rates.map((rate) => rate.deliveryType)), JSON.stringify(['home', 'agency']))
  assert.equal(ratesResult.rates[0].quoteSnapshot.serviceTypeCode, 'HOME_STD')
  assert.equal(ratesResult.rates[1].pickupPoint.code, 'point-1')
  assertNotIncludes(JSON.stringify(ratesResult), env.ZIPNOVA_API_TOKEN, 'normalized rates')
  assertNotIncludes(JSON.stringify(ratesResult), env.ZIPNOVA_API_SECRET, 'normalized rates')

  const agencyWithoutPickup = zipnova.normalizeZipnovaRate({
    id: 'quote-pickup-missing-point',
    logistic_type: 'pickup',
    service_type: { code: 'PICKUP_NO_POINT', name: 'Pickup without embedded point' },
    carrier: { id: 'carrier-4' },
    cost: 750,
  })
  assert.equal(agencyWithoutPickup, null, 'pickup/agency quotes without shopper-selectable pickup point details must not become payable quoted rates')

  const agencies = await zipnova.getZipnovaAgencies({ rates: ratesResult.rates })
  assert.equal(agencies.agencies.length, 1, 'pickup mapping should expose quote-derived pickup points')
  assert.equal(agencies.agencies[0].provider, 'zipnova')

  await assert.rejects(() => zipnova.importZipnovaShipment({ id: 'order-1' }), { name: 'CarrierValidationError' }, 'shipment creation must require explicit admin confirmation')

  const shipment = await zipnova.importZipnovaShipment({
    id: 'order-1',
    adminConfirmed: true,
    shipping_quote_snapshot: ratesResult.rates[0].quoteSnapshot,
  }, {
    async fetch(url, init) {
      assert.equal(url, 'https://zipnova.test/v2/shipments')
      assert.equal(init.method, 'POST')
      assert.equal(init.headers.Authorization, expectedAuth)
      return { ok: true, text: async () => JSON.stringify({ shipment: { id: 'ship-1', tracking_number: 'track-1', status: 'created', label_url: 'https://labels.test/1.pdf' } }) }
    },
  })

  assert.deepEqual({
    imported: shipment.imported,
    provider: shipment.provider,
    shipmentId: shipment.shipmentId,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    labelUrl: shipment.labelUrl,
  }, {
    imported: true,
    provider: 'zipnova',
    shipmentId: 'ship-1',
    trackingNumber: 'track-1',
    status: 'created',
    labelUrl: 'https://labels.test/1.pdf',
  })
}

function checkApiContracts() {
  const rates = read('next-app/pages/api/shipping/rates.js')
  assertIncludes(rates, "req.method !== 'POST'", 'shipping rates API')
  assertIncludes(rates, "res.setHeader('Cache-Control', 'no-store')", 'shipping rates API')
  assertIncludes(rates, 'getShippingRates', 'shipping rates API')

  const agencies = read('next-app/pages/api/shipping/agencies.js')
  assertIncludes(agencies, "req.method !== 'GET'", 'shipping agencies API')
  assertIncludes(agencies, "res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')", 'shipping agencies API')
  assertIncludes(agencies, "provider === 'zipnova'", 'shipping agencies API')
  assertIncludes(agencies, 'hasQuoteDerivedPickupSource', 'shipping agencies API')
  assertIncludes(agencies, 'return res.status(200).json({ agencies: [] })', 'shipping agencies API')

  const checkout = read('next-app/pages/mi-carrito/finalizar-compra.js')
  assertIncludes(checkout, 'selectedShippingRequiresPickup', 'checkout shipping snapshot')
  assertIncludes(checkout, 'selectedShippingHasRequiredPickup', 'checkout shipping snapshot')
  assertIncludes(checkout, 'isSelectedShippingPayableQuote', 'checkout shipping snapshot')
  assertIncludes(checkout, 'const hasQuote = isSelectedShippingPayableQuote', 'checkout shipping snapshot')
  assertIncludes(checkout, 'const paidShippingCost = isSelectedShippingPayableQuote', 'checkout shipping total')

  const adminShipments = read('next-app/pages/api/admin/shipping/shipments.js')
  assertIncludes(adminShipments, 'verifyAdminCookie(req)', 'admin shipment API')
  assertIncludes(adminShipments, "req.method !== 'POST'", 'admin shipment API')
  assertIncludes(adminShipments, "res.setHeader('Allow', ['POST'])", 'admin shipment API')
  assertIncludes(adminShipments, 'importShippingShipment', 'admin shipment API')
  assertIncludes(adminShipments, ".eq('tenant_id', TENANT_ID)", 'admin shipment API')
  assertNotIncludes(adminShipments, ".select('*')", 'admin shipment API')

  const webhook = read('next-app/pages/api/mp/webhook.js')
  assertNotIncludes(webhook, 'importShippingShipment', 'MercadoPago webhook')
  assertIncludes(webhook, 'mp_payment_status: status', 'MercadoPago webhook')
  assertNotIncludes(webhook, 'shipping_import_status', 'MercadoPago webhook')
  assertIncludes(webhook, ".select('id, tenant_id, mp_preference_id')", 'MercadoPago webhook')
  assertIncludes(webhook, ".eq('tenant_id', resolvedTenantId)", 'MercadoPago webhook')

  const createPreference = read('next-app/pages/api/mp/create-preference.js')
  assertIncludes(createPreference, 'addShippingItemOnce', 'MercadoPago preference API')
  assertIncludes(createPreference, "shipping.status !== 'quoted'", 'MercadoPago preference API')
  assert.equal((createPreference.match(/title: shipping\.serviceName/g) || []).length, 1, 'shipping should be appended to MercadoPago items in exactly one place')
}

function checkSecretLeakage() {
  const envExample = read('.env.example')
  assertIncludes(envExample, 'ZIPNOVA_ACCOUNT_ID=', '.env.example')
  assertIncludes(envExample, 'ZIPNOVA_ORIGIN_ID=', '.env.example')
  assertIncludes(envExample, 'ZIPNOVA_API_TOKEN=', '.env.example')
  assertIncludes(envExample, 'ZIPNOVA_API_SECRET=', '.env.example')
  assertNotIncludes(envExample, 'NEXT_PUBLIC_ZIPNOVA', '.env.example')

  for (const relativePath of [
    'next-app/lib/shipping/providers/zipnova.js',
    'next-app/pages/api/shipping/rates.js',
    'next-app/pages/api/shipping/agencies.js',
    'next-app/pages/api/admin/shipping/shipments.js',
    'next-app/pages/api/mp/webhook.js',
  ]) {
    assertNotIncludes(read(relativePath), 'NEXT_PUBLIC_ZIPNOVA', relativePath)
  }
}

await checkZipnovaAdapter()
checkApiContracts()
checkSecretLeakage()

console.log('Zipnova shipping checks passed')
