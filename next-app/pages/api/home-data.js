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

    const [featuredResult, categoriesResult, allProductsResult] = await Promise.all([
      // Query 1: Featured products
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, featured, categoria_id')
        .eq('tenant_id', TENANT_ID)
        .eq('featured', true)
        .eq('publicado', true)
        .eq('active', true)
        .eq('hidden_in_productos', false)
        .limit(8)
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 2: All categories (top-level + subcategories) for slug resolution and display
      // NOTE: column is 'activa' (not 'active') — must match supabaseCategorias.js
      admin
        .from('categorias')
        .select('id, nombre, slug, parent_id')
        .eq('tenant_id', TENANT_ID)
        .eq('activa', true)
        .order('nombre', { ascending: true })
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 3: All published products
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, categoria_id')
        .eq('tenant_id', TENANT_ID)
        .eq('publicado', true)
        .eq('active', true)
        .eq('hidden_in_productos', false)
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
    return res.status(200).json({ featured, categories, byCategory });
  } catch (error) {
    console.error('[home-data] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
