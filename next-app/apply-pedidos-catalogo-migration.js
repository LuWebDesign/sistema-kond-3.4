// Script para agregar columnas faltantes a pedidos_catalogo
// Ejecutar: node apply-pedidos-catalogo-migration.js

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Cargar .env.local
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🚀 Aplicando migración: add-pedidos-catalogo-fields.sql\n')

  try {
    // Leer el archivo SQL
    const sqlPath = join(__dirname, '..', 'supabase', 'add-pedidos-catalogo-fields.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    console.log('📄 Contenido del SQL:')
    console.log('─'.repeat(60))
    console.log(sqlContent.substring(0, 500) + '...')
    console.log('─'.repeat(60))
    console.log('')

    // Ejecutar el SQL
    console.log('⏳ Ejecutando migración en Supabase...\n')
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })

    if (error) {
      // Si no existe la función exec_sql, intentar ejecutar directamente
      console.log('⚠️  La función exec_sql no está disponible')
      console.log('📝 Por favor, ejecuta este SQL manualmente en el SQL Editor de Supabase:\n')
      console.log('─'.repeat(60))
      console.log(sqlContent)
      console.log('─'.repeat(60))
      console.log('')
      console.log('🔗 Ir a: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new')
      process.exit(0)
    }

    console.log('✅ Migración aplicada exitosamente!')
    console.log('📊 Resultado:', data)

  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message)
    console.error(error)
    process.exit(1)
  }
}

applyMigration()
