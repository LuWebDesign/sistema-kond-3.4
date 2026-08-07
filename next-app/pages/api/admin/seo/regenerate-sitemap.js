// next-app/pages/api/admin/seo/regenerate-sitemap.js
import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { TENANT_ID } from '../../../../lib/tenant'
import { verifyAdminCookie } from '../../../../utils/verifyAdminCookie'
import { getSeoConfigServer } from '../../../../lib/getSeoConfigServer'
import { getSitemapUrls } from '../../../../lib/sitemapUrls'

export default async function handler(req, res) {
  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  if (req.method !== 'POST')
    return res.status(405).end('Method Not Allowed')
  try {
    const supabase = supabaseAdmin()
    const seoConfig = await getSeoConfigServer()
    const sitemapUrls = await getSitemapUrls(supabase, {
      includeCategories: seoConfig.sitemapIncludeCategories,
      includeProducts: seoConfig.sitemapIncludeProducts,
      includePages: seoConfig.sitemapIncludePages,
    })
    const urlCount = sitemapUrls.length
    const now = new Date().toISOString()

    // Read existing config then patch
    const { data: existing } = await supabase.from('seo_config')
      .select('id, config').eq('tenant_id', TENANT_ID).single()

    const updatedConfig = {
      ...(existing?.config || {}),
      sitemapLastGenerated: now,
      sitemapUrlCount: urlCount,
    }
    if (existing) {
      await supabase.from('seo_config')
        .update({ config: updatedConfig, updated_at: now })
        .eq('id', existing.id).eq('tenant_id', TENANT_ID)
    } else {
      await supabase.from('seo_config')
        .insert([{ config: updatedConfig, tenant_id: TENANT_ID, created_at: now, updated_at: now }])
    }
    return res.status(200).json({ success: true, urlCount, generatedAt: now })
  } catch (err) {
    console.error('[regenerate-sitemap]', err)
    return res.status(500).json({ success: false, error: err?.message || String(err) })
  }
}
