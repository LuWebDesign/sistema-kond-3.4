-- MIGRACIÓN: Agregar campos faltantes a productos (archivado)

ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS material_id INTEGER;

-- Fin de add-productos-fields.sql (archivado)
