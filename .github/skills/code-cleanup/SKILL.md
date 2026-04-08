---
name: code-cleanup
description: Elimina código obsoleto, redundante o sin uso, y optimiza la estructura del código existente SIN alterar el comportamiento del sistema. Usá esta skill cuando el usuario mencione "limpiar código", "eliminar código muerto", "optimizar", "refactorizar", "código obsoleto", "dead code", "cleanup", o cuando el código tenga funciones/variables sin uso, comentarios desactualizados, imports innecesarios o duplicación evidente.
---

# Code Cleanup & Optimization

Elimina código innecesario y optimiza la estructura sin romper funcionalidad.

---

## Regla de Oro

> **Nunca eliminar sin entender. Nunca modificar comportamiento. Solo limpiar lo que está probadamente muerto o redundante.**

---

## Fase 1 — Análisis (NO tocar nada aún)

Antes de cualquier cambio, relevá el código e identificá:

1. **Imports sin uso** — importados pero nunca referenciados en el archivo.
2. **Variables sin uso** — declaradas pero nunca leídas ni pasadas.
3. **Funciones/métodos sin uso** — no llamados desde ningún lugar del proyecto.
4. **Código comentado** — bloques enteros comentados que ya no tienen propósito.
5. **Código duplicado** — lógica idéntica o casi idéntica en múltiples lugares.
6. **Condiciones siempre verdaderas o falsas** — `if (true)`, flags hardcodeados obsoletos.
7. **Console.log / prints de debug** — logs temporales que quedaron en producción.
8. **TODOs vencidos** — comentarios `// TODO` sin contexto ni owner, claramente abandonados.

Presentá el análisis en este formato antes de actuar:

```
ANÁLISIS DE LIMPIEZA
====================
🔴 ELIMINAR (riesgo bajo, sin dependencias):
  - [tipo] [nombre/línea] → razón

🟡 REVISAR (requiere confirmación):
  - [tipo] [nombre/línea] → razón

🟢 OPTIMIZAR (refactor seguro):
  - [tipo] [nombre/línea] → mejora propuesta

⚠️  IGNORAR (parece obsoleto pero tiene riesgo):
  - [tipo] [nombre/línea] → por qué no tocarlo
```

---

## Fase 2 — Validación (pedir confirmación)

Antes de ejecutar cambios, preguntá al usuario:

- ¿Hay tests automatizados que pueda correr para verificar que nada se rompe?
- ¿Existe alguna función que parezca sin uso pero podría ser llamada dinámicamente (reflection, eval, plugins)?
- ¿Hay código comentado que deba preservarse como documentación histórica?

Si el usuario confirma → pasar a Fase 3.
Si hay dudas → mover esos ítems a la categoría ⚠️ IGNORAR.

---

## Fase 3 — Ejecución de Limpieza

Aplicá los cambios en este orden de seguridad (del más seguro al menos):

### Paso 1 — Eliminar lo seguro
- Imports sin uso
- Variables locales sin uso
- Console.logs / prints de debug
- Bloques de código comentado (solo si son claramente obsoletos)

### Paso 2 — Optimizar duplicación
- Extraer lógica duplicada a una función/helper compartido
- Unificar constantes repetidas en una sola fuente

### Paso 3 — Simplificar condicionales
- Eliminar condiciones siempre verdaderas/falsas
- Simplificar lógica booleana innecesariamente compleja

### Paso 4 — Eliminar funciones muertas (solo con confirmación explícita)
- Funciones no referenciadas en ningún lugar del proyecto
- Clases/módulos completos sin uso

---

## Fase 4 — Reporte Final

Al terminar, generá este reporte:

```
REPORTE DE LIMPIEZA
===================
Archivos modificados : X
Líneas eliminadas    : X
Líneas refactorizadas: X

Cambios realizados:
  ✅ [descripción del cambio]
  ✅ [descripción del cambio]

Cambios omitidos (requieren revisión manual):
  ⚠️  [descripción + razón]

Próximos pasos sugeridos:
  → [acción recomendada si aplica]
```

---

## Restricciones — Nunca hacer esto

- ❌ No eliminar código que no entendés completamente.
- ❌ No renombrar funciones/variables públicas (rompe APIs externas).
- ❌ No cambiar la lógica de negocio aunque parezca mejorable.
- ❌ No eliminar funciones marcadas como `@deprecated` sin confirmación — pueden tener consumidores externos.
- ❌ No tocar archivos de configuración, migraciones de base de datos ni scripts de deploy sin pedido explícito.
- ❌ No asumir que una función sin uso local está realmente sin uso — puede ser llamada por reflection, eventos, o desde otro repositorio.

---

## Notas de eficiencia

- Si el código es grande (>500 líneas), procesalo archivo por archivo.
- Priorizá Fase 1 y 2 — dan el mayor beneficio con el menor riesgo.
- Si no hay tests, recomendá hacer uno básico antes de limpiar funciones.
- Un cambio a la vez es más seguro que un batch enorme difícil de revertir.
