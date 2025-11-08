// ============================================
// API ROUTE: VERIFICAR VARIABLES DE ENTORNO
// Endpoint para diagnosticar configuración
// ============================================

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const checks = {
    supabaseUrl: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Falta',
    },
    supabaseAnonKey: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Falta',
      preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` 
        : null,
    },
    supabaseServiceRoleKey: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      value: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ FALTA - REQUERIDA PARA ELIMINACIÓN',
      preview: process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` 
        : null,
    },
    environment: process.env.NODE_ENV || 'unknown',
    vercel: {
      isVercel: !!process.env.VERCEL,
      env: process.env.VERCEL_ENV || 'local',
      region: process.env.VERCEL_REGION || 'local',
    }
  };

  const allConfigured = checks.supabaseUrl.exists && 
                        checks.supabaseAnonKey.exists && 
                        checks.supabaseServiceRoleKey.exists;

  return res.status(200).json({
    status: allConfigured ? 'ok' : 'incomplete',
    message: allConfigured 
      ? '✅ Todas las variables de entorno están configuradas correctamente'
      : '⚠️ Faltan variables de entorno requeridas',
    checks,
    timestamp: new Date().toISOString(),
  });
}
