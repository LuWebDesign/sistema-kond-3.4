---
name: next-admin-page
description: "Crear páginas de administración en Next.js para Sistema KOND. Usar cuando: creando una nueva vista en pages/admin/, añadiendo sección a panel admin, creando página con datos de Supabase + fallback localStorage, añadiendo withAdminAuth, creando métricas, reportes, formularios o listados administrativos."
argument-hint: "Nombre y propósito de la nueva página admin (ej: 'materiales - listar y editar materiales')"
---

# Skill: next-admin-page

## Cuándo usar esta skill

- Crear una nueva página en `next-app/pages/admin/`
- Necesitás proteger una ruta con autenticación de admin
- La página accede a datos de Supabase con fallback a `localStorage`
- Necesitás un módulo CSS propio para la página

---

## Patrones disponibles

### Patrón A — Con `dynamic` + `ssr: false` (recomendado para páginas con localStorage o charts)

Usar cuando la página:
- Accede directamente a `localStorage`
- Usa librerías de gráficos (Chart.js, Recharts)
- Tiene riesgo de hydration mismatch

### Patrón B — Export directo con `withAdminAuth` (páginas simples)

Usar cuando la página:
- Solo lee datos de Supabase (sin localStorage directo)
- No usa librerías client-only
- Agrega `mounted` guard para evitar hydration

---

## Procedimiento de creación

1. Definir el nombre del archivo siguiendo el patrón kebab-case: `pages/admin/nombre-pagina.js`
2. Si la página tiene estilos propios, crear `styles/nombre-pagina.module.css`
3. Elegir el patrón A o B según si hay riesgo de hydration
4. Copiar el template correspondiente desde [`./assets/`](./assets/)
5. Reemplazar los placeholders `{{NOMBRE_PAGINA}}` y `{{DESCRIPCION}}`
6. Agregar la importación de utilidades Supabase desde `../../utils/supabase*.js`
7. Añadir el link en el sidebar si corresponde → ver `next-app/utils/sidebar.js`

---

## Reglas críticas

| Regla | Motivo |
|-------|--------|
| Siempre usar `withAdminAuth(Componente)` en el export | Protección de ruta |
| `ssr: false` en `dynamic()` cuando hay `localStorage` | Evita crash durante SSR |
| Fallback a `localStorage` en el catch del `loadData` | Funciona sin API |
| Inicializar fechas y valores de `new Date()` dentro de `useEffect` | Hydration mismatch |
| Usar `escapeHtml()` de `../../utils/utils.js` antes de insertar HTML dinámico | XSS |
| Llamar a `setLoading(false)` siempre en el `finally` | Loading state infinito |

---

## Imports más usados

```js
// Layout y autenticación
import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'

// React
import { useState, useEffect, useMemo, useCallback } from 'react'

// Next.js
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'

// Utilidades del proyecto
import { formatCurrency, formatDate } from '../../utils/catalogUtils'

// Acceso a datos (elegir según entidad)
import { getAllProductos, createProducto, updateProducto } from '../../utils/supabaseProducts'
import { getMovimientos } from '../../utils/supabaseFinanzas'
import { getPedidosCatalogo } from '../../utils/supabasePedidos'
```

---

## Templates

- [Patrón A — dynamic + ssr:false](./assets/template-dynamic.js)
- [Patrón B — export directo con mounted guard](./assets/template-simple.js)
- [CSS Module base](./assets/template.module.css)

---

## Checklist antes de terminar

- [ ] El archivo está en `next-app/pages/admin/`
- [ ] Tiene `withAdminAuth` en el export default
- [ ] El `loadData` tiene try/catch con fallback a `localStorage`
- [ ] El `finally` llama a `setLoading(false)`
- [ ] Si usa `localStorage` o librerías client-only → tiene `dynamic` + `ssr: false`
- [ ] El CSS Module (si existe) está en `next-app/styles/*.module.css`
- [ ] No usa `new Date()` fuera de `useEffect`
