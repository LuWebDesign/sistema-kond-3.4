-- MIGRACIÓN: Agregar campo producto_imagen a pedidos_catalogo_items (archivado)

ALTER TABLE pedidos_catalogo_items 
  ADD COLUMN IF NOT EXISTS producto_imagen TEXT;

-- Fin de add-producto-imagen-field.sql (archivado)
