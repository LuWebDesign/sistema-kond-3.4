-- Add MercadoPago columns to pedidos_catalogo
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE pedidos_catalogo ADD COLUMN IF NOT EXISTS mp_payment_status TEXT DEFAULT 'none';
