/**
 * Script para revisar la estructura de las tablas
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTableStructure() {
  console.log('📋 VERIFICANDO ESTRUCTURA DE TABLAS\n')

  // Consulta simple sin especificar columnas de items
  console.log('1️⃣  Consultando pedidos_catalogo_items:')
  const { data: items, error: errorItems } = await supabase
    .from('pedidos_catalogo_items')
    .select('*')
    .limit(1)

  if (errorItems) {
    console.error('❌ Error:', errorItems)
  } else {
    console.log('✅ Estructura encontrada:')
    if (items && items.length > 0) {
      console.log('   Columnas:', Object.keys(items[0]).join(', '))
      console.log('   Ejemplo:', items[0])
    } else {
      console.log('   (No hay datos para mostrar estructura)')
    }
  }

  console.log('\n2️⃣  Consultando pedidos_catalogo:')
  const { data: pedidos, error: errorPedidos } = await supabase
    .from('pedidos_catalogo')
    .select('*')
    .limit(1)

  if (errorPedidos) {
    console.error('❌ Error:', errorPedidos)
  } else {
    console.log('✅ Estructura encontrada:')
    if (pedidos && pedidos.length > 0) {
      console.log('   Columnas:', Object.keys(pedidos[0]).join(', '))
    } else {
      console.log('   (No hay datos para mostrar estructura)')
    }
  }
}

checkTableStructure().catch(console.error)
