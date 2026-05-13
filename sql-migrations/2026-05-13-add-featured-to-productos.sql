-- Migration: Add featured column to productos
-- Date: 2026-05-13

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productos_featured
  ON public.productos(featured)
  WHERE featured = true;
