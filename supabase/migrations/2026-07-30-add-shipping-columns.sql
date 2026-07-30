-- Migration: Add shipping, entrega, cupón, y applied_promotions columns
-- Consolidates all standalone SQL files into one idempotent migration.
-- Run in Supabase Dashboard -> SQL Editor.
-- All ADD COLUMN use IF NOT EXISTS — safe to run multiple times.

-- ============================================
-- 1. Shipping columns (from schema.sql — missing in existing tables)
-- ============================================
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS shipping_provider TEXT,
  ADD COLUMN IF NOT EXISTS shipping_delivery_type TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS shipping_currency TEXT,
  ADD COLUMN IF NOT EXISTS shipping_quote_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS shipping_destination_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS shipping_agency_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS shipping_status TEXT,
  ADD COLUMN IF NOT EXISTS shipping_import_status TEXT,
  ADD COLUMN IF NOT EXISTS shipping_import_result JSONB,
  ADD COLUMN IF NOT EXISTS shipping_imported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS shipping_manual_followup_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS shipping_tracking_number TEXT;

-- ============================================
-- 2. Entrega and financial fields
-- ============================================
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS metodo_entrega TEXT; -- 'envio' | 'retiro'

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC DEFAULT 0;

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS envio_gratis BOOLEAN DEFAULT false;

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS fecha_confirmada_entrega DATE;

ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS fecha_produccion DATE;

CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_metodo_entrega
  ON public.pedidos_catalogo(metodo_entrega);

-- ============================================
-- 3. Cupón tipo/valor
-- ============================================
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS cupon_tipo TEXT,
  ADD COLUMN IF NOT EXISTS cupon_valor NUMERIC;

-- cupon_tipo: 'porcentaje' | 'monto_fijo'
-- cupon_valor: raw configured value (e.g. 15 for 15%, or 500 for $500 off)
-- cupon_descuento: calculated discount amount (already exists in schema)

-- ============================================
-- 4. Applied promotions
-- ============================================
ALTER TABLE public.pedidos_catalogo
  ADD COLUMN IF NOT EXISTS applied_promotions JSONB DEFAULT '[]'::jsonb;

-- Stores an array of promotion objects applied at order time:
-- [
--   { "type": "percentage_discount", "name": "Summer Sale", "value": 15, "discount_amount": 1200 },
--   { "type": "transfer_discount", "value": 10, "discount_amount": 500 },
--   { "type": "free_shipping", "name": "Envío gratis +$5000" }
-- ]
