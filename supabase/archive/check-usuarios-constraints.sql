-- Verificar constraints únicos en tabla usuarios (archivado)
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE
  tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
  AND tc.table_name = 'usuarios'
;

-- Fin de check-usuarios-constraints.sql (archivado)
