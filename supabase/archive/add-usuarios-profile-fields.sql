-- Migration: add-usuarios-profile-fields.sql (archivado)
-- Objetivo: Agregar columnas de perfil a la tabla `usuarios`

BEGIN;

ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS email text;

COMMIT;

-- Fin de add-usuarios-profile-fields.sql (archivado)
