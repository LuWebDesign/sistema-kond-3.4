/**
 * Script de depuración para verificar el estado de pedidos en UI
 * Ejecutar: node scripts/debug-pedidos-ui.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugPedidosUI() {
  console.log('🔍 DIAGNÓSTICO: Estado de Pedidos para UI\n')
  console.log('═'.repeat(60))

  // 1. Pedidos en Supabase
  console.log('\n📊 PASO 1: Pedidos en base de datos')
  console.log('─'.repeat(60))
  const { data: pedidosDB, error: errorDB } = await supabase
    .from('pedidos_catalogo')
    .select(`
      *,
      items:pedidos_catalogo_items (
        id,
        pedido_catalogo_id,
        producto_id,
        producto_nombre,
        producto_precio,
        cantidad,
        medidas,
        created_at
      )
    `)
    .order('fecha_creacion', { ascending: false })

  if (errorDB) {
    console.error('❌ Error al cargar pedidos:', errorDB)
    return
  }

  console.log(`✅ Pedidos en Supabase: ${pedidosDB.length}`)
  pedidosDB.forEach((p, idx) => {
    console.log(`   ${idx + 1}. ID: ${p.id} | Cliente: ${p.cliente_nombre} | Items: ${p.items?.length || 0} | Total: $${p.total}`)
  })

  // 2. Tombstones en localStorage (simulación - esto se debe revisar en el navegador)
  console.log('\n🪦 PASO 2: Tombstones locales')
  console.log('─'.repeat(60))
  console.log('⚠️  Revisar en DevTools del navegador:')
  console.log('   1. Abrir Consola de DevTools')
  console.log('   2. Ejecutar: JSON.parse(localStorage.getItem("pedidosCatalogoDeleted") || "[]")')
  console.log('   3. Verificar si alguno de estos IDs está marcado como eliminado:')
  console.log(`      ${pedidosDB.map(p => p.id).join(', ')}`)

  // 3. Verificar si hay pedidos huérfanos (sin items)
  console.log('\n🔍 PASO 3: Verificación de integridad')
  console.log('─'.repeat(60))
  const pedidosSinItems = pedidosDB.filter(p => !p.items || p.items.length === 0)
  if (pedidosSinItems.length > 0) {
    console.log(`⚠️  Pedidos sin items: ${pedidosSinItems.length}`)
    pedidosSinItems.forEach(p => {
      console.log(`   - ID: ${p.id} | Cliente: ${p.cliente_nombre}`)
    })
  } else {
    console.log('✅ Todos los pedidos tienen items')
  }

  // 4. Verificar campos requeridos
  console.log('\n📋 PASO 4: Campos requeridos para UI')
  console.log('─'.repeat(60))
  const camposRequeridos = ['id', 'cliente_nombre', 'total', 'metodo_pago', 'estado_pago', 'fecha_creacion']
  let todosCompletos = true

  pedidosDB.forEach(p => {
    const camposFaltantes = camposRequeridos.filter(campo => !p[campo])
    if (camposFaltantes.length > 0) {
      todosCompletos = false
      console.log(`⚠️  Pedido ${p.id} - Campos faltantes: ${camposFaltantes.join(', ')}`)
    }
  })

  if (todosCompletos) {
    console.log('✅ Todos los pedidos tienen campos requeridos')
  }

  // 5. Sugerencias de depuración
  console.log('\n🛠️  PASO 5: Próximos pasos para depuración')
  console.log('─'.repeat(60))
  console.log('1. Abrir la app en el navegador: http://localhost:3000/pedidos-catalogo')
  console.log('2. Abrir DevTools (F12)')
  console.log('3. Ir a la pestaña Console')
  console.log('4. Buscar logs:')
  console.log('   - "✅ Pedidos cargados desde Supabase: X"')
  console.log('   - "⚠️ No hay pedidos en Supabase..."')
  console.log('   - "🪦 Tombstones activos: X"')
  console.log('5. Si no aparecen pedidos, ejecutar en consola:')
  console.log('   localStorage.getItem("pedidosCatalogoDeleted")')
  console.log('   → Si devuelve IDs, esos pedidos están ocultos por tombstones')
  console.log('6. Para limpiar tombstones manualmente:')
  console.log('   localStorage.removeItem("pedidosCatalogoDeleted")')
  console.log('   → Luego recargar la página')

  console.log('\n═'.repeat(60))
  console.log('✅ Diagnóstico completado')
}

debugPedidosUI().catch(console.error)
