-- Fix: reemplazar dominio del proyecto Supabase viejo en imagenes_urls (archivado)

UPDATE public.productos
SET imagenes_urls = ARRAY(
  SELECT REPLACE(
    url,
    'https://sdudjuomhcywhpyfziel.supabase.co',
    'https://sfeiabutwxyazfpdqxja.supabase.co'
  )
  FROM UNNEST(imagenes_urls) AS url
)
WHERE imagenes_urls IS NOT NULL
  AND cardinality(imagenes_urls) > 0
  AND imagenes_urls::text LIKE '%sdudjuomhcywhpyfziel%';

-- Fin de 20260310000003_fix_imagenes_urls_domain.sql (archivado)
