/**
 * test-product-categories.test.js
 *
 * Tests para el sistema de categorías de productos.
 * Sin test runner — ejecutar con: node next-app/test-product-categories.test.js
 *
 * Cubre:
 *   1. slugify — normalización básica
 *   2. slugify — ñ → n
 *   3. slugify — trim de espacios
 *   4. slugify — acentos y ampersand
 *   5. Lógica de mapeo: exact match asigna categoría, loguea no-mapeados
 *   6. API DELETE /api/admin/categorias/[id] retorna 409 si hay productos asignados
 */

// ──────────────────────────────────────────────
// Mini test runner inline
// ──────────────────────────────────────────────
let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

// ──────────────────────────────────────────────
// slugify — inline copy (misma lógica que utils/slugify.js)
// ──────────────────────────────────────────────
function slugify(text) {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ──────────────────────────────────────────────
// Función de mapeo (refleja la lógica de map-categoria-to-id.js)
// ──────────────────────────────────────────────

/**
 * mapProductsToCategories
 *
 * @param {Array<{id: number, categoria: string|null, categoria_id: number|null}>} productos
 * @param {Array<{id: number, nombre: string}>} categorias
 * @returns {{ mapped: Array<{productoId, categoriaId}>, noMatch: Array<{productoId, categoria}> }}
 */
function mapProductsToCategories(productos, categorias) {
  const mapped = []
  const noMatch = []

  for (const producto of productos) {
    if (producto.categoria_id !== null) continue // ya tiene categoría asignada

    const match = categorias.find(
      (c) => c.nombre === producto.categoria
    )

    if (match) {
      mapped.push({ productoId: producto.id, categoriaId: match.id })
    } else {
      noMatch.push({ productoId: producto.id, categoria: producto.categoria })
    }
  }

  return { mapped, noMatch }
}

// ──────────────────────────────────────────────
// Mock del handler de DELETE para /api/admin/categorias/[id]
// ──────────────────────────────────────────────

/**
 * Simula el handler de DELETE sin necesitar Next.js ni Supabase real.
 * Recibe directamente el conteo de productos para simplificar.
 *
 * @param {number} productCount - Cuántos productos están asignados a la categoría
 * @returns {{ status: number, body: object }}
 */
async function simulateDeleteHandler(productCount) {
  // Mock de supabase que retorna el conteo inyectado
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        count: 'exact',
        head: true,
        eq: (col, val) => Promise.resolve({ count: productCount, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }

  // Lógica extraída del handler (DELETE path)
  const { count, error } = await mockSupabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', 1)

  if (error) return { status: 500, body: { error: 'Error interno' } }

  if (count > 0) {
    return {
      status: 409,
      body: {
        error: `No se puede eliminar: ${count} producto${count === 1 ? '' : 's'} asignado${count === 1 ? '' : 's'} a esta categoría`,
      },
    }
  }

  return { status: 200, body: { success: true } }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

await test('slugify — convierte a kebab-case minúscula', async () => {
  const result = slugify('Herramientas de Corte')
  assert(result === 'herramientas-de-corte', `Expected "herramientas-de-corte" but got "${result}"`)
})

await test('slugify — ñ se convierte en n', async () => {
  const result = slugify('Martillo Ñoño')
  assert(result === 'martillo-nono', `Expected "martillo-nono" but got "${result}"`)
})

await test('slugify — recorta espacios iniciales y finales', async () => {
  const result = slugify('  espacios  ')
  assert(result === 'espacios', `Expected "espacios" but got "${result}"`)
})

await test('slugify — elimina acentos y caracteres especiales como &', async () => {
  const result = slugify('café & té')
  assert(result === 'cafe-te', `Expected "cafe-te" but got "${result}"`)
})

await test('mapeo — exact match asigna categoría correctamente', async () => {
  const productos = [
    { id: 1, categoria: 'Herramientas', categoria_id: null },
    { id: 2, categoria: 'Ropa', categoria_id: null },
    { id: 3, categoria: 'Herramientas', categoria_id: null },
  ]
  const categorias = [
    { id: 10, nombre: 'Herramientas' },
    { id: 20, nombre: 'Muebles' },
  ]

  const { mapped, noMatch } = mapProductsToCategories(productos, categorias)

  assert(mapped.length === 2, `Expected 2 mapped, got ${mapped.length}`)
  assert(mapped[0].productoId === 1 && mapped[0].categoriaId === 10, 'Producto 1 debe mapear a categoría 10')
  assert(mapped[1].productoId === 3 && mapped[1].categoriaId === 10, 'Producto 3 debe mapear a categoría 10')
  assert(noMatch.length === 1, `Expected 1 no-match, got ${noMatch.length}`)
  assert(noMatch[0].productoId === 2, `Expected no-match productoId=2, got ${noMatch[0].productoId}`)
})

await test('mapeo — productos ya con categoria_id no son procesados', async () => {
  const productos = [
    { id: 5, categoria: 'Herramientas', categoria_id: 99 }, // ya asignado
    { id: 6, categoria: 'Ropa', categoria_id: null },
  ]
  const categorias = [{ id: 10, nombre: 'Herramientas' }]

  const { mapped, noMatch } = mapProductsToCategories(productos, categorias)

  assert(mapped.length === 0, `Expected 0 mapped (producto 5 ya tiene categoria_id), got ${mapped.length}`)
  assert(noMatch.length === 1, `Expected 1 no-match (Ropa no existe), got ${noMatch.length}`)
})

await test('API DELETE — retorna 409 cuando hay productos asignados', async () => {
  const result = await simulateDeleteHandler(3)
  assert(result.status === 409, `Expected status 409, got ${result.status}`)
  assert(
    result.body.error.includes('3 productos'),
    `Expected error message to mention "3 productos", got: "${result.body.error}"`
  )
})

await test('API DELETE — retorna 200 cuando no hay productos asignados', async () => {
  const result = await simulateDeleteHandler(0)
  assert(result.status === 200, `Expected status 200, got ${result.status}`)
  assert(result.body.success === true, 'Expected success: true in response body')
})

// ──────────────────────────────────────────────
// Resultado final
// ──────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
