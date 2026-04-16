-- Script para verificar constraints únicos en tabla usuarios (archivado)

-- Ver todos los constraints de la tabla usuarios
SELECT
  conname as constraint_name,
  contype as constraint_type,
  conkey as constraint_keys,
  confkey as foreign_keys
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass;

-- Fin de fix-email-constraint.sql (archivado)
