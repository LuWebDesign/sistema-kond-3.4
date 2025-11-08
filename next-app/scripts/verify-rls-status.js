// Script para verificar políticas RLS activas
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Verificando políticas RLS activas en tabla usuarios...\n')

async function checkRLSEnabled() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // Verificar si RLS está habilitado
  const { data, error } = await supabaseAdmin.rpc('check_rls_enabled', {
    table_name: 'usuarios'
  }).single()
  
  if (error) {
    console.log('⚠️  No se pudo verificar RLS con RPC, intentando query directa...\n')
  }
}

async function listPolicies() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // Query directa a pg_catalog para ver políticas
  const query = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies 
    WHERE tablename = 'usuarios'
    ORDER BY policyname;
  `
  
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: query })
  
  if (error) {
    console.error('❌ Error consultando políticas:', error.message)
    console.log('\n💡 Tip: Ejecuta este SQL manualmente en Supabase SQL Editor:')
    console.log(query)
    return
  }
  
  console.log('✅ Políticas encontradas:\n')
  console.log(data)
}

async function testQuery() {
  console.log('\n🧪 Probando consulta SELECT con anon key...\n')
  
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const { data, error } = await supabaseAnon
    .from('usuarios')
    .select('id, username, rol')
    .limit(1)
  
  if (error) {
    console.error('❌ Error:', error.message)
    console.log('   Código:', error.code)
    console.log('   Status:', error.status || 'N/A')
    
    if (error.code === 'PGRST116' || error.message?.includes('406')) {
      console.log('\n⚠️  PROBLEMA: La política SELECT no está funcionando correctamente')
      console.log('   Solución: Ejecuta el script SQL completo en Supabase Dashboard')
    }
    return
  }
  
  console.log('✅ Consulta exitosa')
  console.log('   Registros:', data?.length || 0)
}

checkRLSEnabled()
  .then(() => listPolicies())
  .then(() => testQuery())
  .catch(err => console.error('Error:', err))
