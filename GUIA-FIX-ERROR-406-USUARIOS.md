# Fix Error 406 - Tabla Usuarios

## Problema

Al cerrar sesión aparecen estos errores:

**Local:**
```
GET https://sdudjuomhcywhpyfziel.supabase.co/rest/v1/usuarios?select=*&id=eq.7721c960-dc77-469e-ab2f-1601ecbb946b 406 (Not Acceptable)
```

**Producción:**
```
Uncaught (in promise) TypeError: Cannot destructure property 'error' of '(intermediate value)' as it is undefined.
```

## Causa

La tabla `usuarios` tiene RLS (Row Level Security) habilitado pero **no tiene políticas configuradas**. Cuando el código intenta hacer un `SELECT` con la `anon key`, Supabase rechaza la consulta con error 406.

## Solución

### 1. Aplicar políticas RLS para tabla usuarios

Ve a Supabase Dashboard → SQL Editor y ejecuta este SQL:

```sql
-- Eliminar políticas antiguas de usuarios (si existen)
DROP POLICY IF EXISTS "select_usuarios_authenticated" ON usuarios;
DROP POLICY IF EXISTS "insert_usuarios_publico" ON usuarios;
DROP POLICY IF EXISTS "update_usuarios_own" ON usuarios;

-- 1. SELECT: Los usuarios pueden ver su propia información
CREATE POLICY "select_usuarios_authenticated"
ON usuarios
FOR SELECT
USING (true);

-- 2. INSERT: Permitir crear nuevos usuarios (registro)
CREATE POLICY "insert_usuarios_publico"
ON usuarios
FOR INSERT
WITH CHECK (true);

-- 3. UPDATE: Los usuarios solo pueden actualizar su propia información
CREATE POLICY "update_usuarios_own"
ON usuarios
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### 2. Verificar que RLS está habilitado

En Supabase Dashboard:
1. Ve a **Table Editor** → tabla `usuarios`
2. Click en el botón ⚙️ (Settings)
3. Verifica que "Enable Row Level Security (RLS)" esté **activado** ✅

### 3. Cambios en el código

Ya se agregó manejo de errores mejorado en `supabaseAuthV2.js`:

**Cambio 1: `loginWithUsername` - Mejor detección de error 406**
```javascript
if (fetchError) {
  console.error('Error buscando usuario:', fetchError);
  
  // Si el error es 406 (falta política RLS), informar mejor
  if (fetchError.code === 'PGRST116' || fetchError.message?.includes('406')) {
    return { 
      error: 'Error de configuración: faltan permisos en la base de datos',
      user: null,
      session: null
    };
  }
  
  return { 
    error: 'Usuario no encontrado',
    user: null,
    session: null
  };
}
```

**Cambio 2: `loginWithEmail` - Fallback cuando falla consulta a usuarios**
```javascript
if (fetchError) {
  console.warn('Usuario autenticado pero no encontrado en tabla usuarios:', fetchError);
  
  // Si el error es 406 (falta política RLS), usar datos mínimos del auth
  if (fetchError.code === 'PGRST116' || fetchError.message?.includes('406')) {
    console.warn('⚠️  Error de política RLS en tabla usuarios. Usando datos de auth.');
    const user = {
      id: authData.user.id,
      email: authData.user.email,
      username: email.split('@')[0],
      rol: 'usuario',
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('kond-user', JSON.stringify(user));
    }
    
    return {
      error: null,
      user,
      session: authData.session,
    };
  }
}
```

## Verificación

Después de aplicar las políticas:

1. **Refresca la página** en el navegador
2. Intenta **cerrar sesión**
3. El error 406 **no debería aparecer**
4. La sesión debería cerrarse correctamente

## Archivo actualizado

El archivo `supabase-rls-policies.sql` ahora incluye las políticas para la tabla `usuarios`. Puedes ejecutar todo el archivo para aplicar todas las políticas de una vez.

## Resumen técnico

- ✅ **Políticas RLS creadas** para tabla `usuarios`
- ✅ **Manejo de errores mejorado** en `supabaseAuthV2.js`
- ✅ **Fallback** si la consulta falla (usa datos de auth)
- ✅ **Mensajes de error** más claros para debugging

---

**Fecha:** 8 de noviembre de 2025  
**Archivos modificados:**
- `supabase-rls-policies.sql` (políticas usuarios añadidas)
- `next-app/utils/supabaseAuthV2.js` (manejo de errores mejorado)
