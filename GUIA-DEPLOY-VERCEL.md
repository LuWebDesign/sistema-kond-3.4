# Guía de Despliegue a Vercel - Sistema KOND

**Fecha:** 7 de noviembre de 2025  
**Estado:** 📝 En preparación

---

## Pre-requisitos

Antes de deployar, asegurate de tener:

- ✅ Cuenta de Vercel (gratuita): https://vercel.com/signup
- ✅ Repositorio GitHub conectado: `LuWebDesign/sistema-kond-3.4`
- ✅ Proyecto Supabase funcionando: `sdudjuomhcywhpyfziel`
- ✅ Variables de entorno preparadas (ver más abajo)

---

## Paso 1: Preparar Variables de Entorno

Las siguientes variables deben configurarse en Vercel:

### Variables Públicas (Frontend)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://sdudjuomhcywhpyfziel.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

### Variables Privadas (Backend/API Routes - opcional)
```bash
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

**⚠️ IMPORTANTE:** 
- NO subir estas keys al repositorio (`.env.local` ya está en `.gitignore`).
- `SUPABASE_SERVICE_ROLE_KEY` solo usarla en API routes si es necesario (bypass RLS).

### ¿Dónde encontrar tus keys?

1. Entra a tu proyecto Supabase: https://supabase.com/dashboard/project/sdudjuomhcywhpyfziel
2. Ve a **Settings** → **API**
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY` (opcional, solo para backend)

---

## Paso 2: Crear Proyecto en Vercel

### Opción A: Desde la interfaz web (recomendado)

1. **Ir a Vercel Dashboard:** https://vercel.com/dashboard
2. **Crear nuevo proyecto:**
   - Click en **"Add New..."** → **"Project"**
3. **Importar repositorio:**
   - Busca `LuWebDesign/sistema-kond-3.4`
   - Click en **"Import"**
4. **Configurar proyecto:**
   - **Framework Preset:** Next.js (detectado automáticamente)
   - **Root Directory:** `next-app` (⚠️ IMPORTANTE)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

5. **Agregar Variables de Entorno:**
   - En la sección **Environment Variables**, agregar:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - (Opcional) `SUPABASE_SERVICE_ROLE_KEY`
   - Asignar a **Production**, **Preview**, y **Development**

6. **Deploy:**
   - Click en **"Deploy"**
   - Esperar a que termine el build (2-5 min)

### Opción B: Desde la CLI (avanzado)

```bash
# Instalar Vercel CLI globalmente
npm install -g vercel

# Login a Vercel
vercel login

# Ir al directorio del proyecto Next.js
cd "c:\Users\Noxi-PC\Desktop\Sistema KOND 3.4\next-app"

# Deploy
vercel

# Seguir los prompts:
# - Set up and deploy? → Y
# - Which scope? → tu cuenta
# - Link to existing project? → N (primera vez)
# - What's your project's name? → sistema-kond-next
# - In which directory is your code located? → ./ (ya estás en next-app)
# - Want to modify settings? → Y
#   - Build Command: npm run build
#   - Output Directory: .next
#   - Development Command: npm run dev

# Configurar variables de entorno
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Pegar el valor cuando lo pida

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Pegar el valor cuando lo pida

# Deploy a producción
vercel --prod
```

---

## Paso 3: Verificar Deployment

Una vez que el deploy termine:

1. **URL del deployment:** Vercel te dará una URL tipo:
   - `https://sistema-kond-next.vercel.app` (producción)
   - `https://sistema-kond-next-<hash>.vercel.app` (preview)

2. **Probar funcionalidad básica:**
   - Abrir la URL en el navegador
   - Verificar que cargue la página de inicio
   - Probar catálogo (debe cargar productos desde Supabase)
   - Verificar que las imágenes carguen correctamente

3. **Revisar logs en Vercel:**
   - Dashboard → Tu proyecto → **Deployments** → Click en el deployment
   - Ver **Build Logs** y **Runtime Logs**
   - Buscar errores (especialmente relacionados con env vars)

4. **Probar API routes:**
   ```bash
   # Health check
   curl https://sistema-kond-next.vercel.app/api/health
   
   # Productos
   curl https://sistema-kond-next.vercel.app/api/productos
   ```

---

## Paso 4: Configurar Dominio Personalizado (Opcional)

Si tienes un dominio propio:

