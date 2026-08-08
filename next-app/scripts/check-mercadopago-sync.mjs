import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..', '..')
const createPreference = fs.readFileSync(path.join(rootDir, 'next-app/pages/api/mp/create-preference.js'), 'utf8')
const webhook = fs.readFileSync(path.join(rootDir, 'next-app/pages/api/mp/webhook.js'), 'utf8')

assert.match(createPreference, /notification_url:.*\/api\/mp\/webhook/, 'preference creation must configure the webhook URL')
assert.match(createPreference, /NEXT_PUBLIC_BASE_URL/, 'preference creation must use the established public URL env')
assert.match(webhook, /\.eq\('mp_preference_id', String\(preference_id\)\)/, 'webhook must resolve by preference first')
assert.match(webhook, /parseOrderId\(external_reference\)/, 'webhook fallback must validate external_reference')
assert.match(webhook, /\.eq\('mp_payment_id', String\(mp_payment_id\)\)/, 'webhook must support payment ID fallback')
assert.match(webhook, /return res\.status\(503\)\.end\(\)/, 'unresolved/transient webhook events must remain retryable')
assert.match(webhook, /shouldIgnorePaymentUpdate/, 'webhook must preserve payment status monotonicity')
assert.match(webhook, /monto_recibido: Number\(pedido\.total/, 'approved payments must confirm the received amount')
assert.match(webhook, /pago_confirmado_origen: 'mercado_pago'/, 'approved payments must record their confirmation source')
assert.match(webhook, /pago_confirmado_origen === 'manual_admin'/, 'manual admin confirmation must be protected from webhook regressions')
assert.match(webhook, /pago_confirmado_at: pedido\.pago_confirmado_at \|\| new Date\(\)\.toISOString\(\)/, 'duplicate approved notifications must preserve the original audit timestamp')
assert.match(webhook, /\.eq\('tenant_id', resolvedTenantId\)/, 'payment update must remain tenant scoped')
assert.doesNotMatch(webhook, /select\('\*'\)/, 'webhook must use explicit Supabase projections')

console.log('Mercado Pago synchronization checks passed')
