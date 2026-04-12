/**
 * lib/skill-handlers.js
 * Handlers para cada tipo de acción del Action DSL.
 * Soporta modos: dryRun (simula) y apply (ejecuta).
 * Token-optimization: sin llamadas a LLM; ejecución determinística.
 */
'use strict'
const fs   = require('fs')
const path = require('path')

// ─── Utilidades ─────────────────────────────────────────────────────────────
function preview(str, maxLen = 120) {
  const s = str.replace(/\r?\n/g, ' ').trim()
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s
}

// ─── Handlers por tipo ───────────────────────────────────────────────────────
const HANDLERS = {

  'create-file': {
    dryRun(action) {
      console.log(`  [create-file] → ${action.path}`)
      if (action.template) console.log(`    template: ${action.template}`)
      if (action.content)  console.log(`    content:  ${preview(action.content)}`)
      return { ok: true, simulated: true }
    },
    apply(action, ctx) {
      const abs = path.resolve(ctx.cwd, action.path)
      if (fs.existsSync(abs)) {
        console.warn(`  [create-file] Ya existe: ${action.path} — omitido`)
        return { ok: false, reason: 'file_exists' }
      }
      const dir = path.dirname(abs)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(abs, action.content || '', 'utf8')
      console.log(`  [create-file] Creado: ${action.path}`)
      return { ok: true }
    }
  },

  'edit-file': {
    dryRun(action) {
      console.log(`  [edit-file] → ${action.path}`)
      console.log(`    find:    ${preview(action.find)}`)
      console.log(`    replace: ${preview(action.replace)}`)
      return { ok: true, simulated: true }
    },
    apply(action, ctx) {
      const abs = path.resolve(ctx.cwd, action.path)
      if (!fs.existsSync(abs)) {
        console.error(`  [edit-file] No encontrado: ${action.path}`)
        return { ok: false, reason: 'not_found' }
      }
      const original = fs.readFileSync(abs, 'utf8')
      if (!original.includes(action.find)) {
        console.warn(`  [edit-file] find-string no encontrado en ${action.path}`)
        return { ok: false, reason: 'find_not_found' }
      }
      // Reemplaza solo la primera ocurrencia
      const updated = original.replace(action.find, action.replace)
      fs.writeFileSync(abs, updated, 'utf8')
      console.log(`  [edit-file] Editado: ${action.path}`)
      return { ok: true }
    }
  },

  'run-cmd': {
    dryRun(action) {
      const cwd = action.cwd || '.'
      console.log(`  [run-cmd] $ ${action.cmd}  (cwd: ${cwd})`)
      return { ok: true, simulated: true }
    },
    apply(action, ctx) {
      const { execSync } = require('child_process')
      const cwd = path.resolve(ctx.cwd, action.cwd || '.')
      console.log(`  [run-cmd] $ ${action.cmd}  (cwd: ${cwd})`)
      try {
        const out = execSync(action.cmd, { cwd, encoding: 'utf8', stdio: 'pipe' })
        if (out) process.stdout.write(out)
        return { ok: true, output: out }
      } catch (e) {
        console.error(`  [run-cmd] Error: ${e.message}`)
        return { ok: false, reason: e.message }
      }
    }
  },

  'ask-user': {
    dryRun(action) {
      console.log(`  [ask-user] "${action.question}" — (se pediría confirmación en modo apply)`)
      return { ok: true, simulated: true }
    },
    apply(action) {
      // En CLI no-intractivo, simplemente omitir
      console.log(`  [ask-user] "${action.question}" — omitido en modo no-interactivo`)
      return { ok: true, skipped: true }
    }
  },

  'noop': {
    dryRun(action) {
      console.log(`  [noop] ${action.reason || 'sin efecto'}`)
      return { ok: true }
    },
    apply(action) {
      console.log(`  [noop] ${action.reason || 'sin efecto'}`)
      return { ok: true }
    }
  }
}

// ─── Executor principal ──────────────────────────────────────────────────────
/**
 * Ejecuta una lista de acciones.
 * @param {object[]} actions  - Acciones del Action DSL
 * @param {object}   opts     - { dry: boolean, cwd: string }
 * @returns {{ action, ok, reason?, simulated? }[]}
 */
function runActions(actions, opts = {}) {
  const ctx  = { cwd: opts.cwd || process.cwd() }
  const mode = opts.dry ? 'dryRun' : 'apply'
  const tag  = opts.dry ? 'dry-run' : 'apply'
  const results = []

  console.log(`\nEjecutando ${actions.length} acción(es) [modo: ${tag}]\n`)

  for (const action of actions) {
    const handler = HANDLERS[action.type]
    if (!handler) {
      console.warn(`  Tipo de acción desconocido: "${action.type}" — omitido`)
      results.push({ action, ok: false, reason: 'unknown_type' })
      continue
    }
    try {
      const result = handler[mode](action, ctx)
      results.push({ action, ...result })
    } catch (e) {
      console.error(`  Error en handler ${action.type}: ${e.message}`)
      results.push({ action, ok: false, reason: e.message })
    }
  }

  const passed  = results.filter(r => r.ok).length
  const failed  = results.filter(r => !r.ok).length
  console.log(`\nResultado: ${passed} OK / ${failed} fallidas`)

  return results
}

module.exports = { runActions, HANDLERS }
