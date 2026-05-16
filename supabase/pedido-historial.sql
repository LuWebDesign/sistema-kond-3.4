-- ============================================
-- TABLA: pedido_historial
-- Historial de eventos y notas de pedidos catálogo
-- Ejecutar después de schema.sql
-- ============================================

CREATE TABLE IF NOT EXISTS public.pedido_historial (
  id          BIGSERIAL PRIMARY KEY,
  pedido_id   BIGINT NOT NULL REFERENCES public.pedidos_catalogo(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  tipo        TEXT NOT NULL CHECK (tipo IN ('created','estado','pago','fecha','nota','calendario','guardado')),
  descripcion TEXT NOT NULL,
  autor       TEXT NOT NULL DEFAULT 'Admin',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedido_historial_pedido_id
  ON public.pedido_historial(pedido_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_historial_tenant_id
  ON public.pedido_historial(tenant_id);

-- RLS
ALTER TABLE public.pedido_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_guard_pedido_historial"
  ON public.pedido_historial FOR ALL
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );
