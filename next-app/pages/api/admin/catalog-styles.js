import { supabaseAdmin } from '../../../utils/supabaseClient'

const DEFAULT_STYLES = {
  headerBg: '',
  headerTextColor: '',
  logoText: 'KOND',
  logoUrl: '',
  catalogBg: '',
  catalogTextColor: '',
  accentColor: '#3b82f6',
  buttonBg: '#3b82f6',
  buttonTextColor: '#ffffff',
  buttonRadius: '12',
  cardBg: '',
  cardBorderColor: '',
  cardRadius: '12',
  badgeBg: '',
  badgeTextColor: '#ffffff',
  footerBg: '',
  footerTextColor: '',
  footerDescription: '',
  footerPhone: '',
  footerEmail: '',
  footerAddress: '',
  bannerEnabled: false,
  bannerText: '',
  bannerBg: '#3b82f6',
  bannerTextColor: '#ffffff',
}

export default async function handler(req, res) {
  try {
    const supabase = supabaseAdmin()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('catalog_styles').select('styles').single()
      if (error) {
        return res.status(200).json({ styles: DEFAULT_STYLES })
      }
      return res.status(200).json({ styles: data?.styles || DEFAULT_STYLES })
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const styles = req.body?.styles
      if (!styles) return res.status(400).json({ success: false, error: 'Missing styles in body' })

      const { data: existing, error: fetchError } = await supabase.from('catalog_styles').select('id').single()
      if (fetchError && fetchError.code !== 'PGRST116') {
        return res.status(500).json({ success: false, error: fetchError.message || String(fetchError) })
      }

      if (existing) {
        const { error } = await supabase.from('catalog_styles').update({ styles, updated_at: new Date().toISOString() }).eq('id', existing.id)
        if (error) return res.status(500).json({ success: false, error: error.message || String(error) })
        return res.status(200).json({ success: true })
      }

      const { error } = await supabase.from('catalog_styles').insert([{ styles, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      if (error) return res.status(500).json({ success: false, error: error.message || String(error) })
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  } catch (err) {
    console.error('API /api/admin/catalog-styles error:', err)
    return res.status(500).json({ success: false, error: err?.message || String(err) })
  }
}
