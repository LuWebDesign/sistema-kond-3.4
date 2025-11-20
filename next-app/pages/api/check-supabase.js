// API endpoint para verificar configuración de Supabase
// Uso: GET /api/check-supabase

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const config = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'Falta',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado (oculto)' : 'Falta',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado (oculto)' : 'Falta',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'No definido',
      vercelUrl: process.env.VERCEL_URL || 'No definido'
    }

    console.log('🔍 Verificación de configuración Supabase:', {
      ...config,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-10) : 'Falta',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-10) : 'Falta'
    })

    const hasAllRequired = config.hasSupabaseUrl && config.hasSupabaseAnonKey

    res.status(200).json({
      success: hasAllRequired,
      message: hasAllRequired ? 'Configuración completa' : 'Faltan variables de entorno',
      config
    })

  } catch (error) {
    console.error('❌ Error verificando configuración:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}