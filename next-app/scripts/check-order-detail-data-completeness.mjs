import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const root = new URL('../../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
const changedFiles = status
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => line.slice(3))

const allowedFiles = new Set([
  'supabase/schema.sql',
  'supabase/migrations/2026-08-08-add-order-contact-fields.sql',
  'next-app/utils/supabasePedidos.js',
  'next-app/utils/pedidosCatalogoDetail.js',
  'next-app/pages/api/pedidos/catalogo/[id].js',
  'next-app/pages/api/admin/shipping/shipments.js',
  'next-app/components/OrderCatalogDetailView.js',
  'next-app/scripts/check-order-detail-data-completeness.mjs',
])

assert(changedFiles.every(file => allowedFiles.has(file)), `Unexpected file changed: ${changedFiles.find(file => !allowedFiles.has(file))}`)
assert(!changedFiles.some(file => /(^|\/)(mp|auth|middleware|security|payment|verifyAdminCookie)/i.test(file) || /rls/i.test(file)), 'Payment/security file was modified')

const pedidos = read('next-app/utils/supabasePedidos.js')
const mapper = read('next-app/utils/pedidosCatalogoDetail.js')
const detail = read('next-app/components/OrderCatalogDetailView.js')
const schema = read('supabase/schema.sql')
const catalogoApi = read('next-app/pages/api/pedidos/catalogo/[id].js')

for (const field of ['cliente_localidad', 'cliente_codigo_postal', 'cliente_provincia', 'cliente_notas']) {
  assert(schema.includes(field), `Schema is missing ${field}`)
  assert(pedidos.includes(field), `Order persistence/read projection is missing ${field}`)
}
for (const field of ['localidad', 'codigoPostal', 'provincia', 'notas']) {
  assert(mapper.includes(field), `Frontend mapper is missing ${field}`)
  assert(detail.includes(`customer.${field}`), `Order detail UI does not expose ${field}`)
}
for (const field of [
  'shipping_provider', 'shipping_delivery_type', 'shipping_service_code',
  'shipping_service_name', 'shipping_cost', 'shipping_currency',
  'shipping_quote_snapshot', 'shipping_destination_snapshot',
  'shipping_agency_snapshot', 'shipping_status', 'shipping_import_status',
  'shipping_import_result', 'shipping_imported_at',
  'shipping_manual_followup_required', 'shipping_tracking_number',
]) {
  assert(pedidos.includes(field), `Shipping projection is missing ${field}`)
}

assert(pedidos.includes('producto_id') && pedidos.includes('producto_nombre') && pedidos.includes('cantidad'), 'Order item projection changed or is incomplete')
assert(catalogoApi.includes("import { verifyAdminCookie } from '../../../../utils/verifyAdminCookie'"), 'Catalog order mutation API is missing admin auth import')
assert(catalogoApi.includes("req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE'"), 'Catalog order mutation methods are not guarded')
assert(catalogoApi.includes('const userId = await verifyAdminCookie(req)'), 'Catalog order mutations do not verify admin cookie')
assert(catalogoApi.includes("return res.status(401).json({ error: 'No autorizado' })"), 'Catalog order mutations do not reject unauthenticated requests')
assert(pedidos.includes(".eq('cliente_email', email)\n      .eq('tenant_id', TENANT_ID)"), 'Customer order history is missing tenant isolation')
console.log(`Order-detail data completeness checks passed (${changedFiles.length} allowed files).`)
