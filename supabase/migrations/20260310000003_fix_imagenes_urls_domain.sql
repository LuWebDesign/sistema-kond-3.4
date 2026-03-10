-- Fix: reemplazar dominio del proyecto Supabase viejo en imagenes_urls
-- El proyecto fue migrado de sdudjuomhcywhpyfziel (Ohio) a sfeiabutwxyazfpdqxja (São Paulo)
-- Los archivos ya existen en el nuevo bucket; solo hay que actualizar las URLs en la DB.

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
