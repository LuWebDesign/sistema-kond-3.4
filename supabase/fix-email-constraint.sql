-- Script para verificar constraints únicos en tabla usuarios
-- Ejecuta esto en Supabase SQL Editor

-- Ver todos los constraints de la tabla usuarios
SELECT
  conname as constraint_name,
  contype as constraint_type,
  conkey as constraint_keys,
  confkey as foreign_keys
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass;

-- Ver índices únicos específicamente
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'usuarios'
AND indexdef LIKE '%UNIQUE%';

-- Ver si existe constraint único en email
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'usuarios'
  AND tc.constraint_type = 'UNIQUE'
  AND kcu.column_name = 'email';

-- Si no hay constraint único en email, crearlo
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_unique UNIQUE (email);