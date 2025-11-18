-- PASO 1: Encuentra tu ID en auth.users (donde Google OAuth guarda los usuarios)
SELECT id, email, created_at FROM auth.users WHERE email = 'tu-email@gmail.com';

-- PASO 2: Verifica si ya existe en la tabla usuarios
SELECT id, email, username, rol FROM usuarios WHERE email = 'tu-email@gmail.com';

-- Si aparece en ambas tablas, entonces ya puedes proceder al PASO 3