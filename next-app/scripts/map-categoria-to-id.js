#!/usr/bin/env node
/**
 * map-categoria-to-id.js
 *
 * Script de migración one-shot: mapea la columna `categoria` (TEXT) de
 * productos a `categoria_id` (FK) haciendo exact match contra `categorias.nombre`.
 *
 * Usage:
 *   node next-app/scripts/map-categoria-to-id.js [--dry-run] [--apply] [--help]
 *
 * Flags:
 *   --dry-run   (default) Muestra los mapeos sin hacer cambios en la DB.
 *   --apply     Ejecuta los UPDATEs en la DB. Requiere SUPABASE_SERVICE_ROLE_KEY.
 *   --help      Muestra este mensaje y sale.
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL              URL del proyecto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY Service role key (solo para --apply)
 *
 * Se puede usar un archivo .env.local en la raíz del proyecto.
 * El script busca dotenv automáticamente si está disponible.
 */

'use strict'

// Cargar variables de entorno desde .env.local si existe y dotenv está disponible
try {
  const path = require('path')
  const dotenvPath = path.resolve(process.cwd(), '.env.local')
  require('dotenv').config({ path: dotenvPath })
} catch {
  // dotenv no disponible — se usan variables de entorno del sistema
}

const { createClient } = require('@supabase/supabase-js')

// ── Flags ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log(`
map-categoria-to-id.js — Migración de categoria TEXT → categoria_id FK

USAGE:
  node next-app/scripts/map-categoria-to-id.js [--dry-run] [--apply] [--help]

FLAGS:
  --dry-run   (default) Muestra los mapeos sin hacer cambios en la DB.
  --apply     Ejecuta los UPDATEs en la DB.
  --help      Muestra esta ayuda.

ENV VARS:
  SUPABASE_URL              URL del proyecto Supabase (requerido)
  SUPABASE_SERVICE_ROLE_KEY Service role key (requerido para --apply)

EJEMPLO:
  # Ver qué se mapearía (sin escribir nada):
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... \\
    node next-app/scripts/map-categoria-to-id.js --dry-run

  # Aplicar cambios:
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... \\
    node next-app/scripts/map-categoria-to-id.js --apply
`)
  process.exit(0)
}

const applyMode = args.includes('--apply')
const dryRun = !applyMode // dry-run es el default

// ── Validar env vars ───────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) no está definida.')
  process.exit(1)
}

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida.')
  process.exit(1)
}

// ── Cliente Supabase ───────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// ── Helpers de formato ─────────────────────────────────────────────────────
function padEnd(str, len) {
  const s = String(str ?? '')
  return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length)
}

function printRow(id, nombreProducto, categoriaText, categoriaIdEncontrado, accion) {
  console.log(
    padEnd(id, 8) + ' | ' +
    padEnd(nombreProducto, 30) + ' | ' +
    padEnd(categoriaText, 20) + ' | ' +
    padEnd(categoriaIdEncontrado, 24) + ' | ' +
    accion
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== map-categoria-to-id.js ===`)
  console.log(`Modo: ${dryRun ? 'DRY-RUN (sin cambios)' : 'APPLY (escribiendo en DB)'}`)
  console.log()

  // Cargar todas las categorías para hacer el match en memoria
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nombre')

  if (catError) {
    console.error('Error al cargar categorías:', catError.message)
    process.exit(1)
  }

  // Construir mapa nombre → id (exact match, case-sensitive)
  /** @type {Map<string, number>} */
  const nombreToId = new Map(categorias.map(c => [c.nombre, c.id]))

  // Cargar productos sin categoria_id asignada
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, nombre, categoria')
    .is('categoria_id', null)

  if (prodError) {
    console.error('Error al cargar productos:', prodError.message)
    process.exit(1)
  }

  if (!productos || productos.length === 0) {
    console.log('No hay productos con categoria_id = NULL. Nada que mapear.')
    return
  }

  // Encabezado de tabla
  console.log(
    padEnd('id', 8) + ' | ' +
    padEnd('nombre_producto', 30) + ' | ' +
    padEnd('categoria_text', 20) + ' | ' +
    padEnd('categoria_id_encontrado', 24) + ' | ' +
    'accion'
  )
  console.log('-'.repeat(110))

  let mapped = 0
  let noMatch = 0
  const updates = [] // { id, categoria_id }

  for (const prod of productos) {
    const categoriaText = prod.categoria || ''
    const categoriaIdEncontrado = nombreToId.get(categoriaText)

    if (categoriaIdEncontrado !== undefined) {
      printRow(prod.id, prod.nombre, categoriaText, String(categoriaIdEncontrado), dryRun ? 'MATCH (dry-run)' : 'MATCH → UPDATE')
      updates.push({ id: prod.id, categoria_id: categoriaIdEncontrado })
      mapped++
    } else {
      printRow(prod.id, prod.nombre, categoriaText, '—', 'NO_MATCH')
      noMatch++
    }
  }

  console.log('-'.repeat(110))
  console.log()
  console.log(`SUMMARY  mapped=${mapped}  no_match=${noMatch}  total=${productos.length}`)
  console.log()

  // En dry-run: terminar sin escribir
  if (dryRun) {
    console.log('Modo DRY-RUN: no se escribieron cambios. Usá --apply para aplicar.')
    return
  }

  // En apply: ejecutar los UPDATEs
  if (updates.length === 0) {
    console.log('No hay productos para actualizar.')
    return
  }

  console.log(`Aplicando ${updates.length} UPDATE(s)...`)

  let successCount = 0
  let errorCount = 0

  for (const { id, categoria_id } of updates) {
    const { error: updateError } = await supabase
      .from('productos')
      .update({ categoria_id })
      .eq('id', id)

    if (updateError) {
      console.error(`  ERROR updating producto id=${id}:`, updateError.message)
      errorCount++
    } else {
      successCount++
    }
  }

  console.log()
  console.log(`APPLY RESULT  success=${successCount}  errors=${errorCount}`)

  if (errorCount > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
