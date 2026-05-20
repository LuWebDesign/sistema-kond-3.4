// TEMPORARY one-shot migration route — DELETE after use
//
// GET /api/admin/sync-categoria-text?dry=true   → preview (default, safe)
// GET /api/admin/sync-categoria-text?apply=true → execute UPDATEs
//
// What it does: for every product with a categoria_id, overwrites
// productos.categoria (TEXT) with the current nombre from categorias.
// Fixes the catalog dropdown showing both old and new category name after a rename.

import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'

const ADMIN_SECRET = process.env.ADMIN_API_SECRET

function isAdminAuthorized(req) {
  if (!ADMIN_SECRET) return true
  return req.headers['x-admin-secret'] === ADMIN_SECRET
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const applyMode = req.query.apply === 'true'
  const supabase  = supabaseAdmin()

  // 1. Load all categories for this tenant
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('tenant_id', TENANT_ID)

  if (catError) {
    return res.status(500).json({ error: 'Error loading categorias', detail: catError.message })
  }

  const idToNombre = Object.fromEntries((categorias || []).map(c => [c.id, c.nombre]))

  // 2. Load all products that have a categoria_id
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, nombre, categoria, categoria_id')
    .not('categoria_id', 'is', null)
    .eq('tenant_id', TENANT_ID)

  if (prodError) {
    return res.status(500).json({ error: 'Error loading productos', detail: prodError.message })
  }

  // 3. Determine which products need an update
  const toUpdate  = []
  const alreadyOk = []
  const orphaned  = [] // categoria_id points to a deleted category

  for (const prod of (productos || [])) {
    const correctName = idToNombre[prod.categoria_id]
    if (correctName === undefined) {
      orphaned.push({ id: prod.id, nombre: prod.nombre, categoria_id: prod.categoria_id })
    } else if (prod.categoria === correctName) {
      alreadyOk.push({ id: prod.id, nombre: prod.nombre })
    } else {
      toUpdate.push({
        id:           prod.id,
        nombre:       prod.nombre,
        categoriaOld: prod.categoria,
        categoriaNew: correctName,
      })
    }
  }

  // 4. Dry-run: return preview only
  if (!applyMode) {
    return res.status(200).json({
      mode:       'dry-run',
      toUpdate,
      alreadyOk:  alreadyOk.length,
      orphaned,
      message:    toUpdate.length > 0
        ? `${toUpdate.length} product(s) need syncing. Call with ?apply=true to fix.`
        : 'All products already in sync.',
    })
  }

  // 5. Apply mode: run the UPDATEs
  const results = { ok: [], failed: [] }

  for (const prod of toUpdate) {
    const { error: updateError } = await supabase
      .from('productos')
      .update({ categoria: prod.categoriaNew })
      .eq('id', prod.id)
      .eq('tenant_id', TENANT_ID)

    if (updateError) {
      results.failed.push({ id: prod.id, nombre: prod.nombre, error: updateError.message })
    } else {
      results.ok.push({ id: prod.id, nombre: prod.nombre, categoriaNew: prod.categoriaNew })
    }
  }

  return res.status(results.failed.length > 0 ? 207 : 200).json({
    mode:       'apply',
    updated:    results.ok,
    failed:     results.failed,
    alreadyOk:  alreadyOk.length,
    orphaned,
    message:    `Updated ${results.ok.length} product(s). Failed: ${results.failed.length}.`,
  })
}
