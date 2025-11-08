-- Migration: add-usuarios-profile-fields.sql
-- Fecha: 2025-11-08
-- Objetivo: Agregar columnas de perfil a la tabla `usuarios` para sincronizar datos de auth.users
-- Uso: Ejecutar en Supabasesucces SQL Editor (o mediante supabase CLI). El script usa IF NOT EXISTS para ser idempotente.

BEGIN;

-- Campos de perfil básicos
ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS apellido text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Índice único (parcial) para email cuando no es NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_unique
  ON public.usuarios(email)
  WHERE email IS NOT NULL;

-- Índice para rol (consultas de administración)
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);

-- Comentarios (documentación en BD)
COMMENT ON COLUMN public.usuarios.email IS 'Email del usuario (sin duplicados).';
COMMENT ON COLUMN public.usuarios.nombre IS 'Nombre de pila del usuario.';
COMMENT ON COLUMN public.usuarios.apellido IS 'Apellido del usuario.';
COMMENT ON COLUMN public.usuarios.telefono IS 'Teléfono de contacto (opcional).';
COMMENT ON COLUMN public.usuarios.direccion IS 'Dirección postal (opcional).';
COMMENT ON COLUMN public.usuarios.localidad IS 'Localidad/ciudad.';
COMMENT ON COLUMN public.usuarios.provincia IS 'Provincia/estado.';
COMMENT ON COLUMN public.usuarios.metadata IS 'Campo jsonb para metadatos adicionales sincronizados desde auth.users.user_metadata.';

COMMIT;

-- Nota: Si tu proyecto usa un esquema distinto a `public`, adapta las referencias a schema.
