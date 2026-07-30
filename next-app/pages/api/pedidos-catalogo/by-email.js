import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const email = Array.isArray(req.query.email) ? req.query.email[0] : req.query.email
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Sesión requerida' })

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Autenticación no configurada' })
    }

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    const requestedEmail = String(email).trim().toLowerCase()
    const authenticatedEmail = authData?.user?.email?.trim().toLowerCase()

    if (authError || !authenticatedEmail) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }

    if (requestedEmail !== authenticatedEmail) {
      return res.status(403).json({ error: 'No autorizado para consultar estos pedidos' })
    }

    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        items:pedidos_catalogo_items(*)
      `)
      .eq('cliente_email', requestedEmail)
      .eq('tenant_id', TENANT_ID)
      .order('fecha_creacion', { ascending: false })

    if (error) throw error
    return res.status(200).json({ data })
  } catch (error) {
    console.error('Error obteniendo pedidos por email:', error)
    return res.status(500).json({ error: error.message || 'Error interno' })
  }
}
