# 🔐 Solución: Acceso Denegado en Página Calendario

## 🔍 Problema Identificado

Al acceder a `/calendar`, aparece el mensaje:
```
Acceso Denegado
Esta página es exclusiva para administradores del sistema.
Serás redirigido automáticamente en unos segundos...
```

## 🎯 Causa Raíz

La página de calendario usa la función `isAdminLogged()` para verificar permisos de administrador. Esta función verifica la estructura de `adminSession` en localStorage, pero **cambiamos la estructura** cuando migramos el login de `/home` a Supabase Auth.

### Estructura Antigua (hardcoded):
```javascript
{
  email: "admin1",
  timestamp: 1234567890,
  isLoggedIn: true,
  sessionDuration: 86400000
  // ❌ NO tenía campo "rol"
}
```

### Estructura Nueva (Supabase Auth):
```javascript
{
  email: "admin@kond.local",
  username: "admin",
  rol: "admin",              // ✅ NUEVO campo
  timestamp: 1234567890,
  isLoggedIn: true,
  rememberSession: false,
  sessionDuration: 86400000
}
```

## ✅ Solución Implementada

Actualicé la función `isAdminLogged()` en `utils/catalogUtils.js` para soportar **ambas estructuras**:

1. ✅ Verifica `adminSession.user.rol === 'admin'` (estructura muy antigua)
2. ✅ Verifica `adminSession.rol === 'admin'` (estructura nueva de Supabase)
3. ✅ Verifica `adminSession.email || adminSession.username` (compatibilidad legacy)
4. ✅ Verifica `kond-user` en localStorage (guardado por supabaseAuthV2)

## 🚀 Pasos para Resolver

### Opción 1: Volver a Iniciar Sesión (Recomendado)

1. Cierra sesión si estás logueado
2. Ve a https://sistema-kond-3-4-ntv9.vercel.app/home (o localhost si es local)
3. Inicia sesión con:
   - **Email:** `admin@kond.local`
   - **Password:** `KondAdmin!2025`
4. La nueva sesión se guardará con la estructura correcta
5. Ahora podrás acceder a `/calendar` sin problemas

### Opción 2: Limpiar localStorage Manualmente

Si no quieres cerrar sesión:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Ejecuta:
   ```javascript
   // Obtener sesión actual
   let session = JSON.parse(localStorage.getItem('adminSession'));
   // Agregar campo rol
   session.rol = 'admin';
   // Guardar actualizada
   localStorage.setItem('adminSession', JSON.stringify(session));
   // Recargar página
   location.reload();
   ```
4. Recarga la página de calendario

### Opción 3: En Localhost (Desarrollo)

Si estás en desarrollo local:

1. Ve a DevTools → Application → Local Storage
2. Encuentra la key `adminSession`
3. Edita el valor JSON y agrega: `"rol": "admin",`
4. Guarda y recarga la página

## 🔄 Estado Actual

- ✅ Commit realizado: `bc8c116`
- ✅ Push a GitHub completado
- ⏳ Vercel redespliegará automáticamente (1-2 minutos)
- ⏳ Necesitas configurar variables de entorno en Vercel (ver VERIFICAR-ENV-VERCEL.md)

## 📋 Verificación Post-Fix

Después de volver a iniciar sesión, verifica que `localStorage` tenga la estructura correcta:

```javascript
// En la consola del navegador
JSON.parse(localStorage.getItem('adminSession'))
```

Deberías ver algo como:
```json
{
  "email": "admin@kond.local",
  "username": "admin",
  "rol": "admin",          // ✅ Este campo debe existir
  "timestamp": 1730991234567,
  "isLoggedIn": true,
  "rememberSession": false,
  "sessionDuration": 86400000
}
```

## 🎯 Resumen

**El problema ocurre porque:**
- Migramos el login a Supabase Auth
- La estructura de sesión cambió
- Tu sesión actual tiene la estructura antigua

**Para solucionarlo:**
- Vuelve a iniciar sesión con las credenciales nuevas
- Esto creará una sesión con la estructura correcta
- El calendario detectará correctamente que eres admin

---

**Última actualización:** 2025-11-07  
**Versión:** 1.0  
**Commit relacionado:** bc8c116
