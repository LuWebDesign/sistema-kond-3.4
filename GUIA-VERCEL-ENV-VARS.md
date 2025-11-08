# 🔧 Configurar Variables de Entorno en Vercel

## Problema
La eliminación de pedidos funciona en local pero **NO en producción** porque falta `SUPABASE_SERVICE_ROLE_KEY` en Vercel.

## ✅ Solución paso a paso

### 1. Obtener tu Service Role Key de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **Project API keys**, copia la clave **`service_role`** (⚠️ NO la `anon` key)
5. **IMPORTANTE**: Esta clave es secreta, nunca la compartas públicamente

### 2. Configurar en Vercel

#### Opción A: Desde el Dashboard de Vercel (recomendado)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **sistema-kond-3.4**
3. Ve a **Settings** → **Environment Variables**
4. Haz clic en **Add New**
5. Configura:
   ```
   Name: SUPABASE_SERVICE_ROLE_KEY
   Value: [pega aquí tu service_role key de Supabase]
   Environment: Production, Preview, Development (selecciona todos)
   ```
6. Haz clic en **Save**

#### Opción B: Desde la terminal (CLI de Vercel)

```bash
# Si tienes Vercel CLI instalado
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Te preguntará por el valor, pega tu service_role key
# Selecciona todos los entornos (Production, Preview, Development)
```

### 3. Verificar variables existentes

Asegúrate de que también estén configuradas:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY  ← Esta es la que falta
```

### 4. Redesplegar la aplicación

Después de agregar la variable de entorno:

#### Opción A: Redeploy desde Vercel Dashboard
1. Ve a **Deployments**
2. En el último deployment exitoso, haz clic en los **tres puntos (...)** → **Redeploy**
3. Asegúrate de marcar **"Use existing Build Cache"** si quieres que sea más rápido

#### Opción B: Hacer un nuevo push (fuerza redeploy)
```bash
git commit --allow-empty -m "chore: redeploy para aplicar variables de entorno"
git push origin main
```

### 5. Verificar que funciona

1. Espera a que termine el deployment (1-2 minutos)
2. Ve a tu sitio en producción
3. Abre la página de pedidos catálogo
4. Elimina un pedido
5. Refresca la página
6. **Verifica que NO reaparezca** ✅

### 6. Verificar logs (si algo falla)

En Vercel Dashboard:
1. Ve a **Deployments** → [último deployment]
2. Haz clic en **Functions**
3. Busca los logs de `/api/pedidos-catalogo/[id]`
4. Revisa si hay errores como:
   - `"Faltan variables de entorno de Supabase"` → La variable no se configuró
   - Error 401/403 → La service_role key es incorrecta
   - Error 500 → Problema de permisos o configuración

---

## 🔒 Seguridad

⚠️ **NUNCA** commits la `SUPABASE_SERVICE_ROLE_KEY` en el código
✅ Solo debe estar en variables de entorno de Vercel
✅ El archivo `.env.local` debe estar en `.gitignore`

---

## 📊 Estado actual

- ✅ Código correcto (API route creado)
- ✅ Funciona en local
- ⏳ Falta configurar variable en Vercel
- ⏳ Falta redesplegar

---

## ❓ Preguntas frecuentes

**P: ¿Por qué necesito la service_role key?**  
R: Las operaciones de eliminación están bloqueadas por RLS (Row Level Security) en Supabase. La service_role key bypasea estas restricciones para operaciones administrativas.

**P: ¿Es seguro usar service_role en producción?**  
R: Sí, siempre que esté en el servidor (API routes de Next.js) y nunca expuesta al cliente. Nuestro código usa `process.env.SUPABASE_SERVICE_ROLE_KEY` que solo existe en el servidor.

**P: ¿Cuánto tarda el redeploy?**  
R: Típicamente 1-2 minutos si ya tienes build cache.

---

**¿Necesitas ayuda para encontrar tu service_role key en Supabase?** Avísame y te guío paso a paso.
