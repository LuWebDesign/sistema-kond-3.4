# Pasos para reconectar Vercel con GitHub

## El problema detectado:
- Los commits están correctamente en GitHub (origin/main)
- Vercel NO está detectando los nuevos commits
- El último commit en Vercel es desde otra PC

## Solución paso a paso:

### 1. Verificar configuración de Vercel
1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings → Git**
4. Verifica:
   - ✅ Repository conectado a: `LuWebDesign/sistema-kond-3.4`
   - ✅ Branch conectado a: `main`
   - ✅ Production Branch: `main`

### 2. Verificar Root Directory
1. En **Settings → General**
2. Busca "Root Directory"
3. Debería estar configurado como: `next-app`
4. Si no está configurado, agrégalo y guarda

### 3. Forzar deployment manual
**Opción A - Desde Vercel Dashboard:**
1. Ve a **Deployments**
2. Click en el botón con 3 puntos (...) del deployment más reciente
3. Selecciona **"Redeploy"**
4. Asegúrate de marcar "Use existing Build Cache" = **OFF** (desmarcado)

**Opción B - Desde Git:**
```bash
# Ya hicimos esto, pero por si acaso:
git commit --allow-empty -m "trigger: Force Vercel rebuild"
git push origin main
```

### 4. Verificar variables de entorno
1. En **Settings → Environment Variables**
2. Verifica que existan:
   - `NEXT_PUBLIC_SUPABASE_URL` = https://rnsswywuubwnlnfuybdb.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = eyJhbGc...
3. Si las acabas de agregar, necesitas hacer Redeploy

### 5. Si nada funciona - Reinstalar integración
1. Ve a **Settings → Git**
2. Click en "Disconnect" (temporal)
3. Vuelve a conectar seleccionando el mismo repositorio
4. Configurar:
   - Production Branch: `main`
   - Root Directory: `next-app`
5. Deploy

## Verificación final:
Después del deployment, verifica:
1. El commit hash en Vercel coincide con GitHub
2. Los Build Logs no muestran errores
3. La página en producción muestra el precio promocional en VERDE

## Logs a revisar si falla:
- **Build Logs**: errores durante npm install / npm run build
- **Function Logs**: errores en runtime (API calls fallando)
- **Edge Logs**: errores en Edge Functions si usas

## Contacto con soporte
Si después de todo esto no funciona:
- Vercel Support: https://vercel.com/help
- O crear issue en GitHub del proyecto
