---
name: catalog-feature-toggle
description: "Agregar una nueva funcionalidad ON/OFF controlada desde el admin al catálogo público. Usar cuando: adding toggle, banner, botón flotante, o cualquier opción visual/funcional que el admin active/desactive desde catalog-styles."
---

# Skill: catalog-feature-toggle

## Objetivo
Añadir un nuevo campo de configuración en `catalog_styles` (Supabase), un control en el admin y su efecto en el catálogo público, con cache en localStorage para evitar flash.

## Pasos

1. **Agregar a `DEFAULT_STYLES`** en `next-app/utils/supabaseCatalogStyles.js`:
   ```js
   miFeatureEnabled: false,
   miFeatureValor: '',
   ```

2. **Agregar control en admin** `next-app/pages/admin/catalog-styles.js`:
   - Toggle switch para booleanos o input para valores.
   - Al guardar, incluir los campos en el objeto que se envía a `/api/admin/catalog-styles` (PUT).

3. **Leer en el catálogo público** (`next-app/components/PublicLayout.js` o `pages/catalog.js`):
   ```js
   const styles = await getCatalogStyles() // ya cachea en localStorage
   if (styles.miFeatureEnabled) { /* activar feature */ }
   ```

4. **Cacheo automático**: `getCatalogStyles()` ya guarda en `localStorage('catalogStyles')` — no hacer nada extra.

## Output esperado
- Campo nuevo en `DEFAULT_STYLES`
- Control visible en `/admin/catalog-styles`
- Comportamiento activo/inactivo en el catálogo público

## Notas de eficiencia
- `getCatalogStyles()` lee localStorage sincrónicamente si está cacheado → no hay flash.
- Para toggles simples: usar `<input type="checkbox">` o un `<button>` que alterne clase `.active`.
- El campo booleano en Supabase se guarda como parte del JSONB `styles`; no crear columna nueva.
