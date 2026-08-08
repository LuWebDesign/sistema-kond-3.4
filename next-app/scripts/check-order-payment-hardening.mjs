import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..', '..')
const api = fs.readFileSync(path.join(rootDir, 'next-app/pages/api/pedidos/catalogo/[id].js'), 'utf8')
const detail = fs.readFileSync(path.join(rootDir, 'next-app/pages/admin/orders/detalle-pedido/[id].js'), 'utf8')
const projection = fs.readFileSync(path.join(rootDir, 'next-app/utils/pedidosCatalogoDetail.js'), 'utf8')
const webhook = fs.readFileSync(path.join(rootDir, 'next-app/pages/api/mp/webhook.js'), 'utf8')

const frontendPaymentFields = {
  mp_preference_id: 'mpPreferenceId',
  mp_payment_id: 'mpPaymentId',
  mp_payment_status: 'mpPaymentStatus',
  pago_confirmado_origen: 'pagoConfirmadoOrigen',
  pago_confirmado_at: 'pagoConfirmadoAt',
}

for (const field of Object.keys(frontendPaymentFields)) {
  assert.match(api, new RegExp(field), `order detail projection must include ${field}`)
  assert.match(projection, new RegExp(frontendPaymentFields[field]), `detail mapping must include ${field}`)
}

assert.match(api, /paymentAction === 'manual_confirm'/, 'manual payment confirmation must be explicit')
assert.match(api, /currentOrder\.metodo_pago === 'mercadopago'/, 'manual confirmation must reject Mercado Pago orders')
assert.match(api, /currentOrder\.mp_payment_status === 'approved'/, 'manual confirmation must protect approved payments')
assert.match(api, /pago_confirmado_origen === 'mercado_pago'/, 'manual confirmation must protect Mercado Pago audit state')
assert.doesNotMatch(api, /if \(payload\.estadoPago !== undefined\) updateData\.estado_pago/, 'normal admin PATCH must not map payment state')
assert.doesNotMatch(api, /if \(payload\.montoRecibido !== undefined\)/, 'normal admin PATCH must not map received amount')
assert.match(detail, /pendingPaymentAction\.current = 'manual_confirm'/, 'manual transfer changes must record a pending explicit action')
assert.match(detail, /paymentAction === 'manual_confirm'/, 'detail save must send the explicit manual confirmation action')
assert.match(detail, /body: JSON\.stringify\(/, 'detail UI must send the authenticated order request body')
assert.match(webhook, /shouldIgnorePaymentUpdate\(pedido, normalizedStatus\)/, 'webhook must retain out-of-order protection')
assert.match(webhook, /currentIsApproved && incomingStatus !== 'approved'/, 'approved webhook state must remain monotonic')
assert.match(webhook, /currentStatus === 'approved'/, 'duplicate approved webhook must be idempotently ignored')
assert.match(webhook, /pago_confirmado_at: pedido\.pago_confirmado_at \|\| new Date\(\)\.toISOString\(\)/, 'duplicate approved webhook must preserve original pago_confirmado_at')

console.log('Order payment hardening checks passed')
