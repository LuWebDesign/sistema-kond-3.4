-- ============================================
-- CREAR CREDENCIALES DE ADMIN EN SUPABASE AUTH
-- Ejecuta esto DESPUÉS de haber actualizado el rol del usuario a admin/super_admin
-- ============================================

-- PASO 1: Verificar que el usuario tiene rol admin
SELECT id, email, username, rol FROM usuarios WHERE rol IN ('admin', 'super_admin');

-- PASO 2: Crear usuario en auth.users para cada admin
-- IMPORTANTE: Cambia 'tu_password_seguro' por una contraseña REAL y segura
-- Ejecuta UNA VEZ por cada admin, cambiando el email y username según corresponda

-- Para superadmin (sergionhobj@gmail.com):
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM usuarios WHERE email = 'sergionhobj@gmail.com'),
  'authenticated',
  'authenticated',
  'admin-superadmin@kond.local',
  crypt('tu_password_seguro_aqui', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"admin_username": "superadmin"}',
  FALSE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Para otros admins, repite el INSERT cambiando:
-- - email: 'sergionhobj@gmail.com' por el email real del admin
-- - 'admin-superadmin@kond.local' por 'admin-{username}@kond.local'
-- - 'superadmin' por el username real
-- - contraseña en crypt('tu_password_seguro_aqui', gen_salt('bf'))

-- PASO 3: Verificar que se creó correctamente
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email LIKE 'admin-%@kond.local';