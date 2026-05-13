// next-app/pages/api/home-data.js
// Aggregated home page data endpoint.
// Returns featured products, top-level categories, and products grouped by category.
// Cache-Control: s-maxage=300, stale-while-revalidate=600

import { supabaseAdmin } from '../../utils/supabaseClient';
import { TENANT_ID } from '../../lib/tenant';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = supabaseAdmin();

    // DEBUG: verify connection
    const pingResult = await admin.from('productos').select('id').eq('tenant_id', TENANT_ID).limit(1);
    const debugInfo = { tenant: TENANT_ID, pingError: pingResult.error?.message || null, pingCount: pingResult.data?.length ?? null };

    const [featuredResult, categoriesResult, allProductsResult] = await Promise.all([
      // Query 1: Featured products (graceful — column may not exist yet)
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, static_promo_price, static_promo_start, static_promo_end, allow_promotions, promo_badge, featured, categoria_id')
        .eq('tenant_id', TENANT_ID)
        .eq('featured', true)
        .eq('publicado', true)
        .eq('active', true)
        .limit(8)
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 2: Top-level categories
      admin
        .from('categorias')
        .select('id, nombre, slug, parent_id')
        .eq('tenant_id', TENANT_ID)
        .is('parent_id', null)
        .eq('active', true)
        .order('orden', { ascending: true })
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 3: All published products with category
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, static_promo_price, static_promo_start, static_promo_end, allow_promotions, promo_badge, categoria_id')
        .eq('tenant_id', TENANT_ID)
        .eq('publicado', true)
        .eq('active', true)
        .limit(100)
        .then((r) => (r.error ? { data: [], error: null } : r)),
    ]);

    const categories = categoriesResult.data || [];
    const allProducts = allProductsResult.data || [];
    let featured = featuredResult.data || [];

    // Fallback: if featured.length < 4, fill from newest published products
    if (featured.length < 4) {
      const featuredIds = new Set(featured.map((p) => p.id));
      const extras = allProducts
        .filter((p) => !featuredIds.has(p.id))
        .slice(0, 8 - featured.length);
      featured = [...featured, ...extras];
    }

    // Group allProducts by categoria_id
    const byCategory = {};
    for (const product of allProducts) {
      const catId = product.categoria_id;
      if (catId == null) continue;
      if (!byCategory[catId]) byCategory[catId] = [];
      byCategory[catId].push(product);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ featured, categories, byCategory, _debug: debugInfo });
  } catch (error) {
    console.error('[home-data] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
