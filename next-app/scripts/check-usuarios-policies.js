// Script para verificar políticas RLS de la tabla usuarios
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Verificando políticas RLS de tabla usuarios...\n')

async function checkPolicies() {
  // Cliente con service_role (bypasea RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // Consulta las políticas RLS de la tabla usuarios
  const { data: policies, error } = await supabaseAdmin
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'usuarios')
  
  if (error) {
    console.error('❌ Error consultando políticas:', error)
    return
  }
  
  if (!policies || policies.length === 0) {
    console.log('⚠️  NO SE ENCONTRARON POLÍTICAS RLS para la tabla usuarios')
    console.log('   Esto significa que las políticas NO se aplicaron correctamente\n')
    return
  }
  
  console.log(`✅ Se encontraron ${policies.length} políticas RLS:\n`)
  
  policies.forEach(policy => {
    console.log(`📋 Política: ${policy.policyname}`)
    console.log(`   - Comando: ${policy.cmd}`)
    console.log(`   - Permisivo: ${policy.permissive}`)
    console.log(`   - Roles: ${policy.roles}`)
    console.log(`   - USING: ${policy.qual}`)
    console.log(`   - WITH CHECK: ${policy.with_check}`)
    console.log('')
  })
}

async function testAnonQuery() {
  console.log('\n🧪 Probando consulta con anon key...\n')
  
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data, error } = await supabaseAnon
    .from('usuarios')
    .select('id, username, rol')
    .limit(1)
  
  if (error) {
    console.error('❌ Error con anon key:', error)
    console.log('   Código:', error.code)
    console.log('   Status:', error.status)
    console.log('   Hint:', error.hint)
    return
  }
  
  console.log('✅ Consulta con anon key exitosa')
  console.log('   Registros obtenidos:', data?.length || 0)
}

checkPolicies()
  .then(() => testAnonQuery())
  .catch(err => console.error('Error:', err))
