# Configuración de Administradores

## Sistema de Autenticación Separada

Los administradores ahora tienen un sistema de login completamente separado del flujo de Google OAuth usado por los usuarios compradores.

### Para Usuarios Compradores (Catálogo)
- Usan Google OAuth para acceder al catálogo
- Se autentican con sus cuentas de Gmail
- Flujo: `/catalog` → Google OAuth → Catálogo

### Para Administradores (Panel Admin)
- Usan credenciales específicas separadas
- No usan Google OAuth
- Flujo: `/admin/login` → Username/Password → Dashboard Admin

## Configuración de Credenciales de Admin

### Paso 1: Actualizar Rol en Base de Datos
Ejecuta el script `supabase/create-super-admin.sql` en Supabase SQL Editor para asignar el rol de super admin.

### Paso 2: Crear Credenciales en Supabase Auth
Ejecuta el script `supabase/create-admin-auth.sql` en Supabase SQL Editor.

**IMPORTANTE:** Antes de ejecutar, cambia `'tu_password_seguro_aqui'` por una contraseña REAL y segura.

```sql
-- Ejemplo para superadmin:
crypt('MiContraseñaSuperSegura123!', gen_salt('bf'))
```

### Paso 3: Credenciales de Login
Una vez creadas las credenciales, los admins pueden loguearse con:
- **Username:** `superadmin` (o el username definido en la tabla usuarios)
- **Password:** La contraseña que configuraste en el script SQL

## Archivos Modificados

- `utils/supabaseAuthV2.js`: Agregada función `loginAdmin()` y `logoutAdmin()`
- `utils/permissions.js`: Actualizado hook `usePermissions()` para detectar admin
- `pages/admin/login.js`: Cambiado para usar `loginAdmin()`
- `pages/admin/dashboard.js`: Cambiado para usar `logoutAdmin()`
- `supabase/create-admin-auth.sql`: Script para crear credenciales de admin

## Seguridad

- Los admins tienen emails especiales: `admin-{username}@kond.local`
- Las contraseñas están encriptadas con bcrypt
- El sistema está completamente separado del flujo de usuarios compradores
- Los tokens de sesión son independientes

## Testing

1. Verifica que los usuarios compradores aún puedan loguearse con Google OAuth
2. Verifica que los admins puedan loguearse con username/password en `/admin/login`
3. Verifica que los admins sean redirigidos correctamente al dashboard
4. Verifica que el logout funcione correctamente