require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testImagenURL() {
  console.log('🔍 Consultando producto de Supabase...\n')
  
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, imagen_url, publicado, active')
    .eq('publicado', true)
    .eq('active', true)
    .limit(1)
    .single()
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  if (!data) {
    console.log('⚠️ No hay productos publicados')
    return
  }
  
  console.log('📦 Producto encontrado:')
  console.log('ID:', data.id)
  console.log('Nombre:', data.nombre)
  console.log('Publicado:', data.publicado)
  console.log('Active:', data.active)
  console.log('\n🖼️ URL de imagen:')
  console.log(data.imagen_url)
  
  // Verificar si la URL es pública
  if (data.imagen_url) {
    console.log('\n🌐 Probando acceso a la imagen...')
    try {
      const response = await fetch(data.imagen_url, { method: 'HEAD' })
      console.log('Status:', response.status)
      console.log('Content-Type:', response.headers.get('content-type'))
      
      if (response.status === 200) {
        console.log('✅ La imagen es accesible públicamente')
      } else if (response.status === 403) {
        console.log('❌ Error 403: La imagen NO es pública')
        console.log('\n💡 Solución: Haz el bucket público en Supabase:')
        console.log('   1. Ve a Storage > productos-imagenes')
        console.log('   2. Configuración > Make bucket public')
      } else {
        console.log('⚠️ Status inesperado:', response.status)
      }
    } catch (err) {
      console.error('❌ Error al probar acceso:', err.message)
    }
  } else {
    console.log('⚠️ El producto NO tiene imagen_url')
  }
}

testImagenURL()
