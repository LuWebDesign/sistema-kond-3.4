# 🔄 Migración de Productos a Supabase

## 🔍 Diagnóstico del Problema

El catálogo en Vercel (`https://sistema-kond-3-4.vercel.app/catalog`) no muestra productos con precios e imágenes porque:

1. ✅ El código está correctamente configurado para cargar desde Supabase
2. ❌ **Solo hay 1 producto en Supabase** (Cartel Happy birthday)
3. ⚠️ Los demás productos están solo en **localStorage** (navegador local)

## 📊 Estado Actual

**En Supabase:**
- 1 producto publicado
- ✅ Con precio: $14,948.10
- ✅ Con imagen

**En localStorage (local):**
- Probablemente decenas de productos
- Con precios, imágenes y descuentos configurados
- **NO accesibles desde Vercel** (localStorage es por navegador)

## 💡 Solución: Migrar Productos

### Opción 1: Script de Migración Automática (Recomendado)

Voy a crear un script que migre todos los productos de localStorage a Supabase:

```bash
cd "c:\Users\Noxi-PC\Desktop\Sistema KOND 3.4\next-app"
node scripts/migrate-productos-to-supabase.js
```

Este script:
1. Lee todos los productos de localStorage
2. Los filtra (solo activos y con datos completos)
3. Los inserta en Supabase con la estructura correcta
4. Mantiene precios, imágenes y configuración de promociones

### Opción 2: Migración Manual desde el Panel Admin

1. Abre http://localhost:3000/admin (local)
2. Ve a la sección "Base de Datos"
3. Para cada producto:
   - Verifica que tenga precio e imagen
   - Marca como "Publicado" si quieres que aparezca en el catálogo
4. El sistema sincronizará automáticamente con Supabase

### Opción 3: Exportar/Importar CSV

1. Exporta productos desde localStorage a CSV
2. Importa el CSV en Supabase usando el dashboard web

## ⚠️ Consideraciones Importantes

### Imágenes en Base64

Si tus productos tienen imágenes en formato base64 (guardadas directamente en localStorage), el script de migración:

1. **Opción A:** Las mantiene en `imagen_url` como base64 (funcionará, pero ocupará mucho espacio)
2. **Opción B:** Las sube a Supabase Storage y guarda solo la URL (recomendado para producción)

Para usar Storage (Opción B):
```javascript
// Configurar bucket público en Supabase
// Dashboard → Storage → Create bucket "productos-imagenes" (público)
```

### Tamaño de la Base de Datos

- Supabase Free Tier: 500 MB
- Imágenes base64 pueden ser grandes (100-500 KB cada una)
- Recomendación: Si tienes +50 productos con imágenes, usa Supabase Storage

## 🚀 Pasos Siguientes

1. **Ahora:** Voy a crear el script de migración
2. **Tú ejecutas:** El script para migrar productos
3. **Verificar:** Que los productos aparezcan en Supabase
4. **Redesplegar:** Push a GitHub → Vercel redespliega → Catálogo funciona

## 📝 Checklist

- [ ] Ejecutar script de migración
- [ ] Verificar productos en Supabase (Dashboard → Table Editor → productos)
- [ ] Verificar que tengan `publicado = true`
- [ ] Verificar que tengan precio > 0
- [ ] Verificar que tengan imagen
- [ ] Push a GitHub
- [ ] Verificar catálogo en Vercel

---

**Próximo paso:** Crear script `migrate-productos-to-supabase.js`
