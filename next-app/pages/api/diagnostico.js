// Página de diagnóstico para verificar configuración en Vercel
// Ruta: /api/diagnostico

export default function handler(req, res) {
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ Faltante',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Faltante',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Faltante',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  }

  console.log('🔍 Diagnóstico de variables de entorno:', envStatus)

  res.status(200).json({
    message: 'Diagnóstico de configuración',
    environment: envStatus,
    instructions: {
      vercel: 'Configura las variables de entorno en https://vercel.com/dashboard',
      variables: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ]
    }
  })
}
