// Script para verificar datos de productos en Supabase para el catálogo
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Crear cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProductosCatalog() {
  try {
    console.log('🔍 Verificando productos publicados en Supabase...\n')
    
    // Obtener productos publicados
    const { data: productos, error } = await supabase
      .from('productos')
      .select('*')
      .eq('publicado', true)
      .eq('active', true)
      .order('nombre')
    
    if (error) {
      console.error('❌ Error obteniendo productos:', error)
      return
    }
    
    if (!productos || productos.length === 0) {
      console.log('⚠️ No hay productos publicados en Supabase')
      return
    }
    
    console.log(`📦 Total de productos publicados: ${productos.length}\n`)
    
    // Analizar cada producto
    let sinPrecio = 0
    let sinImagen = 0
    let completos = 0
    
    productos.forEach((p, index) => {
      const issues = []
      
      if (!p.precio_unitario || p.precio_unitario === 0) {
        issues.push('❌ SIN PRECIO')
        sinPrecio++
      }
      
      if (!p.imagen_url) {
        issues.push('⚠️ Sin imagen')
        sinImagen++
      }
      
      if (issues.length === 0) {
        completos++
      }
      
      console.log(`${index + 1}. ${p.nombre}`)
      console.log(`   ID: ${p.id}`)
      console.log(`   Categoría: ${p.categoria || 'Sin categoría'}`)
      console.log(`   Precio: $${p.precio_unitario || 0}`)
      console.log(`   Imagen: ${p.imagen_url ? '✅ Sí' : '❌ No'}`)
      
      if (issues.length > 0) {
        console.log(`   Problemas: ${issues.join(', ')}`)
      }
      
      console.log('')
    })
    
    // Resumen
    console.log('═══════════════════════════════════════')
    console.log('📊 RESUMEN:')
    console.log(`✅ Productos completos: ${completos}`)
    console.log(`❌ Productos sin precio: ${sinPrecio}`)
    console.log(`⚠️ Productos sin imagen: ${sinImagen}`)
    console.log('═══════════════════════════════════════\n')
    
    if (sinPrecio > 0 || sinImagen > 0) {
      console.log('💡 SOLUCIÓN:')
      console.log('Los productos necesitan tener precio e imagen para mostrarse correctamente.')
      console.log('Opciones:')
      console.log('1. Migrar datos desde localStorage a Supabase')
      console.log('2. Agregar precios e imágenes manualmente en Supabase')
      console.log('3. Usar el panel administrativo para actualizar productos\n')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkProductosCatalog()
