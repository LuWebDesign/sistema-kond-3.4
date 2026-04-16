-- MIGRACIÓN: Agregar campo stock a productos (archivado)

ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Fin de add-stock-field.sql (archivado)
