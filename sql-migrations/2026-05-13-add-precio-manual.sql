-- Migration: agregar columna precio_manual a productos
-- Indica si el precio_unitario fue fijado manualmente por el admin.
-- false (default) = precio calculado automáticamente: costo_material * (1 + margen_material / 100)
-- true            = precio fijo por el admin; cuando cambia el costo del material, se recalcula
--                  el margen para mantener el precio: margen = ((precio / costo_material) - 1) * 100

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_manual BOOLEAN NOT NULL DEFAULT false;
