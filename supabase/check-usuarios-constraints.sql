-- Verificar constraints únicos en tabla usuarios
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE
  tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
  AND tc.table_name = 'usuarios'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- También verificar índices únicos
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'usuarios'
  AND indexdef LIKE '%UNIQUE%';

-- Verificar si existe constraint en email específicamente
SELECT conname, conkey, confkey, conrelid::regclass
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass
  AND conname LIKE '%email%';

-- Verificar estructura de la tabla
\d usuarios