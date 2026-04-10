# Comandos Rápidos - Sistema KOND con Supabase

## 🚀 Inicio Rápido

### 1. Configuración inicial (una sola vez)

```powershell
# Instalar dependencias
npm install @supabase/supabase-js

# Copiar plantilla de variables de entorno
Copy-Item .env.example .env.local

# Editar .env.local con tus credenciales de Supabase
notepad .env.local
```

### 2. Verificar estructura

```powershell
# Verificar que todo está en orden
node verify-setup.js
```

## 📊 Configurar Supabase (Dashboard)

1. **Crear proyecto:** https://supabase.com
2. **Ejecutar SQL:**
   - Ir a: Dashboard > SQL Editor
   - Copiar y ejecutar: `supabase/schema.sql`
   - Copiar y ejecutar: `supabase/storage-buckets.sql`

3. **Obtener credenciales:**
   - URL: Dashboard > Settings > API > URL
   - Anon Key: Dashboard > Settings > API > anon public

4. **Configurar .env.local:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   NEXT_PUBLIC_USE_SUPABASE=true
   ```

## 🔄 Migración de Datos

### Exportar datos desde localStorage (navegador)

```javascript
// Abrir consola del navegador (F12)
const data = {
  productosBase: JSON.parse(localStorage.getItem("productosBase") || "[]"),
  pedidosCatalogo: JSON.parse(localStorage.getItem("pedidosCatalogo") || "[]"),
  marketing_promotions: JSON.parse(localStorage.getItem("marketing_promotions") || "[]"),
  marketing_coupons: JSON.parse(localStorage.getItem("marketing_coupons") || "[]")
};

// Copiar el resultado
console.log(JSON.stringify(data, null, 2));
```

### Guardar y migrar

```powershell
# Guardar el JSON en data-export.json

# Ejecutar migración
$env:SUPABASE_URL="https://tu-proyecto.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
node supabase/migrate-data.js
```

## 🖥️ Ejecutar la Aplicación

### Modo HTML Estático

```powershell
# Opción 1: Abrir directamente
Start-Process index.html

# Opción 2: Servidor local simple (Python)
python -m http.server 8000
# Abrir: http://localhost:8000

# Opción 3: Servidor local (Node)
npx http-server -p 8000
# Abrir: http://localhost:8000
```

### Modo Next.js

```powershell
cd next-app

# Desarrollo
npm run dev
# Abrir: http://localhost:3000

# Producción
npm run build
npm start
```

## 🧪 Testing y Verificación

```powershell
# Verificar estructura
node verify-setup.js

# Verificar errores de código
Get-ChildItem -Path js -Filter *.js -Recurse | Select-String -Pattern "console.error"

# Buscar TODOs pendientes
Get-ChildItem -Path . -Filter *.js,*.md -Recurse | Select-String -Pattern "TODO|FIXME"
```

## 🔧 Troubleshooting Rápido

### Error: "No module @supabase/supabase-js"

```powershell
npm install @supabase/supabase-js
```

### Error: "Invalid API key"

```powershell
# Verificar .env.local
Get-Content .env.local

# Verificar que la key es la "anon key" (no la service role key)
```

### Error: "No policy found"

```sql
-- Re-ejecutar en SQL Editor de Supabase:
-- 1. supabase/schema.sql
-- 2. supabase/storage-buckets.sql
```

### Volver a localStorage

```javascript
// En .env.local o en el código:
NEXT_PUBLIC_USE_SUPABASE=false

// O en el navegador:
window.KOND_USE_SUPABASE = false;
location.reload();
```

## 📦 Backup y Restore

### Backup de localStorage

```javascript
// En consola del navegador
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  backup[key] = localStorage.getItem(key);
}
console.log(JSON.stringify(backup, null, 2));
// Guardar el resultado en backup-localStorage.json
```

### Restore de localStorage

```javascript
// Cargar backup-localStorage.json y ejecutar:
const backup = { /* pegar JSON aquí */ };
Object.keys(backup).forEach(key => {
  localStorage.setItem(key, backup[key]);
});
location.reload();
```

### Backup de Supabase

```powershell
# Supabase hace backups automáticos diarios
# Para backup manual: Dashboard > Database > Backups
```

## 🔍 Debugging

```powershell
# Ver logs en tiempo real (Chrome)
# F12 > Console

# Ver tamaño de localStorage
# F12 > Application > Local Storage

# Ver Storage de Supabase
# Dashboard > Storage > Buckets

# Ver tablas de Supabase
# Dashboard > Table Editor
```

## 📋 Comandos Útiles

```powershell
# Limpiar node_modules y reinstalar
Remove-Item -Recurse -Force node_modules
npm install

# Buscar en archivos
Get-ChildItem -Path js -Filter *.js -Recurse | Select-String -Pattern "saveProductos"

# Contar líneas de código
(Get-ChildItem -Path js -Filter *.js -Recurse | Get-Content).Count

# Listar archivos grandes
Get-ChildItem -Path . -Recurse | Where-Object { $_.Length -gt 1MB } | Sort-Object Length -Descending
```

## 🆘 Soporte

- **Documentación completa:** `supabase/README.md`
- **Resumen de cambios:** `MIGRACION-SUPABASE.md`
- **README principal:** `README.md`
- **Guías específicas:** Ver archivos `GUIA-*.md`

---

**¡Sistema listo para usar!** 🎉

Para más detalles, consulta la documentación completa en los archivos MD del proyecto.
