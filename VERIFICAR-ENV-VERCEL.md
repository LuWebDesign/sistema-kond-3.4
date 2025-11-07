# 🔧 Verificar y Configurar Variables de Entorno en Vercel

## Problema Identificado

El login estaba fallando porque:
1. ✅ **RESUELTO:** La página `/home` usaba credenciales hardcodeadas antiguas (`admin1` / `kond`)
2. ⚠️ **PENDIENTE:** Las variables de entorno pueden no estar configuradas en Vercel

## Cambio Realizado

Actualicé `pages/home.js` para usar autenticación Supabase:
- Ahora usa `loginWithEmail()` de `supabaseAuthV2.js`
- Verifica sesión activa de Supabase en `useEffect`
- Mantiene compatibilidad con localStorage para código legacy

## 📋 Pasos para Configurar Variables en Vercel

### 1. Acceder al Dashboard de Vercel

1. Ve a https://vercel.com
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto: **sistema-kond-3-4**

### 2. Configurar Variables de Entorno

1. En el menú lateral, haz clic en **Settings**
2. En el menú de la izquierda, selecciona **Environment Variables**
3. Agrega las siguientes variables (una por una):

#### Variables Requeridas:

| Nombre | Valor | Entorno |
|--------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sdudjuomhcywhpyfziel.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(copiar de .env.local)* | Production, Preview, Development |

**⚠️ IMPORTANTE:** 
- **NO** agregues `SUPABASE_SERVICE_ROLE_KEY` a Vercel (es solo para uso local)
- Asegúrate de seleccionar **todos los entornos** (Production, Preview, Development)

### 3. Encontrar tus Keys de Supabase

Si no tienes acceso a `.env.local`, puedes obtener las keys desde Supabase:

1. Ve a https://supabase.com/dashboard
2. Selecciona el proyecto: **sdudjuomhcywhpyfziel**
3. En el menú lateral, ve a **Settings** → **API**
4. Copia:
   - **Project URL** → Variable `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Redesplegar el Sitio

Después de agregar las variables de entorno:

1. Ve a la pestaña **Deployments**
2. Busca el último deployment
3. Haz clic en el botón de tres puntos (⋮) a la derecha
4. Selecciona **Redeploy**
5. **NO** marques "Use existing Build Cache" (queremos un build limpio)
6. Confirma el redespliegue

### 5. Verificar el Login

Una vez completado el redespliegue:

1. Ve a https://sistema-kond-3-4-ntv9.vercel.app/home
2. Usa las credenciales:
   - **Email:** `admin@kond.local`
   - **Password:** `KondAdmin!2025`
3. Deberías poder iniciar sesión exitosamente

## 🧪 Prueba Local (Opcional)

Si quieres probar localmente antes de desplegar:

```powershell
cd "c:\Users\Noxi-PC\Desktop\Sistema KOND 3.4\next-app"
npm run dev
```

Luego abre http://localhost:3000/home y prueba el login.

## ❌ Problemas Comunes

### Error: "Invalid API key"
- Verifica que copiaste correctamente la `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Asegúrate de que no tiene espacios al inicio o final

### Error: "Network error"
- Verifica que la URL de Supabase sea correcta (debe terminar en `.supabase.co`)
- Revisa que no haya errores de CORS en la consola del navegador

### Login sigue fallando
- Abre la consola del navegador (F12) y busca errores en la pestaña "Console"
- Verifica que el email sea exactamente `admin@kond.local` (sin espacios)
- Verifica que la contraseña sea exactamente `KondAdmin!2025`

## 📝 Checklist

- [ ] Accedí al Dashboard de Vercel
- [ ] Agregué `NEXT_PUBLIC_SUPABASE_URL` en Environment Variables
- [ ] Agregué `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Environment Variables
- [ ] Seleccioné todos los entornos (Production, Preview, Development)
- [ ] Redespleguié el sitio sin usar cache
- [ ] Probé el login con `admin@kond.local` / `KondAdmin!2025`

## 🎯 Resultado Esperado

Después de completar estos pasos:
- ✅ El login debe funcionar en https://sistema-kond-3-4-ntv9.vercel.app/home
- ✅ Deberías ser redirigido a `/dashboard` después de iniciar sesión
- ✅ La sesión se mantiene activa (no necesitas volver a iniciar sesión al recargar)

---

**Última actualización:** 2025-11-07  
**Versión:** 1.0
