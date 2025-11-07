require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno en next-app/.env.local (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function list() {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, precio_promos, descuento_porcentaje, descuento_monto, precio_unitario')
      .order('id', { ascending: true })

    if (error) {
      console.error('❌ Error al consultar productos:', error.message || error)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No hay productos en la tabla productos')
      return
    }

    console.log(`📊 Productos encontrados: ${data.length}\n`)
    data.forEach(p => {
      console.log(`ID: ${p.id} | ${p.nombre}`)
      console.log(`  precio_unitario: ${p.precio_unitario}`)
      console.log(`  precio_promos: ${p.precio_promos}`)
      console.log(`  descuento_porcentaje: ${p.descuento_porcentaje}`)
      console.log(`  descuento_monto: ${p.descuento_monto}`)
      console.log('------------------------------------------------')
    })
  } catch (err) {
    console.error('❌ Error inesperado:', err.message || err)
  }
}

list()
