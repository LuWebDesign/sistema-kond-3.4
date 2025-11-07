-- ============================================
-- CORRECCIÓN: Cambiar material_id de INTEGER a BIGINT
-- Para soportar timestamps usados como IDs en localStorage
-- ============================================

-- Cambiar el tipo de dato de material_id para soportar timestamps
ALTER TABLE productos 
  ALTER COLUMN material_id TYPE BIGINT;

-- Comentario actualizado
COMMENT ON COLUMN productos.material_id IS 'ID del material asociado (timestamp de localStorage)';
