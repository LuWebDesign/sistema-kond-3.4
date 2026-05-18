-- Migration: Add featured column to productos
-- Date: 2026-05-18
-- Purpose: Support featured products on the home page storefront.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_productos_featured
  ON public.productos(featured) WHERE featured = true;

COMMENT ON COLUMN public.productos.featured IS
  'Whether this product appears in the featured/hero section of the storefront home page.';
