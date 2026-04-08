---
name: api-route-supabase
description: "Crear una nueva API route Next.js con el patrón del sistema (supabaseAdmin, validación de método, manejo de errores). Usar cuando: necesitás un nuevo endpoint en pages/api/ que lea o escriba en Supabase desde el servidor."
triggers: [api route, endpoint, pages/api, handler, supabaseAdmin, POST, GET, servidor, backend]
---

# Skill: api-route-supabase

## Objetivo
Crear un endpoint en `next-app/pages/api/` siguiendo el patrón establecido en el sistema (validación de método, cliente admin, respuestas consistentes).

## Pasos

1. **Crear el archivo** en `pages/api/[recurso]/[accion].js` (o `[id].js` para rutas dinámicas).

2. **Usar esta estructura base**:
   ```js
   import { supabaseAdmin } from '../../../utils/supabaseClient'

   export default async function handler(req, res) {
     if (req.method !== 'POST') { // o 'GET', 'PUT', etc.
       return res.status(405).json({ error: 'Método no permitido' })
     }

     const { campo1, campo2 } = req.body || {}

     if (!campo1) {
       return res.status(400).json({ error: 'Falta campo1' })
     }

     try {
       const supabase = supabaseAdmin()
       const { data, error } = await supabase
         .from('tabla')
         .select('*')
         .eq('id', campo1)
         .single()

       if (error) throw error

       return res.status(200).json({ success: true, data })
     } catch (error) {
       console.error('Error en [nombre-endpoint]:', error)
       return res.status(500).json({ error: error.message })
     }
   }
   ```

3. **Para rutas dinámicas** (`[id].js`): leer `req.query.id`.

4. **Para múltiples métodos** (GET + PUT): usar `switch (req.method)` en lugar de múltiples `if`.

## Output esperado
- Archivo `pages/api/[recurso]/[accion].js` funcional
- Respuestas: `{ success: true, data }` en éxito / `{ error: '...' }` en fallo

## Notas de eficiencia
- Usar `supabaseAdmin()` (no el cliente público) para operaciones server-side que requieren bypass de RLS.
- Para operaciones que NO requieren bypass RLS → usar el cliente público `supabase` de `utils/supabaseClient`.
- No usar `try/catch` para lógica de negocio esperada — solo para errores de infraestructura.
