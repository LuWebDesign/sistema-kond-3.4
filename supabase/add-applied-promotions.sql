-- Migration: add applied_promotions JSONB to pedidos_catalogo
-- Run in Supabase Dashboard > SQL Editor

ALTER TABLE pedidos_catalogo
  ADD COLUMN IF NOT EXISTS applied_promotions JSONB DEFAULT '[]'::jsonb;

-- Stores an array of promotion objects applied at order time:
-- [
--   { "type": "percentage_discount", "name": "Summer Sale", "value": 15, "discount_amount": 1200 },
--   { "type": "transfer_discount", "value": 10, "discount_amount": 500 },
--   { "type": "free_shipping", "name": "Envío gratis +$5000" }
-- ]
