# Skill: Collapsible Sections — Estilo y Formato

Descripción
-----------
Esta skill documenta el componente `CollapsibleSection` y las pautas de uso, estilo y accesibilidad aplicadas en el formulario de productos del admin. Sirve como referencia para que futuras modificaciones mantengan consistencia visual y de interacción.

Cuándo usar
-----------
- Formularios largos donde cada bloque puede editarse por separado.
- Secciones que requieren confirmación/validación por bloque (guardar parcial).

API y contrato esperado
----------------------
- Props principales:
  - `icon` (string): emoji o icono corto para el encabezado.
  - `title` (string): título de la sección.
  - `defaultCollapsed` (boolean): estado inicial.
  - `summary` (string | undefined): texto breve que aparece cuando está colapsada.
  - `onSave` (function): callback que valida y persiste la sección. Debe devolver `true` (o Promise<boolean> que resuelva `true`) si la operación fue exitosa, `false` si falló (no colapsar).
  - `children`: contenido editable de la sección.

Comportamiento y UX
-------------------
- La sección muestra un encabezado con `icon` + `title`.
- Al estar colapsada muestra `summary` (si existe).
- Hay un menú de acciones (⋯) con la acción `Modificar` que despliega la sección.
- Cuando está expandida, aparece un botón `Guardar` visible; `onSave` se ejecuta al pulsarlo.
- `onSave` debe validar campos mínimos y retornar `true` para permitir que la sección se colapse.
- Evitar `alert()` nativo: usar notificaciones efímeras (toast) o `showCustomAlert()` definido en `utils.js`.
- Tecla `Enter` activa `onSave` salvo cuando el foco está dentro de un `textarea`.
- Click fuera del menú debe cerrarlo; la sección no debe perder datos sin confirmación.

Accesibilidad (a11y)
--------------------
- Encabezado debe ser un `button` con `aria-expanded` reflejando el estado.
- `Guardar` debe ser `button type="button"` para evitar submits accidentales.
- Al expandir, enfocar el primer campo editable relevante.
- Proveer roles y etiquetas para lectores de pantalla cuando corresponda.

Buenas prácticas de implementación
---------------------------------
- `onSave` puede ser síncrono o retornar una Promise.
- Mantener validaciones locales en `onSave` y persistencia en wrappers (`save*` handlers).
- Mostrar feedback visual (toast) en lugar de `alert()`.
- No bloquear el hilo principal en `onSave`; usar `async/await` y mostrar loader si la operación tarda.
- Los nombres de handlers en el proyecto deben seguir patrón: `save<SectionName>`, por ejemplo `saveBasicInfo`.

Ejemplo mínimo
--------------
```jsx
<CollapsibleSection
  icon="📋"
  title="Información Básica"
  defaultCollapsed={true}
  summary={formData.nombre ? `${formData.nombre} — ${formData.categoria}` : undefined}
  onSave={async () => {
    if (!formData.nombre) { showCustomAlert('Completar nombre'); return false }
    await saveBasicToServer(formData)
    showToast('Sección guardada')
    return true
  }}
>
  {/* inputs aquí */}
</CollapsibleSection>
```

Archivos relacionados
---------------------
- Implementación actual: `next-app/pages/admin/productos/new.js`

Notas finales
------------
Crear esta skill facilita mantener consistencia y acelerar futuras PRs. Se recomienda agregar tests E2E que validen el flujo de `Modificar` → editar → `Guardar` para las secciones críticas.
