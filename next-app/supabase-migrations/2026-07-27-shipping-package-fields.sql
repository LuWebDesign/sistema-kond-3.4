-- Migration: shipping package fields and provider-neutral order shipping columns
-- Date: 2026-07-27

-- Product package data used for shipping quotes. These fields are intentionally
-- separate from customer-facing `medidas`.
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS package_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS package_length_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS package_width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS package_height_cm NUMERIC;

-- Provider-neutral order shipping snapshot and admin follow-up state.
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
  ADD COLUMN IF NOT EXISTS shipping_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_manual_followup_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS shipping_tracking_number TEXT;

CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_shipping_status ON public.pedidos_catalogo(shipping_status);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_shipping_import_status ON public.pedidos_catalogo(shipping_import_status);
