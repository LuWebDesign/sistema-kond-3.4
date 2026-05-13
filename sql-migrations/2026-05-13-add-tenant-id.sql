-- ============================================================
-- MIGRATION: 2026-05-13 — Add tenants table + tenant_id foundation
-- ============================================================
-- Applies multi-tenant isolation to all 14 public tables.
-- Safe to run on an existing DB with live data.
--
-- Steps:
--   1. Audit: list existing tables
--   2. CREATE TABLE tenants
--   3. INSERT seed/placeholder tenant
--   4. ADD COLUMN tenant_id (nullable + default) on each table
--   5. Backfill: SET tenant_id = seed UUID where NULL
--   6. DROP DEFAULT on each table
--   7. SET NOT NULL on each table
--   8. ADD FOREIGN KEY → tenants(id) ON DELETE RESTRICT
--   9. Drop old UNIQUE(slug) on categorias; ADD UNIQUE(tenant_id, slug)
--  10. RLS tenant guard policies on all 14 tables
-- ============================================================

-- ============================================================
-- STEP 1 — Audit (informational, read-only)
-- ============================================================
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- STEP 2 — Create tenants table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  domain     TEXT        UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 3 — Insert first tenant placeholder
-- NOTE: Replace this UUID via env/config once you have the real tenant ID.
-- ============================================================
INSERT INTO public.tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant Principal')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 4 — ADD COLUMN tenant_id (nullable, defaulting to seed UUID)
-- ============================================================
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.promociones
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.cupones
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.movimientos_financieros
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.categorias_financieras
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.registros_cierre
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.materiales
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.catalog_styles
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.payment_config
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- STEP 5 — Backfill: ensure no NULLs remain
-- ============================================================
UPDATE public.productos            SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.pedidos_catalogo     SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.pedidos              SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.promociones          SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.cupones              SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.categorias           SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.movimientos_financieros   SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.categorias_financieras    SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.registros_cierre     SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.materiales           SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.cotizaciones         SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.catalog_styles       SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.notifications        SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.payment_config       SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- ============================================================
-- STEP 6 — DROP DEFAULT (column should be supplied explicitly going forward)
-- ============================================================
ALTER TABLE public.productos              ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.pedidos_catalogo       ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.pedidos                ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.promociones            ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.cupones                ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.categorias             ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.movimientos_financieros    ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.categorias_financieras     ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.registros_cierre       ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.materiales             ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.cotizaciones           ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.catalog_styles         ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.notifications          ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.payment_config         ALTER COLUMN tenant_id DROP DEFAULT;

-- ============================================================
-- STEP 7 — SET NOT NULL
-- ============================================================
ALTER TABLE public.productos              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.pedidos_catalogo       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.pedidos                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.promociones            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cupones                ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.categorias             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.movimientos_financieros    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.categorias_financieras     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.registros_cierre       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.materiales             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cotizaciones           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.catalog_styles         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.notifications          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payment_config         ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================
-- STEP 8 — ADD FOREIGN KEY → tenants(id) ON DELETE RESTRICT
-- ============================================================
ALTER TABLE public.productos
  ADD CONSTRAINT fk_productos_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.pedidos_catalogo
  ADD CONSTRAINT fk_pedidos_catalogo_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.pedidos
  ADD CONSTRAINT fk_pedidos_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.promociones
  ADD CONSTRAINT fk_promociones_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.cupones
  ADD CONSTRAINT fk_cupones_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.categorias
  ADD CONSTRAINT fk_categorias_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.movimientos_financieros
  ADD CONSTRAINT fk_movimientos_financieros_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.categorias_financieras
  ADD CONSTRAINT fk_categorias_financieras_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.registros_cierre
  ADD CONSTRAINT fk_registros_cierre_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.materiales
  ADD CONSTRAINT fk_materiales_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.cotizaciones
  ADD CONSTRAINT fk_cotizaciones_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.catalog_styles
  ADD CONSTRAINT fk_catalog_styles_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.payment_config
  ADD CONSTRAINT fk_payment_config_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- ============================================================
-- STEP 9 — categorias slug: drop old UNIQUE(slug), add UNIQUE(tenant_id, slug)
-- ============================================================
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_slug_key;
ALTER TABLE public.categorias ADD CONSTRAINT categorias_tenant_slug_unique UNIQUE (tenant_id, slug);

-- ============================================================
-- STEP 10 — RLS tenant guard policies
-- NOTE: These are SECONDARY guards. Primary access control (public reads,
--       admin writes) remains in existing policies.
--       current_setting('app.tenant_id', true) returns NULL if unset;
--       the cast to UUID will also return NULL, so the check is a no-op
--       for anonymous/service-role sessions that don't set the GUC.
--       For authenticated sessions, the app MUST set app.tenant_id.
-- ============================================================

-- productos
CREATE POLICY "tenant_guard_productos"
  ON public.productos FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- pedidos_catalogo
CREATE POLICY "tenant_guard_pedidos_catalogo"
  ON public.pedidos_catalogo FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- pedidos
CREATE POLICY "tenant_guard_pedidos"
  ON public.pedidos FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- promociones
CREATE POLICY "tenant_guard_promociones"
  ON public.promociones FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- cupones
CREATE POLICY "tenant_guard_cupones"
  ON public.cupones FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- categorias
CREATE POLICY "tenant_guard_categorias"
  ON public.categorias FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- movimientos_financieros
CREATE POLICY "tenant_guard_movimientos_financieros"
  ON public.movimientos_financieros FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- categorias_financieras
CREATE POLICY "tenant_guard_categorias_financieras"
  ON public.categorias_financieras FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- registros_cierre
CREATE POLICY "tenant_guard_registros_cierre"
  ON public.registros_cierre FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- materiales
CREATE POLICY "tenant_guard_materiales"
  ON public.materiales FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- cotizaciones
CREATE POLICY "tenant_guard_cotizaciones"
  ON public.cotizaciones FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- catalog_styles
CREATE POLICY "tenant_guard_catalog_styles"
  ON public.catalog_styles FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- notifications
CREATE POLICY "tenant_guard_notifications"
  ON public.notifications FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- payment_config
CREATE POLICY "tenant_guard_payment_config"
  ON public.payment_config FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );
