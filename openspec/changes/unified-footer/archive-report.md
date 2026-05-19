# Archive Report: unified-footer

**Archived**: 2026-05-18  
**Status**: COMPLETED (6/6 tasks verified)  
**Change scope**: Data layer + Admin UI + PublicLayout footer + home.html dynamic footer

---

## Executive Summary

Se unificaron los footers de `home.html` (estático) y `PublicLayout.js` (Next.js) para compartir la misma fuente de datos `catalog_styles`, agregando soporte para 3 campos de redes sociales (Instagram, Facebook, TikTok). El change se entregó en 2 fases (~270 líneas netas en 4 archivos), sin migración SQL necesaria (JSONB acepta nuevas keys sin DDL).

**Alcance entregado:**
- 3 nuevos campos URL en `catalog_styles` JSONB: `footerInstagram`, `footerFacebook`, `footerTikTok`
- `DEFAULT_STYLES` actualizado en ambas copias (client + server) con comentarios de sincronización
- 3 inputs URL en admin UI (`estilos/index.js`) con validación `onBlur` de patrón URL
- Preview en vivo del admin actualizado con íconos SVG inline (16x16)
- Footer de `PublicLayout.js` con fila de íconos sociales SVG (24x24), `target="_blank"`, `rel="noopener noreferrer"`
- `home.html` con footer dinámico: fetch Supabase CDN + caché localStorage (TTL 5 min) + fallback graceful

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sin migración SQL | Nuevas keys en JSONB existente | `catalog_styles.styles` es JSONB; acepta keys nuevas sin ALTER TABLE |
| Dos copias de DEFAULT_STYLES | Cliente (`supabaseCatalogStyles.js`) + Server (`api/admin/catalog-styles.js`) | Patrón pre-existente del proyecto; se agregó comentario cross-reference para evitar divergencia |
| Validación URL en admin | `onBlur` con regex `^(https?:\/\/)[^\s]+$` | Validación client-side inmediata; no bloquea save, solo muestra "URL inválida" inline |
| home.html Supabase access | CDN client directo (`@supabase/supabase-js`) | Evita CORS de API routes; usa anon key (public read ya configurado) |
| Caché en home.html | localStorage con TTL 5 min | Reduce llamadas a Supabase en recargas; fallback a contenido estático si fetch falla |
| SVGs inline | Sin dependencias externas ni fuentes de íconos | Mismo patrón que el resto del proyecto; cero overhead de bundle |

---

## Files Created / Modified

### Modified files
| File | Change |
|------|--------|
| `next-app/utils/supabaseCatalogStyles.js` | 3 campos sociales en DEFAULT_STYLES + cross-reference comment |
| `next-app/pages/api/admin/catalog-styles.js` | 3 campos sociales en DEFAULT_STYLES (server-side copy) + cross-reference comment |
| `next-app/pages/admin/website/estilos/index.js` | Inputs sociales en Footer section + validación onBlur + preview con íconos SVG |
| `next-app/components/PublicLayout.js` | Fila de íconos sociales condicionales en footer |
| `home.html` | Footer HTML reemplazado (grid 3 columnas) + CSS grid styles + script dinámico con Supabase fetch + caché |

---

## Verification Results

| Task | Status | Notes |
|------|--------|-------|
| Task 1: DEFAULT_STYLES | ✅ Passed | Ambos archivos actualizados, campos idénticos, cross-reference comments presentes |
| Task 2: Admin inputs | ✅ Passed | 3 inputs URL visibles, validación onBlur funciona, error "URL inválida" mostrado |
| Task 3: Admin preview | ✅ Passed | Íconos SVG aparecen/desaparecen según URLs configuradas |
| Task 4: PublicLayout footer | ✅ Passed | Íconos sociales renderizados, links abren en nueva tab, `rel="noopener noreferrer"` presente |
| Task 5: home.html footer HTML/CSS | ✅ Passed | Grid 3 columnas responsive, social row existe |
| Task 6: home.html dynamic script | ✅ Passed | Fetch Supabase funciona, caché localStorage operativo, fallback graceful verificado |

**No critical issues found.**

---

## Known Technical Debt

### 1. Dos copias de DEFAULT_STYLES (media prioridad)
**Qué**: `supabaseCatalogStyles.js` y `api/admin/catalog-styles.js` mantienen copias independientes de `DEFAULT_STYLES`.  
**Por qué existe**: Patrón pre-existente del proyecto; deduplication requiere refactor de arquitectura (shared module entre client y server).  
**Riesgo**: Divergencia silenciosa si se agrega un campo nuevo y se olvida actualizar una copia.  
**Mitigación actual**: Comentarios cross-reference en ambos archivos.  
**Acción recomendada**: Refactor separado — extraer `DEFAULT_STYLES` a un módulo compartido importable por ambos lados.

### 2. home.html sin build system
**Qué**: El script dinámico del footer está inline en `home.html` como IIFE. No hay linting, minificación, ni tests para este código.  
**Por qué existe**: `home.html` es un archivo estático monolítico sin pipeline de build.  
**Riesgo**: Errores de sintaxis no detectados hasta runtime en producción.  
**Acción recomendada**: Migrar `home.html` a Next.js (ya está out of scope y documentado como cambio separado).

---

## Rollback Instructions

### Rollback nivel Next.js
1. Revertir el git commit — todos los cambios son aditivos, no se eliminaron campos ni comportamientos existentes.
2. Los campos sociales en JSONB son opcionales — valores vacíos no renderizan nada, deploys parciales son seguros.

### Rollback nivel home.html
1. El fallback a contenido estático está built-in en el script — si el fetch falla, el footer original se mantiene visible.
2. Para revertir completamente: restaurar las líneas originales de footer HTML/CSS (backup en git history).

---

## SDD Cycle Complete

Change `unified-footer` completado, verificado y archivado.  
Todas las tareas marcadas ✅. Deuda técnica documentada. Runbook de rollback incluido.
