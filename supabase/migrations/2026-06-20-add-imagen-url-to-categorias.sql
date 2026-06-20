-- Migration: 2026-06-20 — Add imagen_url to categorias
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS imagen_url TEXT DEFAULT NULL;
