-- ============================================
-- MIGRACIÓN: Limpiar costo_material (campo calculado)
-- ============================================

-- Limpiar todos los valores de costo_material
-- Ya no se guardará en la BD, se calculará en el frontend
UPDATE productos SET costo_material = NULL;

-- Agregar comentario explicativo
COMMENT ON COLUMN productos.costo_material IS 
  'DEPRECATED: Campo calculado en frontend como costo_placa / unidades_por_placa. No se debe guardar aquí.';

-- Nota: Mantener la columna por ahora por compatibilidad, pero siempre debe estar en NULL
-- Si en el futuro quieres eliminarla completamente, ejecuta:
-- ALTER TABLE productos DROP COLUMN costo_material;
