---
name: image-upload-compress
description: "Implementar subida de imagen con compresión client-side a Supabase Storage. Usar cuando: un formulario admin necesita subir imagen de producto, avatar u otro recurso con validación de tamaño y compresión automática."
---

# Skill: image-upload-compress

## Objetivo
Recibir un archivo de imagen del usuario, comprimirlo a 1200px/0.82 quality, subirlo a Supabase Storage y obtener la URL pública (con fallback a base64 para localStorage).

## Pasos

1. **Importar** `compressImage` desde `../../utils/catalogUtils`:
   ```js
   import { compressImage } from '../../utils/catalogUtils'
   ```

2. **Validar tamaño** antes de procesar (límite: 8 MB):
   ```js
   if (file.size > 8 * 1024 * 1024) {
     alert('La imagen no puede superar 8 MB')
     return
   }
   ```

3. **Comprimir**:
   ```js
   const blob = await compressImage(file, 1200, 0.82)
   ```

4. **Convertir a base64** (para localStorage / preview):
   ```js
   const fileToBase64 = (blob) => new Promise((resolve) => {
     const reader = new FileReader()
     reader.onloadend = () => resolve(reader.result)
     reader.readAsDataURL(blob)
   })
   const base64 = await fileToBase64(blob)
   ```

5. **Subir a Supabase Storage** (si disponible):
   ```js
   const fileName = `productos/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
   const { data, error } = await supabase.storage
     .from('product-images')
     .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
   
   const { data: urlData } = supabase.storage
     .from('product-images')
     .getPublicUrl(fileName)
   
   const imageUrl = urlData?.publicUrl || base64
   ```

## Output esperado
- `imageUrl`: string con URL pública de Supabase (o base64 como fallback)
- Imagen comprimida ≤ ~300KB típicamente

## Notas de eficiencia
- `compressImage` es client-only (usa `canvas`) — llamarla solo dentro de handlers de eventos.
- Si Supabase Storage no está configurado, el base64 funciona como fallback completo.
- Bucket recomendado: `product-images` (público). Verificar políticas RLS en Supabase.
