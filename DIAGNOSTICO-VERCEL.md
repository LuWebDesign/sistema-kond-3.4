# Diagnóstico: Promociones no aparecen en carrito en Vercel

## Problema
- ✅ En local (localhost:3000): funciona correctamente
- ❌ En producción (Vercel): no aparecen los descuentos en el carrito

## Checklist de diagnóstico

### 1. Verificar que Vercel desplegó la última versión
- [ ] Ir a dashboard de Vercel: https://vercel.com/dashboard
- [ ] Verificar que el último deployment tenga el commit `de18b41` (Fix: Carrito ahora carga productos desde Supabase)
- [ ] Si no está desplegado, hacer "Redeploy" manualmente

### 2. Verificar variables de entorno en Vercel
Las siguientes variables DEBEN estar configuradas:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = https://rnsswywuubwnlnfuybdb.supabase.co
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Cómo verificar:**
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Asegúrate de que ambas variables estén configuradas
4. Si las agregaste recientemente, haz un Redeploy

### 3. Verificar que el deployment terminó
- [ ] En Vercel, el deployment debe mostrar "Ready" (no "Building")
- [ ] Tiempo estimado: 2-5 minutos después del push

### 4. Limpiar caché del navegador
Después de confirmar que Vercel desplegó:
- [ ] Hard refresh: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
- [ ] O abrir en ventana de incógnito
- [ ] O limpiar caché manualmente: DevTools → Network → "Disable cache" (con DevTools abierto)

### 5. Verificar en consola del navegador (producción)
1. Abrir DevTools (F12) en tu sitio de Vercel
2. Ir a Console
3. Buscar errores relacionados con:
   - "Error loading promociones"
   - "Error loading published products"
   - "fetch failed"
   - "Supabase"

### 6. Verificar que la función loadCart se ejecuta
En DevTools Console (producción), ejecutar:
```javascript
console.log(localStorage.getItem('cart'))
```
Deberías ver un array con productos que incluyan `price` y `originalPrice`.

## Soluciones según el problema encontrado

### Si Vercel no tiene las variables de entorno:
1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **IMPORTANTE**: Después de agregar variables, hacer Redeploy

### Si el deployment está desactualizado:
1. Ve a Vercel Dashboard → Tu Proyecto → Deployments
2. Click en el botón "Redeploy" del deployment más reciente
3. Esperar 2-5 minutos

### Si el problema persiste:
Verificar en Vercel los logs del deployment:
1. Ve a Deployments → Click en el deployment actual
2. Revisar "Build Logs" por errores
3. Revisar "Function Logs" si hay errores en runtime

## Comandos útiles

### Forzar nuevo commit (si es necesario):
```bash
git commit --allow-empty -m "trigger: Force Vercel redeploy"
git push origin main
```

### Verificar estado del repo:
```bash
git log --oneline -3
git status
```