1. **En Vercel Dashboard:**
   - Tu proyecto → **Settings** → **Domains**
   - Click en **"Add Domain"**
   - Ingresar tu dominio (ej: `sistemakond.com`)

2. **Configurar DNS:**
   - Vercel te dará instrucciones específicas
   - Agregar registros CNAME o A en tu proveedor de DNS

3. **Esperar propagación:**
   - Puede tardar 24-48 horas
   - Verificar con: https://www.whatsmydns.net/

---

## Troubleshooting Común

### Error: "Module not found"
**Causa:** Imports relativos sin extensión `.js` o dependencias faltantes.  
**Solución:**
- Verificar que todos los imports tengan `.js` en archivos ES modules
- Revisar `package.json` y ejecutar `npm install`

### Error: "Environment variable not defined"
**Causa:** Variables de entorno no configuradas en Vercel.  
**Solución:**
- Ir a Settings → Environment Variables en Vercel
- Agregar las variables faltantes
- Re-deployar

### Error: "Build failed" - Timeout
**Causa:** Build muy lento o script bloqueado.  
**Solución:**
- Revisar Build Logs para identificar el paso que falla
- Optimizar dependencias y código
- Considerar aumentar el timeout (planes pagos)

### Error 404 en rutas
**Causa:** Root directory incorrecto.  
**Solución:**
- Verificar que Root Directory esté configurado como `next-app`
- Re-deployar

### Imágenes no cargan desde Supabase Storage
**Causa:** Permisos RLS o CORS en Supabase Storage.  
**Solución:**
- Verificar políticas RLS en buckets
- Configurar CORS en Supabase: Settings → API → CORS

---

## Configuración de RLS (Row Level Security)

Si experimentás errores de permisos, verifica las políticas RLS en Supabase:

```sql
-- Ver políticas actuales
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Ejemplo: política para productos (lectura pública)
CREATE POLICY "Productos públicos lectura"
  ON productos FOR SELECT
  TO anon
  USING (publicado = true);

-- Ejemplo: política para admin (escritura)
CREATE POLICY "Admin puede editar productos"
  ON productos FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

---

## Monitoreo Post-Deploy

### Vercel Analytics
- Dashboard → Tu proyecto → **Analytics**
- Métricas: visitas, performance, errores

### Logs en tiempo real
```bash
# Desde CLI
vercel logs sistema-kond-next --follow
```

### Alertas (planes pagos)
- Configurar en Settings → Integrations
- Opciones: Slack, Discord, Email

---

## Next Steps Después del Deploy

1. **Probar exhaustivamente:**
   - Flujo completo de checkout
   - Subida de comprobantes
   - Login admin
   - Creación de productos

2. **Actualizar URLs en código:**
   - Si tenés URLs hardcodeadas, reemplazarlas por la URL de Vercel

3. **Configurar CI/CD:**
   - Vercel auto-deploya en cada push a `main`
   - Configurar branch de preview si es necesario

4. **Backups regulares:**
   - Supabase → Settings → Database → Backups (automáticos en planes pagos)
   - Exportar datos manualmente: `pg_dump` desde Supabase CLI

---

## Comandos Útiles

```bash
# Ver deployments
vercel list

# Ver logs en tiempo real
vercel logs --follow

# Abrir proyecto en Vercel Dashboard
vercel open

# Ver variables de entorno
vercel env ls

# Re-deployar última versión
vercel --prod

# Rollback a deployment anterior
vercel rollback <deployment-url>
```

---

## Recursos Adicionales

- **Documentación Vercel:** https://vercel.com/docs
- **Documentación Next.js:** https://nextjs.org/docs
- **Documentación Supabase:** https://supabase.com/docs
- **Soporte Vercel:** https://vercel.com/support

---

## Checklist Final

Antes de considerar el deploy completo:

- [ ] Deploy exitoso en Vercel
- [ ] Variables de entorno configuradas
- [ ] Catálogo carga productos desde Supabase
- [ ] API routes funcionan correctamente
- [ ] Login admin funciona
- [ ] Imágenes cargan desde Supabase Storage
- [ ] No hay errores críticos en logs
- [ ] Performance aceptable (< 3s de carga)
- [ ] Dominio personalizado configurado (opcional)
- [ ] Monitoreo y alertas activas

---

**Última actualización:** 7 de noviembre de 2025  
**Estado del deploy:** ⏳ Pendiente de ejecución
