// API Route: Health check
// GET /api/health

export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
    }
  });
}
