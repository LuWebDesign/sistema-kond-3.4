#!/usr/bin/env node
/**
 * sync-categoria-text.js
 *
 * One-shot backfill: for every product that has a categoria_id, overwrites
 * productos.categoria (TEXT) with the current nombre from the categorias table.
 *
 * This fixes the dual-entry bug in the catalog category dropdown that appears
 * after renaming a category: the legacy text field keeps the old name while
 * the categorias table already has the new one, causing both to show up.
 *
 * Usage:
 *   node next-app/scripts/sync-categoria-text.js [--dry-run] [--apply] [--help]
 *
 * Flags:
 *   --dry-run   (default) Show what would change without writing anything.
 *   --apply     Execute the UPDATEs in the DB.
 *   --help      Show this message and exit.
 *
 * Required env vars (loaded from next-app/.env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL   or  SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

'use strict'

// Load .env.local from the next-app directory using only built-in modules
// (dotenv is not installed in this project)
try {
  const fs   = require('fs')
  const path = require('path')
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val   = trimmed.slice(eqIdx + 1).trim()
      // Strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    }
  }
} catch {
  // Could not read .env.local — rely on system env vars
}

const { createClient } = require('@supabase/supabase-js')

// ── Flags ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log(`
sync-categoria-text.js — Backfill productos.categoria from categorias.nombre

Fixes the catalog dropdown showing both the old and new category name after
a rename. Overwrites productos.categoria for every product that has a
categoria_id set, using the current nombre from the categorias table.

USAGE:
  node next-app/scripts/sync-categoria-text.js [--dry-run] [--apply] [--help]

FLAGS:
  --dry-run   (default) Show changes without writing anything.
  --apply     Execute the UPDATEs in the DB.
  --help      Show this help.

ENV VARS:
  NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)   Required
  SUPABASE_SERVICE_ROLE_KEY                     Required

EXAMPLE:
  # Preview (safe, no writes):
  node next-app/scripts/sync-categoria-text.js --dry-run

  # Apply:
  node next-app/scripts/sync-categoria-text.js --apply
`)
  process.exit(0)
}

const applyMode = args.includes('--apply')
const dryRun = !applyMode

// ── Validate env ───────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const TENANT_ID    = process.env.NEXT_PUBLIC_TENANT_ID

if (!SUPABASE_URL) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is not set.')
  process.exit(1)
}
if (!SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.')
  process.exit(1)
}

// ── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Formatting helpers ─────────────────────────────────────────────────────
function pad(str, len) {
  const s = String(str ?? '')
  return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== sync-categoria-text.js ===')
  console.log(`Mode : ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY (writing to DB)'}`)
  if (TENANT_ID) console.log(`Tenant: ${TENANT_ID}`)
  console.log()

  // 1. Load all categories
  let catQuery = supabase.from('categorias').select('id, nombre')
  if (TENANT_ID) catQuery = catQuery.eq('tenant_id', TENANT_ID)

  const { data: categorias, error: catError } = await catQuery
  if (catError) {
    console.error('Error loading categorias:', catError.message)
    process.exit(1)
  }
  if (!categorias || categorias.length === 0) {
    console.log('No categories found in the categorias table. Nothing to sync.')
    return
  }

  // Build id → nombre map
  const idToNombre = new Map(categorias.map(c => [c.id, c.nombre]))
  console.log(`Loaded ${categorias.length} categor${categorias.length === 1 ? 'y' : 'ies'} from DB.`)

  // 2. Load all products that have a categoria_id
  let prodQuery = supabase
    .from('productos')
    .select('id, nombre, categoria, categoria_id')
    .not('categoria_id', 'is', null)

  if (TENANT_ID) prodQuery = prodQuery.eq('tenant_id', TENANT_ID)

  const { data: productos, error: prodError } = await prodQuery
  if (prodError) {
    console.error('Error loading productos:', prodError.message)
    process.exit(1)
  }
  if (!productos || productos.length === 0) {
    console.log('No products with categoria_id found. Nothing to sync.')
    return
  }
  console.log(`Loaded ${productos.length} product(s) with categoria_id set.\n`)

  // 3. Determine which products need an update
  const toUpdate = []
  const alreadyOk = []

  for (const prod of productos) {
    const correctName = idToNombre.get(prod.categoria_id)
    if (correctName === undefined) {
      // categoria_id points to a category that no longer exists — skip
      continue
    }
    if (prod.categoria === correctName) {
      alreadyOk.push(prod)
    } else {
      toUpdate.push({ ...prod, correctName })
    }
  }

  // 4. Print table
  const COL = [8, 30, 25, 25]
  const header = pad('id', COL[0]) + ' | ' + pad('producto', COL[1]) + ' | ' + pad('categoria actual', COL[2]) + ' | ' + pad('categoria correcta', COL[3])
  const sep = '-'.repeat(header.length)

  if (toUpdate.length > 0) {
    console.log('Products that need updating:')
    console.log(header)
    console.log(sep)
    for (const p of toUpdate) {
      console.log(
        pad(p.id, COL[0]) + ' | ' +
        pad(p.nombre, COL[1]) + ' | ' +
        pad(p.categoria ?? '(null)', COL[2]) + ' | ' +
        pad(p.correctName, COL[3])
      )
    }
    console.log(sep)
    console.log()
  }

  console.log(`SUMMARY  needs_update=${toUpdate.length}  already_ok=${alreadyOk.length}  total=${productos.length}`)
  console.log()

  if (dryRun) {
    if (toUpdate.length > 0) {
      console.log('DRY-RUN: no changes written. Run with --apply to fix these products.')
    } else {
      console.log('DRY-RUN: all products are already in sync. Nothing to do.')
    }
    return
  }

  // 5. Apply updates
  if (toUpdate.length === 0) {
    console.log('All products already in sync. Nothing to update.')
    return
  }

  console.log(`Applying ${toUpdate.length} UPDATE(s)...`)
  let ok = 0
  let fail = 0

  for (const prod of toUpdate) {
    let q = supabase
      .from('productos')
      .update({ categoria: prod.correctName })
      .eq('id', prod.id)
    if (TENANT_ID) q = q.eq('tenant_id', TENANT_ID)

    const { error: updateError } = await q
    if (updateError) {
      console.error(`  ERROR id=${prod.id} "${prod.nombre}":`, updateError.message)
      fail++
    } else {
      console.log(`  ✅ id=${prod.id} "${prod.nombre}" → "${prod.correctName}"`)
      ok++
    }
  }

  console.log()
  console.log(`RESULT  success=${ok}  errors=${fail}`)

  if (fail > 0) process.exit(1)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
