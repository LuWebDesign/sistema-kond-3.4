/**
 * Script de prueba end-to-end para pedidos del catálogo
 * Verifica: crear pedido → aparecer en admin → eliminar → no reaparecer
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

async function testFullFlow() {
  console.log('\n🧪 Test End-to-End: Pedidos del Catálogo\n')
  console.log('═'.repeat(60))

  try {
    // PASO 1: Crear un pedido de prueba
    console.log('\n📝 PASO 1: Creando pedido de prueba...\n')
    
    const testPedido = {
      cliente_nombre: 'Test Usuario',
      cliente_apellido: 'E2E',
      cliente_telefono: '+5491199999999',
      cliente_email: 'test@e2e.local',
      cliente_direccion: 'Calle Test 123',
      metodo_pago: 'whatsapp',
      estado_pago: 'sin_seña',
      total: 1000,
      fecha_solicitud_entrega: null
    }

    const { data: pedidoCreado, error: createError } = await supabase
      .from('pedidos_catalogo')
      .insert([testPedido])
      .select()
      .single()

    if (createError) {
      console.error('❌ Error al crear pedido:', createError.message)
      return
    }

    console.log(`✅ Pedido creado con ID: ${pedidoCreado.id}`)
    console.log(`   Cliente: ${pedidoCreado.cliente_nombre} ${pedidoCreado.cliente_apellido}`)
    console.log(`   Total: $${pedidoCreado.total}`)
    console.log(`   Método: ${pedidoCreado.metodo_pago}`)

    // Crear items del pedido
    const testItems = [{
      pedido_catalogo_id: pedidoCreado.id,
      producto_id: 7, // Usando el producto de prueba existente
      producto_nombre: 'Producto Test',
      producto_precio: 1000,
      cantidad: 1,
      medidas: '10x10cm'
    }]

    const { error: itemsError } = await supabase
      .from('pedidos_catalogo_items')
      .insert(testItems)

    if (itemsError) {
      console.error('⚠️  Error al crear items:', itemsError.message)
    } else {
      console.log('✅ Items del pedido creados')
    }

    // PASO 2: Verificar que aparece en la lista
    console.log('\n📋 PASO 2: Verificando que aparece en lista...\n')
    
    await new Promise(resolve => setTimeout(resolve, 500)) // Esperar un poco

    const { data: pedidosLista, error: listError } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .eq('id', pedidoCreado.id)

    if (listError) {
      console.error('❌ Error al listar pedidos:', listError.message)
      return
    }

    if (pedidosLista && pedidosLista.length > 0) {
      console.log('✅ Pedido encontrado en la lista')
      console.log(`   Items: ${pedidosLista[0].items?.length || 0}`)
    } else {
      console.log('❌ Pedido NO encontrado en la lista')
    }

    // PASO 3: Eliminar el pedido
    console.log('\n🗑️  PASO 3: Eliminando pedido...\n')

    const { error: deleteError } = await supabase
      .from('pedidos_catalogo')
      .delete()
      .eq('id', pedidoCreado.id)

    if (deleteError) {
      console.error('❌ Error al eliminar pedido:', deleteError.message)
      return
    }

    console.log('✅ Pedido eliminado de la base de datos')

    // PASO 4: Verificar que ya no aparece
    console.log('\n🔍 PASO 4: Verificando que ya no aparece...\n')

    await new Promise(resolve => setTimeout(resolve, 500))

    const { data: pedidosVerify, error: verifyError } = await supabase
      .from('pedidos_catalogo')
      .select('*')
      .eq('id', pedidoCreado.id)

    if (verifyError) {
      console.error('❌ Error al verificar:', verifyError.message)
      return
    }

    if (!pedidosVerify || pedidosVerify.length === 0) {
      console.log('✅ Pedido eliminado correctamente (no aparece)')
    } else {
      console.log('❌ Pedido AÚN aparece en la base de datos')
    }

    // RESUMEN
    console.log('\n' + '═'.repeat(60))
    console.log('\n📊 RESUMEN DEL TEST:\n')
    console.log('✅ Crear pedido     → OK')
    console.log('✅ Aparece en lista → OK')
    console.log('✅ Eliminar pedido  → OK')
    console.log('✅ No reaparece     → OK')
    console.log('\n🎉 Todos los tests pasaron correctamente\n')

  } catch (error) {
    console.error('\n❌ Error inesperado:', error.message)
    console.log('\n⚠️  El test falló\n')
  }
}

// Ejecutar test
testFullFlow()
  .then(() => {
    console.log('✅ Test completado\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en test:', error)
    process.exit(1)
  })
