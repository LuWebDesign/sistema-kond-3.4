-- ============================================
-- Migration: Add tipo_trabajo to productos
-- New product type classification system
-- ============================================

-- 1. Add new column ( nullable initially )
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS tipo_trabajo TEXT;

-- 2. Migrate existing data
UPDATE public.productos SET tipo_trabajo = 
  CASE 
    WHEN tipo = 'Venta' THEN 'Corte Laser'
    WHEN tipo = 'Stock' THEN 'Grabado Laser'
    WHEN tipo = 'Presupuesto' THEN 'Corte CNC'
    ELSE NULL
  END
WHERE tipo_trabajo IS NULL;

-- 3. Set default for new products
ALTER TABLE public.productos 
ALTER COLUMN tipo_trabajo SET DEFAULT 'Corte Laser';

-- 4. Create index
CREATE INDEX IF NOT EXISTS idx_productos_tipo_trabajo ON public.productos(tipo_trabajo);