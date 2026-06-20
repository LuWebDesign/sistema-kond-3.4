// next-app/pages/api/admin/home-config.js
// CRUD for home page configuration stored in Supabase.
// Table: home_config (id, tenant_id, config JSONB, updated_at)
// Pattern mirrors catalog-styles.js

import { supabaseAdmin } from '../../../utils/supabaseClient'
import { TENANT_ID } from '../../../lib/tenant'
import { verifyAdminCookie } from '../../../utils/verifyAdminCookie'

export const DEFAULT_HOME_CONFIG = {
  // Announcement bar messages (scrolling marquee)
  bannerMessages: [
    '5% OFF abonando por transferencia',
    'Envíos a todo el país',
    'Pedidos personalizados',
  ],
  // Category display order: array of category IDs.
  // Categories not listed here appear after the ordered ones.
  categoryOrder: [],
  // Category IDs to hide from the home page entirely.
  hiddenCategories: [],
  // Home sections: defines which special sections are active and their order.
  // Category product rows are independent — controlled from admin/website/categorias.
  sections: [
    { id: 'featured',       label: 'Productos Destacados',   type: 'featured',       enabled: true,  order: 1 },
    { id: 'category_tiles', label: 'Carrusel de Categorías', type: 'category_tiles', enabled: true,  order: 2 },
    { id: 'promo',          label: 'En Promoción',           type: 'promos',         enabled: false, order: 3 },
  ],
}

export default async function handler(req, res) {
  // Allow public GET requests (front and admin UI read). Only guard
  // POST/PUT which modify the config.
  if (req.method !== 'GET') {
    const userId = await verifyAdminCookie(req)
    if (!userId) return res.status(401).json({ error: 'No autorizado' })
  }

  if (!['GET', 'POST', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const supabase = supabaseAdmin()

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('home_config')
        .select('config')
        .eq('tenant_id', TENANT_ID)
        .single()

      if (error) {
        // Row doesn't exist yet — return defaults
        return res.status(200).json({ config: DEFAULT_HOME_CONFIG })
      }
      return res.status(200).json({ config: { ...DEFAULT_HOME_CONFIG, ...(data?.config || {}) } })
    }

    // POST / PUT — upsert config
    const incoming = req.body?.config
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing or invalid config in body' })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('home_config')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(500).json({ success: false, error: fetchError.message || String(fetchError) })
    }

    const now = new Date().toISOString()

    if (existing) {
      const { error } = await supabase
        .from('home_config')
        .update({ config: incoming, updated_at: now })
        .eq('id', existing.id)
        .eq('tenant_id', TENANT_ID)
      if (error) return res.status(500).json({ success: false, error: error.message || String(error) })
    } else {
      const { error } = await supabase
        .from('home_config')
        .insert([{ config: incoming, tenant_id: TENANT_ID, created_at: now, updated_at: now }])
      if (error) return res.status(500).json({ success: false, error: error.message || String(error) })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[home-config] Error:', err)
    return res.status(500).json({ success: false, error: err?.message || String(err) })
  }
}
