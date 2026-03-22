-- ============================================
-- MIGRACIÓN: Agregar pedido_catalogo_id a movimientos_financieros
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Agregar columna de referencia al pedido de catálogo
ALTER TABLE movimientos_financieros
  ADD COLUMN IF NOT EXISTS pedido_catalogo_id BIGINT REFERENCES pedidos_catalogo(id) ON DELETE SET NULL;

-- Índice para búsqueda por pedido
CREATE INDEX IF NOT EXISTS idx_movimientos_pedido_catalogo_id
  ON movimientos_financieros(pedido_catalogo_id);
