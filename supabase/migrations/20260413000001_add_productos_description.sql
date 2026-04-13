-- 2026-04-13: Añadir columna description a la tabla productos

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.productos.description IS 'Descripción del producto (texto libre)';
