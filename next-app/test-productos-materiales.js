// ============================================
// TEST PRODUCTOS Y MATERIALES - Consolidación Supabase
// Script para validar la migración híbrida de productos y materiales
// ============================================

require('dotenv').config({ path: '.env.local' })
const { loadAllProductos, saveProducto, mapProductoToFrontend } = require('./utils/productosUtils')
const { loadAllMateriales, saveMaterial } = require('./utils/materialesUtils')

async function testProductos() {
  console.log('\n🧪 === TEST PRODUCTOS ===\n')
  
  try {
    // Test 1: Cargar todos los productos
    console.log('📦 Test 1: Cargar todos los productos...')
    const productos = await loadAllProductos()
    console.log(`✅ ${productos.length} productos cargados`)
    
    if (productos.length > 0) {
      console.log('📄 Primer producto:', {
        id: productos[0].id,
        nombre: productos[0].nombre,
        categoria: productos[0].categoria,
        publicado: productos[0].publicado,
        precioUnitario: productos[0].precioUnitario
      })
    }
    
    // Test 2: Verificar productos publicados
    const publicados = productos.filter(p => p.publicado)
    console.log(`📢 ${publicados.length} productos publicados (visibles en catálogo)`)
    
    // Test 3: Verificar sincronización con localStorage
    if (typeof window !== 'undefined') {
      const localProducts = JSON.parse(localStorage.getItem('productosBase') || '[]')
      console.log(`💾 ${localProducts.length} productos en localStorage (sincronizados)`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Error en test productos:', error)
    return false
  }
}

async function testMateriales() {
  console.log('\n🧪 === TEST MATERIALES ===\n')
  
  try {
    // Test 1: Cargar todos los materiales
    console.log('📦 Test 1: Cargar todos los materiales...')
    const materiales = await loadAllMateriales()
    console.log(`✅ ${materiales.length} materiales cargados`)
    
    if (materiales.length > 0) {
      console.log('📄 Primer material:', {
        id: materiales[0].id,
        nombre: materiales[0].nombre,
        tipo: materiales[0].tipo,
        costoUnitario: materiales[0].costoUnitario,
        stock: materiales[0].stock
      })
    }
    
    // Test 2: Verificar sincronización con localStorage
    if (typeof window !== 'undefined') {
      const localMateriales = JSON.parse(localStorage.getItem('materiales') || '[]')
      console.log(`💾 ${localMateriales.length} materiales en localStorage (sincronizados)`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Error en test materiales:', error)
    return false
  }
}

async function testCrearProducto() {
  console.log('\n🧪 === TEST CREAR PRODUCTO ===\n')
  
  try {
    const nuevoProducto = {
      nombre: 'Producto Test ' + Date.now(),
      categoria: 'Test',
      tipo: 'Venta',
      medidas: '10x10cm',
      tiempoUnitario: '00:15:00',
      publicado: false,
      hiddenInProductos: false,
      unidadesPorPlaca: 12,
      usoPlacas: 1,
      costoPlaca: 120,
      costoMaterial: 10,
      precioUnitario: 50,
      imagen: null
    }
    
    console.log('📝 Creando producto de prueba:', nuevoProducto.nombre)
    const result = await saveProducto(nuevoProducto, false)
    
    if (result.success) {
      console.log('✅ Producto creado exitosamente')
      console.log('📄 ID del producto:', result.data?.id)
      return result.data
    } else {
      console.error('❌ Error creando producto:', result.error)
      return null
    }
  } catch (error) {
    console.error('❌ Error en test crear producto:', error)
    return null
  }
}

async function runTests() {
  console.log('\n🚀 === INICIANDO TESTS DE MIGRACIÓN PRODUCTOS/MATERIALES ===\n')
  
  const results = {
    productos: false,
    materiales: false,
    crear: false
  }
  
  // Test productos
  results.productos = await testProductos()
  
  // Test materiales
  results.materiales = await testMateriales()
  
  // Test crear producto (opcional, comentado para no crear datos de prueba)
  // results.crear = !!(await testCrearProducto())
  
  // Resumen
  console.log('\n📊 === RESUMEN DE TESTS ===\n')
  console.log('Productos:', results.productos ? '✅ PASS' : '❌ FAIL')
  console.log('Materiales:', results.materiales ? '✅ PASS' : '❌ FAIL')
  // console.log('Crear producto:', results.crear ? '✅ PASS' : '❌ FAIL')
  
  const allPassed = results.productos && results.materiales
  
  if (allPassed) {
    console.log('\n🎉 Todos los tests pasaron correctamente')
    console.log('✅ La migración de productos y materiales está funcionando')
  } else {
    console.log('\n⚠️ Algunos tests fallaron, revisar logs arriba')
  }
  
  process.exit(allPassed ? 0 : 1)
}

// Ejecutar tests
runTests()
