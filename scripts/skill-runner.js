#!/usr/bin/env node
/**
 * scripts/skill-runner.js
 * CLI para ejecutar skills del repositorio.
 * Modos:
 *   --list              Lista skills disponibles
 *   --skill <nombre>    Selecciona una skill
 *   --dry-run           Simula acciones sin aplicar cambios (default)
 *   --apply             Aplica cambios reales (requiere --skill)
 *   --help              Muestra ayuda
 *
 * Token-optimization: solo carga el SKILL.md de la skill seleccionada.
 */
'use strict'
const fs             = require('fs')
const path           = require('path')
const { runActions } = require('../lib/skill-handlers')

// ─── Parsear args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const opts = { dry: true } // dry-run por defecto
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if      (a === '--skill'   || a === '-s') opts.skill = args[++i]
  else if (a === '--dry-run' || a === '-d') opts.dry   = true
  else if (a === '--apply'   || a === '-a') opts.dry   = false
  else if (a === '--list'    || a === '-l') opts.list  = true
  else if (a === '--help'    || a === '-h') opts.help  = true
}

if (opts.help) {
  console.log([
    'Uso: node scripts/skill-runner.js [opciones]',
    '',
    'Opciones:',
    '  --list, -l            Lista todas las skills disponibles',
    '  --skill, -s <nombre>  Selecciona la skill a ejecutar',
    '  --dry-run, -d         (default) Simula acciones sin aplicar cambios',
    '  --apply, -a           Aplica los cambios reales',
    '  --help, -h            Muestra esta ayuda',
    '',
    'Ejemplos:',
    '  node scripts/skill-runner.js --list',
    '  node scripts/skill-runner.js --skill image-upload-compress --dry-run',
    '  node scripts/skill-runner.js --skill api-route-supabase --apply',
  ].join('\n'))
  process.exit(0)
}

// ─── Cargar índice ───────────────────────────────────────────────────────────
const idxFile = path.join(process.cwd(), '.github', 'skills', 'index.json')
if (!fs.existsSync(idxFile)) {
  console.error('Índice no encontrado. Ejecutá: node scripts/build-skill-index.js')
  process.exit(1)
}
const index = JSON.parse(fs.readFileSync(idxFile, 'utf8'))

// ─── --list ──────────────────────────────────────────────────────────────────
if (opts.list) {
  console.log(`\nSkills disponibles (${index.length}):\n`)
  index.forEach(s => {
    const desc = s.description || s.short_summary || ''
    console.log(`  ${s.name.padEnd(28)} ${desc.slice(0, 80)}`)
  })
  console.log()
  process.exit(0)
}

// ─── Validar skill ───────────────────────────────────────────────────────────
if (!opts.skill) {
  console.error('Especificá una skill con --skill <nombre>. Usá --list para ver las disponibles.')
  process.exit(1)
}
const skill = index.find(s => s.name === opts.skill)
if (!skill) {
  console.error(`Skill no encontrada: "${opts.skill}"`)
  console.error('Ejecutá --list para ver las skills disponibles.')
  process.exit(1)
}

// ─── Cargar SKILL.md (solo este archivo) ────────────────────────────────────
const skillPath = path.join(process.cwd(), skill.file)
const rawContent = fs.readFileSync(skillPath, 'utf8')
// Quitar frontmatter
const body = rawContent.replace(/^---[\s\S]*?---/, '').trim()

console.log(`\nSkill Runner [${opts.dry ? 'dry-run' : 'APPLY'}] → ${skill.name}`)
console.log(`Descripción: ${skill.description}`)
console.log(`Archivo:     ${skill.file}\n`)

// ─── Parsear sección ## Actions ──────────────────────────────────────────────
const ACTIONS_HEADER = /^##\s+Actions/im
const CODE_BLOCK     = /```json\s*([\s\S]*?)```/g

function parseActions(body) {
  if (!ACTIONS_HEADER.test(body)) return null
  const actionsSection = body.split(ACTIONS_HEADER)[1] || ''
  const blocks = []
  let m
  CODE_BLOCK.lastIndex = 0
  while ((m = CODE_BLOCK.exec(actionsSection)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) blocks.push(...parsed)
    } catch (e) {
      console.warn('  Advertencia: bloque JSON inválido en ## Actions —', e.message)
    }
  }
  return blocks.length ? blocks : null
}

const actions = parseActions(body)

// ─── Ejecutar ────────────────────────────────────────────────────────────────
if (actions) {
  console.log(`Se encontraron ${actions.length} acción(es) estructuradas en ## Actions\n`)
  const results = runActions(actions, { dry: opts.dry, cwd: process.cwd() })
  const failed  = results.filter(r => !r.ok).length
  process.exit(failed > 0 ? 1 : 0)
} else {
  // Fallback: mostrar preview de pasos (skills sin ## Actions)
  console.log('ℹ️  Esta skill no tiene sección ## Actions.')
  console.log('   Para automatizar, añadí un bloque ## Actions con JSON según lib/skill-schema.json\n')
  console.log('─── Preview de pasos ───────────────────────────────────────────\n')
  const stepsSection = body.replace(/^(?:##\s+(?!Pasos)\w+[\s\S]*?)(?=##\s+Pasos|$)/im, '')
  const preview = stepsSection.split(/\r?\n/).slice(0, 50).join('\n')
  console.log(preview)
  console.log('\n───────────────────────────────────────────────────────────────')
  console.log('\nNingún cambio aplicado en modo dry-run sin ## Actions.')
}
