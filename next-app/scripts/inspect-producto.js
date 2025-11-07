// Script detallado para ver TODOS los campos del producto
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function inspectProduct() {
  try {
    const { data: productos, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', 7)
      .single()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('🔍 INSPECCIÓN DETALLADA DEL PRODUCTO:\n')
    console.log(JSON.stringify(productos, null, 2))
    
    console.log('\n📊 CAMPOS IMPORTANTES:')
    console.log('nombre:', productos.nombre)
    console.log('precio_unitario:', productos.precio_unitario)
    console.log('imagen_url:', productos.imagen_url ? `${productos.imagen_url.substring(0, 50)}...` : 'NULL')
    console.log('publicado:', productos.publicado)
    console.log('active:', productos.active)
    console.log('categoria:', productos.categoria)
    
    console.log('\n🖼️ IMAGEN:')
    console.log('Tipo:', typeof productos.imagen_url)
    console.log('Longitud:', productos.imagen_url?.length || 0)
    console.log('Es base64?:', productos.imagen_url?.startsWith('data:image') ? 'Sí' : 'No')
    console.log('Es URL?:', productos.imagen_url?.startsWith('http') ? 'Sí' : 'No')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

inspectProduct()
