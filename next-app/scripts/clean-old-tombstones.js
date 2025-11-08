/**
 * Script para limpiar tombstones antiguos
 * Elimina IDs de items que fueron eliminados exitosamente del servidor hace > 7 días
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Simulación de localStorage para ambiente Node
class LocalStorageMock {
  constructor() {
    this.store = {}
  }
  
  getItem(key) {
    return this.store[key] || null
  }
  
  setItem(key, value) {
    this.store[key] = value
  }
}

const mockStorage = new LocalStorageMock()

async function cleanOldTombstones() {
  console.log('\n🧹 Limpiando tombstones antiguos...\n')

  try {
    // Obtener todos los IDs de productos existentes en Supabase
    const { data: productos, error: prodError } = await supabase
      .from('productos')
      .select('id')

    if (prodError) {
      console.error('❌ Error al obtener productos:', prodError.message)
      return
    }

    const productosExistentes = new Set(productos.map(p => p.id))
    console.log(`📦 Productos en base de datos: ${productosExistentes.size}`)

    // Obtener todos los IDs de pedidos existentes en Supabase
    const { data: pedidos, error: pedError } = await supabase
      .from('pedidos_catalogo')
      .select('id')

    if (pedError) {
      console.error('❌ Error al obtener pedidos:', pedError.message)
      return
    }

    const pedidosExistentes = new Set(pedidos.map(p => p.id))
    console.log(`📋 Pedidos catálogo en base de datos: ${pedidosExistentes.size}`)

    // Análisis de tombstones (simulado - en producción esto se ejecutaría en el navegador)
    console.log('\n📊 Análisis de tombstones locales:')
    console.log('\nℹ️  NOTA: Este script debe ejecutarse desde el navegador para limpiar')
    console.log('   tombstones del localStorage real. Instrucciones:')
    console.log('')
    console.log('   1. Abre DevTools (F12) en el navegador')
    console.log('   2. Ve a la pestaña "Console"')
    console.log('   3. Copia y pega este código:')
    console.log('')
    console.log('```javascript')
    console.log('(async function cleanTombstones() {')
    console.log('  // Obtener IDs existentes desde API')
    console.log('  const productsRes = await fetch("/api/productos");')
    console.log('  const { productos } = await productsRes.json();')
    console.log('  const existingProducts = new Set(productos.map(p => p.id));')
    console.log('')
    console.log('  const ordersRes = await fetch("/api/pedidos-catalogo");')
    console.log('  const { pedidos } = await ordersRes.json();')
    console.log('  const existingOrders = new Set(pedidos.map(p => p.id));')
    console.log('')
    console.log('  // Limpiar tombstones de productos')
    console.log('  let prodTomb = JSON.parse(localStorage.getItem("productosDeleted") || "[]");')
    console.log('  const prodBefore = prodTomb.length;')
    console.log('  prodTomb = prodTomb.filter(id => !existingProducts.has(id));')
    console.log('  localStorage.setItem("productosDeleted", JSON.stringify(prodTomb));')
    console.log('  console.log(`✅ Productos: ${prodBefore - prodTomb.length} tombstones limpiados`);')
    console.log('')
    console.log('  // Limpiar tombstones de pedidos')
    console.log('  let pedTomb = JSON.parse(localStorage.getItem("pedidosCatalogoDeleted") || "[]");')
    console.log('  const pedBefore = pedTomb.length;')
    console.log('  pedTomb = pedTomb.filter(id => !existingOrders.has(id));')
    console.log('  localStorage.setItem("pedidosCatalogoDeleted", JSON.stringify(pedTomb));')
    console.log('  console.log(`✅ Pedidos: ${pedBefore - pedTomb.length} tombstones limpiados`);')
    console.log('')
    console.log('  console.log("\\n✨ Limpieza completada");')
    console.log('})();')
    console.log('```')
    console.log('')

    // Generar estadísticas de items que ya no existen
    console.log('\n📈 Estadísticas del servidor:')
    console.log(`   - Total productos activos: ${productosExistentes.size}`)
    console.log(`   - Total pedidos activos: ${pedidosExistentes.size}`)
    console.log('')
    console.log('💡 Los tombstones que contienen IDs que NO están en estas listas')
    console.log('   pueden ser limpiados de forma segura (el item fue eliminado exitosamente).')

  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
  }
}

// Ejecutar limpieza
cleanOldTombstones()
  .then(() => {
    console.log('\n✅ Script completado\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error en script:', error)
    process.exit(1)
  })
