-- MIGRACIÓN: Agregar pedido_catalogo_id a movimientos_financieros (archivado)

ALTER TABLE movimientos_financieros
  ADD COLUMN IF NOT EXISTS pedido_catalogo_id BIGINT REFERENCES pedidos_catalogo(id) ON DELETE SET NULL;

-- Fin de add-pedido-catalogo-id-to-movimientos.sql (archivado)
