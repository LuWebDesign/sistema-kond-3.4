-- ============================================
-- ACTUALIZAR TU USUARIO EXISTENTE A SUPER ADMIN
-- Usa este script si ya te logueaste con Google y tu usuario existe
-- ============================================

-- PASO 1: Confirma que tu usuario existe
SELECT id, email, username, rol FROM usuarios WHERE email = 'sergionhobj@gmail.com';

-- PASO 2: Actualiza tu usuario existente a Super Admin
UPDATE usuarios
SET
  rol = 'super_admin',
  username = 'superadmin',
  nombre = COALESCE(nombre, 'Super'),
  apellido = COALESCE(apellido, 'Admin'),
  updated_at = NOW()
WHERE email = 'sergionhobj@gmail.com';

-- PASO 3: Crear credenciales de admin en Supabase Auth
-- IMPORTANTE: Ejecuta esto SOLO UNA VEZ para crear el usuario admin en auth.users
-- Cambia 'tu_password_seguro' por una contraseña segura
-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   invited_at,
--   confirmation_token,
--   confirmation_sent_at,
--   recovery_token,
--   recovery_sent_at,
--   email_change_token_new,
--   email_change,
--   email_change_sent_at,
--   last_sign_in_at,
--   raw_app_meta_data,
--   raw_user_meta_data,
--   is_super_admin,
--   created_at,
--   updated_at,
--   phone,
--   phone_confirmed_at,
--   phone_change,
--   phone_change_token,
--   phone_change_sent_at,
--   email_change_token_current,
--   email_change_confirm_status,
--   banned_until,
--   reauthentication_token,
--   reauthentication_sent_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   (SELECT id FROM usuarios WHERE email = 'sergionhobj@gmail.com'),
--   'authenticated',
--   'authenticated',
--   'admin-superadmin@kond.local',
--   crypt('tu_password_seguro', gen_salt('bf')),
--   NOW(),
--   NULL,
--   '',
--   NULL,
--   '',
--   NULL,
--   '',
--   '',
--   NULL,
--   NULL,
--   '{"provider": "email", "providers": ["email"]}',
--   '{}',
--   FALSE,
--   NOW(),
--   NOW(),
--   NULL,
--   NULL,
--   '',
--   '',
--   NULL,
--   '',
--   0,
--   NULL,
--   '',
--   NULL
-- ) ON CONFLICT (email) DO NOTHING;

-- PASO 4: Verificar que se actualizó correctamente
SELECT id, email, username, rol FROM usuarios WHERE rol = 'super_admin';