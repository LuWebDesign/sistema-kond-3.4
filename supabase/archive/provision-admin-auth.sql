-- ============================================
-- Provisionar usuario admin en Supabase Auth (archivado)
-- ============================================

-- 1. Obtener el UUID del usuario admin existente en la tabla usuarios
-- (Debes ejecutar esto primero para ver el UUID)
SELECT id, username, rol FROM usuarios WHERE username = 'admin';

-- 2. Crear el usuario en auth.users con ese mismo UUID
-- REEMPLAZA 'TU-UUID-AQUI' con el UUID que obtuviste en el paso 1
-- REEMPLAZA 'tu-email@ejemplo.com' con un email real para el admin
-- REEMPLAZA 'tu-password-seguro' con la contraseña que quieras usar

-- EJEMPLO (NO EJECUTAR TAL CUAL):
/*
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  email_change_token_current,
  email_change_token_new
) VALUES (
  'TU-UUID-AQUI'::uuid, -- Mismo UUID de la tabla usuarios
  '00000000-0000-0000-0000-000000000000',
  'admin@kond.local', -- Email para login
  crypt('tu-password-seguro', gen_salt('bf')), -- Contraseña encriptada
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  ''
);
*/

-- Fin de provision-admin-auth.sql (archivado)
