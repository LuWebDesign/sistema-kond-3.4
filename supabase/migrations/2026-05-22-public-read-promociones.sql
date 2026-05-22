-- Migration: Allow public read of active promotions
-- Without this policy, RLS blocks the public supabase client (anon key) from
-- reading promociones, so the catalog and product-detail pages get no promo
-- data and render no badges. The home page was unaffected because it uses
-- supabaseAdmin (service role) in an API route.
-- Pattern is identical to "Cupones activos son visibles".

CREATE POLICY "Promociones activas son visibles públicamente"
  ON public.promociones FOR SELECT
  USING (activo = true);
