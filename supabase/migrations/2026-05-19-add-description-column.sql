-- Migration: Add description column to productos
-- Date: 2026-05-19
-- Purpose: Support Markdown-rich product descriptions.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS description TEXT;
