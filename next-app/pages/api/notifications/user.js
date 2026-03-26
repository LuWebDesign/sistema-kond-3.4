// API endpoint para notificaciones de compradores (target_user = 'user')
// Usa supabaseAdmin para bypass de RLS (los compradores no tienen sesión Supabase Auth)

import { supabaseAdmin } from '../../../utils/supabaseClient'

export default async function handler(req, res) {
  const { email } = req.query

  // --- GET: obtener notificaciones de un comprador por email ---
  if (req.method === 'GET') {
    if (!email) {
      return res.status(400).json({ error: 'Se requiere el parámetro email' })
    }

    try {
      const client = supabaseAdmin()
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('target_user', 'user')
        .eq('meta->>userId', email)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return res.status(200).json({ data: data || [] })
    } catch (error) {
      console.error('❌ [API] Error obteniendo notificaciones de usuario:', error)
      return res.status(500).json({ error: 'Error interno', details: error.message })
    }
  }

  // --- POST: acciones de mutación (markRead, markAllRead, delete, deleteAll) ---
  if (req.method === 'POST') {
    const { action, id, userEmail } = req.body

    if (!action) {
      return res.status(400).json({ error: 'Se requiere el campo action' })
    }

    try {
      const client = supabaseAdmin()

      if (action === 'markRead') {
        if (!id) return res.status(400).json({ error: 'Se requiere id' })
        const { error } = await client
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', id)
          .eq('target_user', 'user')
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      if (action === 'markAllRead') {
        if (!userEmail) return res.status(400).json({ error: 'Se requiere userEmail' })
        const { error } = await client
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('target_user', 'user')
          .eq('meta->>userId', userEmail)
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      if (action === 'delete') {
        if (!id) return res.status(400).json({ error: 'Se requiere id' })
        const { error } = await client
          .from('notifications')
          .delete()
          .eq('id', id)
          .eq('target_user', 'user')
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      if (action === 'deleteAll') {
        if (!userEmail) return res.status(400).json({ error: 'Se requiere userEmail' })
        const { error } = await client
          .from('notifications')
          .delete()
          .eq('target_user', 'user')
          .eq('meta->>userId', userEmail)
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      return res.status(400).json({ error: `Acción desconocida: ${action}` })

    } catch (error) {
      console.error('❌ [API] Error en acción sobre notificaciones:', error)
      return res.status(500).json({ error: 'Error interno', details: error.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
