-- Migration: add cupon_tipo and cupon_valor to pedidos_catalogo
-- Run in Supabase Dashboard > SQL Editor

ALTER TABLE pedidos_catalogo
  ADD COLUMN IF NOT EXISTS cupon_tipo TEXT,
  ADD COLUMN IF NOT EXISTS cupon_valor NUMERIC;

-- cupon_tipo: 'porcentaje' | 'monto_fijo'
-- cupon_valor: raw configured value (e.g. 15 for 15%, or 500 for $500 off)
-- cupon_descuento: calculated discount amount (already exists)
