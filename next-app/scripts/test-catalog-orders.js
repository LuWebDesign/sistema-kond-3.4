/**
 * Script de diagnóstico para verificar que los pedidos del catálogo 
 * se guarden correctamente en Supabase
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

async function testCatalogOrders() {
  console.log('\n🔍 Verificando pedidos del catálogo en Supabase...\n')

  try {
    // Obtener todos los pedidos
    const { data: pedidos, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .order('fecha_creacion', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error al obtener pedidos:', error.message)
      return
    }

    if (!pedidos || pedidos.length === 0) {
      console.log('⚠️  No hay pedidos en la tabla pedidos_catalogo')
      console.log('ℹ️  Esto podría significar que:')
      console.log('   1. No se han creado pedidos desde el catálogo público')
      console.log('   2. Los pedidos se están guardando solo en localStorage')
      console.log('   3. Hay un error en la función createPedidoCatalogo')
      return
    }

    console.log(`✅ Se encontraron ${pedidos.length} pedidos (mostrando últimos 10):\n`)

    pedidos.forEach((pedido, index) => {
      console.log(`📦 Pedido #${pedido.id}`)
      console.log(`   Cliente: ${pedido.cliente_nombre} ${pedido.cliente_apellido || ''}`)
      console.log(`   Email: ${pedido.cliente_email}`)
      console.log(`   Teléfono: ${pedido.cliente_telefono}`)
      console.log(`   Método de pago: ${pedido.metodo_pago}`)
      console.log(`   Estado de pago: ${pedido.estado_pago}`)
      console.log(`   Total: $${pedido.total}`)
      console.log(`   Fecha: ${new Date(pedido.fecha_creacion).toLocaleString('es-AR')}`)
      console.log(`   Items: ${pedido.items?.length || 0} producto(s)`)
      if (pedido.items && pedido.items.length > 0) {
        pedido.items.forEach(item => {
          console.log(`      - ${item.producto_nombre} x${item.cantidad} ($${item.producto_precio})`)
        })
      }
      console.log('')
    })

    console.log(`📊 Total de pedidos en base de datos: ${pedidos.length}`)

  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
  }
}

// Ejecutar test
testCatalogOrders()
  .then(() => {
    console.log('\n✅ Diagnóstico completado\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error en diagnóstico:', error)
    process.exit(1)
  })
