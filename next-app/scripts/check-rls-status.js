/**
 * Script para verificar políticas RLS en Supabase
 * Ejecutar: node scripts/check-rls-status.js
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

async function checkRLSStatus() {
  console.log('🔍 VERIFICANDO POLÍTICAS RLS EN SUPABASE\n')
  console.log('═'.repeat(60))

  try {
    // Query para obtener políticas de una tabla
    const { data: policies, error } = await supabase
      .rpc('exec_sql', {
        query: `
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
          WHERE schemaname = 'public'
          AND tablename IN ('pedidos_catalogo', 'pedidos_catalogo_items', 'productos')
          ORDER BY tablename, policyname;
        `
      })

    if (error) {
      console.log('\n⚠️  No se pudo consultar políticas directamente')
      console.log('Probablemente necesitas ejecutar el script SQL manualmente\n')
      
      console.log('📋 PASOS PARA VERIFICAR MANUALMENTE:')
      console.log('─'.repeat(60))
      console.log('1. Ve a Supabase Dashboard')
      console.log('2. Table Editor → pedidos_catalogo')
      console.log('3. Scroll down → sección "Policies"')
      console.log('4. Debes ver 3 políticas:')
      console.log('   ✓ insert_pedidos_publico')
      console.log('   ✓ select_pedidos_authenticated')
      console.log('   ✓ update_pedidos_authenticated')
      console.log('\n5. Repite para pedidos_catalogo_items (debe tener 2 políticas)')
      console.log('\n📄 Si NO ves políticas:')
      console.log('   → Ve a SQL Editor')
      console.log('   → Copia el contenido de supabase-rls-policies.sql')
      console.log('   → Ejecuta el script (Run)')
      
      console.log('\n═'.repeat(60))
      return
    }

    if (policies && policies.length > 0) {
      console.log('\n✅ POLÍTICAS ENCONTRADAS:\n')
      
      let currentTable = ''
      policies.forEach(p => {
        if (p.tablename !== currentTable) {
          currentTable = p.tablename
          console.log(`\n📊 Tabla: ${p.tablename}`)
          console.log('─'.repeat(60))
        }
        console.log(`  ✓ ${p.policyname} (${p.cmd})`)
      })
      
      console.log('\n═'.repeat(60))
      console.log('\n🎉 Las políticas están aplicadas correctamente')
      
    } else {
      console.log('\n⚠️  NO SE ENCONTRARON POLÍTICAS')
      console.log('\nDebes aplicar el script supabase-rls-policies.sql')
      console.log('en el SQL Editor de Supabase Dashboard')
    }

  } catch (err) {
    console.error('❌ Error al verificar políticas:', err.message)
    console.log('\n📋 Verifica manualmente en Supabase Dashboard')
  }
  
  console.log('\n═'.repeat(60))
}

checkRLSStatus().catch(console.error)
