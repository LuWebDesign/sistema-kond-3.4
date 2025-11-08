# 🔍 Diagnóstico: 404 en Producción

## Problema identificado
La eliminación funciona en local pero en producción devuelve 404, lo que indica que el API route `/api/pedidos-catalogo/[id]` no está siendo desplegado correctamente.

## Causas posibles

### 1. Vercel no está construyendo desde `next-app/`
Si tu proyecto en Vercel apunta a la raíz pero el código Next.js está en `next-app/`, Vercel no encuentra los API routes.

**Solución A: Configurar Root Directory en Vercel Dashboard**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → General
3. Busca "Root Directory"
4. Cambia de `.` (raíz) a `next-app`
5. Guarda y redeploy

**Solución B: Usar vercel.json (ya implementado)**
Ya pusheamos un `vercel.json` que debe funcionar, pero solo si Vercel detecta framework Next.js.

### 2. Vercel no detecta Next.js como framework
Si Vercel piensa que es un sitio estático, no compila los API routes.

**Verificación:**
1. Ve a tu último deployment en Vercel
2. Busca en los logs: "Detected Next.js" o "Building Next.js"
3. Si NO aparece, Vercel no lo detectó

**Solución:**
En Project Settings → General:
- Framework Preset: debe decir "Next.js"
- Si dice "Other", cámbialo a Next.js manualmente

### 3. Build falló silenciosamente
A veces el build falla pero Vercel sirve una versión anterior.

**Verificación:**
1. Ve a Deployments
2. Abre el último
3. Ve a "Build Logs"
4. Busca errores en la fase de instalación o build

**Síntomas comunes:**
- `npm install` falla por dependencias
- `next build` falla por errores de TypeScript o imports
- Variables de entorno faltantes rompen el build

### 4. Dominio apunta a otro proyecto o branch
Raro pero posible: estás probando en un dominio que apunta a otro deployment.

**Verificación:**
1. Compara la URL que probás con la URL de Vercel
2. Si usás dominio custom, verifica que apunte al proyecto correcto

## 🛠️ Pasos de resolución en orden

### Paso 1: Verificar que API routes existen en el deployment
Abrí en producción: `https://TU_DOMINIO/api/check-env`

**Si ves JSON con datos de variables de entorno:**
✅ El API está desplegado → problema es otro (probablemente falta SUPABASE_SERVICE_ROLE_KEY)

**Si ves 404 HTML:**
❌ API routes NO están desplegados → seguir pasos 2-5

### Paso 2: Verificar Root Directory en Vercel
1. Vercel Dashboard → tu proyecto → Settings → General
2. Root Directory: debe ser `next-app` o `.` (raíz solo si moviste todo)
3. Si está vacío o en `.`, cámbialo a `next-app`
4. Save → Redeploy

### Paso 3: Verificar Framework Preset
En la misma página (Settings → General):
- Framework Preset: debe ser **Next.js**
- Build Command: debe ser `next build` (o vacío, auto-detecta)
- Output Directory: debe ser `.next` (o vacío)
- Install Command: debe ser `npm install` (o vacío)

Si algo está mal, corregilo y redeploy.

### Paso 4: Forzar rebuild completo
1. Ve a Deployments
2. En el último exitoso, click en **⋯ (tres puntos)** → **Redeploy**
3. **NO marques** "Use existing Build Cache" (queremos rebuild limpio)
4. Espera a que termine (2-3 min)

### Paso 5: Ver logs del build
1. Abre el deployment recién hecho
2. Ve a **Build Logs**
3. Busca estas líneas:
   ```
   Detected Next.js
   Installing dependencies...
   Building Next.js...
   Collecting page data...
   Finalizing page optimization...
   ```
4. Si alguna falla, copia el error completo

### Paso 6: Verificar variables de entorno
En Settings → Environment Variables, debe haber:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

Todas deben estar en **Production**, **Preview**, y **Development**.

## 🧪 Tests rápidos post-deploy

Una vez redesplegado:

**Test 1: API de diagnóstico**
```bash
curl https://TU_DOMINIO/api/check-env
```
Debe responder JSON, no 404.

**Test 2: API de eliminación (con ID ficticio)**
```bash
curl -X DELETE https://TU_DOMINIO/api/pedidos-catalogo/99999
```
Debe responder JSON (aunque sea error), no 404.

**Test 3: Página de pedidos catálogo**
```bash
curl https://TU_DOMINIO/pedidos-catalogo
```
Debe responder HTML de Next.js, no 404.

## 📊 Checklist final

- [ ] Root Directory configurado en Vercel
- [ ] Framework Preset = Next.js
- [ ] Variables de entorno configuradas
- [ ] Build exitoso sin errores
- [ ] `/api/check-env` responde JSON
- [ ] `/api/pedidos-catalogo/[id]` responde JSON (no 404)
- [ ] Eliminación funciona en producción

## 🆘 Si nada funciona

**Opción nuclear: Mover next-app a la raíz**

Si Vercel simplemente no quiere detectar el subdirectorio:

1. Mover todo de `next-app/*` a raíz del repo
2. Actualizar imports si hay referencias relativas
3. Redeploy

Puedo automatizar esto si lo necesitás. Solo avisame.

---

**Siguiente paso recomendado:** Verificar Root Directory en Vercel Dashboard y forzar redeploy limpio.
