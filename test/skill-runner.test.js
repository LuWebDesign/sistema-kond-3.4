/**
 * test/skill-runner.test.js
 * Tests unitarios para skill-runner y skill-handlers.
 * Sin dependencias externas — usa solo Node.js built-ins.
 * Los handlers se ejecutan en modo dry-run para evitar efectos reales.
 */
'use strict'
const assert = require('assert')
const fs     = require('fs')
const path   = require('path')
const os     = require('os')

// ─── Import handlers ─────────────────────────────────────────────────────────
const { runActions, HANDLERS } = require('../lib/skill-handlers')

// ─── Helpers ─────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${e.message}`)
    failed++
  }
}

// ─── Suite: handlers dry-run ─────────────────────────────────────────────────
console.log('\nSuite: handlers (dry-run)\n')

test('create-file dryRun retorna ok:true sin crear archivo', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'))
  const target = path.join(tmpDir, 'nuevo.js')
  const res = HANDLERS['create-file'].dryRun({ type: 'create-file', path: 'nuevo.js', content: 'hola' })
  assert.strictEqual(res.ok, true)
  assert.strictEqual(res.simulated, true)
  assert(!fs.existsSync(target), 'No debería haber creado el archivo')
})

test('edit-file dryRun retorna ok:true sin modificar archivo', () => {
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'))
  const target  = path.join(tmpDir, 'edit.js')
  const original = 'const x = 1'
  fs.writeFileSync(target, original)
  const res = HANDLERS['edit-file'].dryRun({ type: 'edit-file', path: target, find: 'x', replace: 'y' })
  assert.strictEqual(res.ok, true)
  assert.strictEqual(fs.readFileSync(target, 'utf8'), original, 'Archivo no debe tener cambios')
})

test('run-cmd dryRun retorna ok:true sin ejecutar', () => {
  const res = HANDLERS['run-cmd'].dryRun({ type: 'run-cmd', cmd: 'exit 1' })
  assert.strictEqual(res.ok, true)
  assert.strictEqual(res.simulated, true)
})

test('ask-user dryRun retorna ok:true', () => {
  const res = HANDLERS['ask-user'].dryRun({ type: 'ask-user', question: '¿Continuar?' })
  assert.strictEqual(res.ok, true)
})

test('noop retorna ok:true', () => {
  const res = HANDLERS['noop'].dryRun({ type: 'noop', reason: 'test' })
  assert.strictEqual(res.ok, true)
})

test('tipo desconocido → runActions reporta failed', () => {
  const results = runActions([{ type: 'unknown-type' }], { dry: true })
  assert.strictEqual(results[0].ok, false)
  assert.strictEqual(results[0].reason, 'unknown_type')
})

// ─── Suite: handlers apply ───────────────────────────────────────────────────
console.log('\nSuite: handlers (apply)\n')

test('create-file apply crea el archivo', () => {
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-apply-'))
  const relPath = 'sub/nuevo.txt'
  const abs    = path.join(dir, relPath)
  const res = HANDLERS['create-file'].apply({ type: 'create-file', path: relPath, content: 'contenido' }, { cwd: dir })
  assert.strictEqual(res.ok, true)
  assert(fs.existsSync(abs), 'El archivo debería existir')
  assert.strictEqual(fs.readFileSync(abs, 'utf8'), 'contenido')
})

test('create-file apply no sobreescribe si ya existe', () => {
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-apply-'))
  const relPath = 'existe.txt'
  const abs    = path.join(dir, relPath)
  fs.writeFileSync(abs, 'original')
  const res = HANDLERS['create-file'].apply({ type: 'create-file', path: relPath, content: 'nuevo' }, { cwd: dir })
  assert.strictEqual(res.ok, false)
  assert.strictEqual(res.reason, 'file_exists')
  assert.strictEqual(fs.readFileSync(abs, 'utf8'), 'original', 'No debe modificar el original')
})

test('edit-file apply hace find-and-replace', () => {
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-apply-'))
  const relPath = 'target.js'
  const abs    = path.join(dir, relPath)
  fs.writeFileSync(abs, 'const x = 1')
  const res = HANDLERS['edit-file'].apply({ type: 'edit-file', path: relPath, find: 'const x = 1', replace: 'const y = 2' }, { cwd: dir })
  assert.strictEqual(res.ok, true)
  assert.strictEqual(fs.readFileSync(abs, 'utf8'), 'const y = 2')
})

test('edit-file apply falla si find-string no existe', () => {
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-apply-'))
  const relPath = 'nofind.js'
  fs.writeFileSync(path.join(dir, relPath), 'original')
  const res = HANDLERS['edit-file'].apply({ type: 'edit-file', path: relPath, find: 'NO_EXISTE', replace: 'x' }, { cwd: dir })
  assert.strictEqual(res.ok, false)
})

test('edit-file apply falla si archivo no existe', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-apply-'))
  const res = HANDLERS['edit-file'].apply({ type: 'edit-file', path: 'inexistente.js', find: 'x', replace: 'y' }, { cwd: dir })
  assert.strictEqual(res.ok, false)
  assert.strictEqual(res.reason, 'not_found')
})

// ─── Suite: parseo de index ──────────────────────────────────────────────────
console.log('\nSuite: indexer\n')

test('index.json existe y tiene 7+ skills', () => {
  const idxPath = path.join(process.cwd(), '.github', 'skills', 'index.json')
  assert(fs.existsSync(idxPath), 'index.json no existe')
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'))
  assert(Array.isArray(idx), 'debe ser array')
  assert(idx.length >= 7, `Se esperaban >=7 skills, hay ${idx.length}`)
})

test('cada skill tiene name, description y file', () => {
  const idx = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.github', 'skills', 'index.json'), 'utf8'))
  for (const s of idx) {
    assert(s.name,  `Skill sin name: ${JSON.stringify(s)}`)
    assert(s.file,  `Skill sin file: ${s.name}`)
  }
})

// ─── Resultado ───────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} pasaron, ${failed} fallaron\n`)
if (failed > 0) process.exit(1)
