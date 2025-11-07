// API endpoint para diagnosticar configuración de Supabase
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!hasUrl || !hasKey) {
      return res.status(500).json({
        error: 'Variables de entorno no configuradas',
        config: {
          NEXT_PUBLIC_SUPABASE_URL: hasUrl ? 'Configurada ✅' : 'Falta ❌',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: hasKey ? 'Configurada ✅' : 'Falta ❌'
        }
      })
    }
    
    // Intentar conectar a Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Intentar obtener productos publicados
    const { data: productos, error } = await supabase
      .from('productos')
      .select('id, nombre, precio_unitario, imagen_url, publicado')
      .eq('publicado', true)
      .eq('active', true)
      .limit(5)
    
    if (error) {
      return res.status(500).json({
        error: 'Error consultando Supabase',
        details: error.message,
        config: {
          NEXT_PUBLIC_SUPABASE_URL: 'Configurada ✅',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Configurada ✅'
        }
      })
    }
    
    return res.status(200).json({
      success: true,
      config: {
        NEXT_PUBLIC_SUPABASE_URL: 'Configurada ✅',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Configurada ✅',
        connection: 'OK ✅'
      },
      productos: {
        total: productos?.length || 0,
        data: productos?.map(p => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio_unitario,
          tieneImagen: !!p.imagen_url,
          publicado: p.publicado
        }))
      }
    })
    
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno',
      message: error.message
    })
  }
}
