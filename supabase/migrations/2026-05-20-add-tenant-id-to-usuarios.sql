-- ============================================
-- Add tenant_id to usuarios table
-- Apply after: 2026-05-19-add-description-column.sql
-- ============================================

-- 1. Add column (nullable so existing rows don't break)
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- 2. Backfill existing rows with the first (and currently only) tenant
UPDATE public.usuarios
  SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1)
  WHERE tenant_id IS NULL;

-- 3. Enforce NOT NULL now that all rows are populated
ALTER TABLE public.usuarios
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_id ON public.usuarios(tenant_id);
