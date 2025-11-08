/**
 * Script para verificar políticas RLS de Supabase
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLSPolicies() {
  console.log('🔒 VERIFICANDO POLÍTICAS RLS\n')
  console.log('═'.repeat(60))

  // Intentar eliminar con service_role (debe funcionar)
  console.log('\n1️⃣  Test: Eliminar con SERVICE_ROLE KEY')
  console.log('─'.repeat(60))
  
  // Primero crear un pedido de prueba
  const testPedido = {
    cliente_nombre: 'Test RLS',
    cliente_telefono: '1234567890',
    cliente_email: 'test-rls@test.com',
    metodo_pago: 'whatsapp',
    estado_pago: 'sin_seña',
    total: 100,
  }

  const { data: created, error: createError } = await supabase
    .from('pedidos_catalogo')
    .insert([testPedido])
    .select()
    .single()

  if (createError) {
    console.error('❌ Error al crear pedido de prueba:', createError)
    return
  }

  console.log(`✅ Pedido de prueba creado: ID ${created.id}`)

  // Intentar eliminarlo
  const { error: deleteError, status, statusText } = await supabase
    .from('pedidos_catalogo')
    .delete()
    .eq('id', created.id)

  if (deleteError) {
    console.error('❌ Error al eliminar con service_role:', deleteError)
    console.log('   Status:', status)
    console.log('   StatusText:', statusText)
  } else {
    console.log('✅ Eliminación exitosa con service_role')
  }

  // Verificar que fue eliminado
  const { data: checkData, error: checkError } = await supabase
    .from('pedidos_catalogo')
    .select('*')
    .eq('id', created.id)

  if (checkError) {
    console.error('❌ Error al verificar:', checkError)
  } else if (checkData.length === 0) {
    console.log('✅ Pedido eliminado correctamente (no existe en BD)')
  } else {
    console.log('⚠️  Pedido AÚN EXISTE en BD después de eliminar')
    console.log('   Datos:', checkData[0])
  }

  console.log('\n═'.repeat(60))
  console.log('📊 CONCLUSIÓN')
  console.log('─'.repeat(60))
  
  if (!deleteError && checkData.length === 0) {
    console.log('✅ Las políticas RLS permiten eliminación con service_role')
    console.log('⚠️  PROBLEMA: El cliente de Next.js está usando ANON_KEY')
    console.log('💡 SOLUCIÓN: Usar service_role en operaciones de admin')
  } else {
    console.log('❌ Hay un problema con las políticas RLS o configuración')
  }
}

checkRLSPolicies().catch(console.error)
