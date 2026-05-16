-- ============================================
-- MIGRACIÓN: Agregar campos de entrega y financieros a pedidos_catalogo
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Método de entrega separado del método de pago
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS metodo_entrega TEXT; -- 'envio' | 'retiro'

-- Cupón y descuento
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS cupon_codigo TEXT;

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS cupon_descuento NUMERIC DEFAULT 0;

-- Monto recibido (seña o pago total)
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC DEFAULT 0;

-- Envío gratis (aplicado por promo)
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS envio_gratis BOOLEAN DEFAULT false;

-- Fechas extendidas
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS fecha_confirmada_entrega DATE;

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS fecha_produccion DATE;

-- Índice para consultas por método de entrega
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_metodo_entrega
  ON public.pedidos_catalogo(metodo_entrega);
