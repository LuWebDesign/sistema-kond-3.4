// next-app/pages/api/home-data.js
// Aggregated home page data endpoint.
// Returns featured products, top-level categories, and products grouped by category.
// All products are enriched with active promotion data.
// Cache-Control: s-maxage=300, stale-while-revalidate=600

import { supabaseAdmin } from '../../utils/supabaseClient';
import { TENANT_ID } from '../../lib/tenant';
import { applyPromotionsToProduct } from '../../utils/promoEngine';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = supabaseAdmin();

    const [featuredResult, categoriesResult, allProductsResult, promosResult, activePromosResult] = await Promise.all([
      // Query 1: Featured products
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, featured, categoria_id, categoria')
        .eq('tenant_id', TENANT_ID)
        .eq('featured', true)
        .eq('publicado', true)
        .limit(8)
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 2: All categories (top-level + subcategories) for slug resolution and display
      // NOTE: column is 'activa' (not 'active') — must match supabaseCategorias.js
      admin
        .from('categorias')
        .select('id, nombre, slug, parent_id, imagen_url')
        .eq('tenant_id', TENANT_ID)
        .eq('activa', true)
        .order('nombre', { ascending: true })
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 3: All published products — matches catalog filter (publicado only, no active check)
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, categoria_id, categoria')
        .eq('tenant_id', TENANT_ID)
        .eq('publicado', true)
        .order('categoria_id', { ascending: true })
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 4: Promo products — products with an active promotion OR static_promo_price
      admin
        .from('productos')
        .select('id, nombre, imagenes_urls, precio_unitario, categoria_id, static_promo_price, promo_badge')
        .eq('tenant_id', TENANT_ID)
        .eq('publicado', true)
        .not('static_promo_price', 'is', null)
        .limit(20)
        .then((r) => (r.error ? { data: [], error: null } : r)),

      // Query 5: Active promotions for enrichment
      admin
        .from('promociones')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('activo', true)
        .then((r) => (r.error ? { data: [], error: null } : r)),
    ]);

    const categories = categoriesResult.data || [];
    const allProducts = allProductsResult.data || [];
    const promos = promosResult.data || [];
    const featured = featuredResult.data || [];
    const activePromosRaw = activePromosResult.data || [];

    // Map categoria_id → nombre for promo engine matching
    const catNameMap = Object.fromEntries(categories.map((c) => [c.id, c.nombre]));

    // Normalize raw DB promos (snake_case) to camelCase expected by promo engine
    const activePromos = activePromosRaw.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      valor: p.valor,
      aplicaA: p.aplica_a,
      categoria: p.categoria,
      productoId: p.producto_id,
      fechaInicio: p.fecha_inicio,
      fechaFin: p.fecha_fin,
      activo: p.activo,
      prioridad: p.prioridad,
      badgeTexto: p.badge_texto,
      badgeColor: p.badge_color,
      badgeOpacity: p.badge_opacity,
      badgeTextColor: p.badge_text_color,
      descuentoPorcentaje: p.descuento_porcentaje,
      descuentoMonto: p.descuento_monto,
      precioEspecial: p.precio_especial,
      config: p.configuracion || p.config,
    }));

    // Enrich products with promotion data (same logic as useProducts in useCatalog.js)
    function enrichProduct(p) {
      const productForPromo = {
        id: p.id,
        categoria: p.categoria || catNameMap[p.categoria_id] || null,
        precioUnitario: p.precio_unitario || 0,
      };

      try {
        const promo = applyPromotionsToProduct(productForPromo, activePromos);
        return {
          ...p,
          hasPromotion: !!(promo && promo.hasPromotion),
          precioPromocional: promo && promo.hasPromotion ? promo.discountedPrice : p.precio_unitario,
          promotionBadges: promo && promo.badges ? promo.badges : [],
        };
      } catch {
        return p;
      }
    }

    const featuredEnriched = featured.map(enrichProduct);
    const allProductsEnriched = allProducts.map(enrichProduct);

    // Group enriched products by categoria_id
    const byCategory = {};
    for (const product of allProductsEnriched) {
      const catId = product.categoria_id;
      if (catId == null) continue;
      if (!byCategory[catId]) byCategory[catId] = [];
      byCategory[catId].push(product);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ featured: featuredEnriched, categories, byCategory, promos });
  } catch (error) {
    console.error('[home-data] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
