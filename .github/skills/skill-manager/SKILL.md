---
name: skill-manager
description: "Meta-skill que administra el ecosistema de Skills: detecta, crea, adapta y ejecuta la skill correcta para cada tarea. Usar cuando necesitás resolver cualquier tarea y querés que el agente elija o cree la skill óptima."
---

# Skill: skill-manager

## Objetivo
Analizar la tarea recibida, detectar la skill adecuada del repositorio y ejecutarla (o crearla si no existe), minimizando consumo de tokens y maximizando precisión.

---

## Flujo de decisión

```
[Tarea recibida]
        ↓
¿Existe Skill exacta? → SÍ → Ejecutar
        ↓ NO
¿Existe Skill parcial (≥80%)? → SÍ → Adaptar y ejecutar
        ↓ NO
Crear Skill nueva → Guardar en repositorio → Ejecutar
```

---

## Pasos

1. **Detectar skills disponibles**: Leer `.github/skills/*/SKILL.md` en tiempo real para construir el índice. No usar un índice estático — puede estar desactualizado.
2. Comparar la tarea contra `name`, `description` y `triggers` de cada skill.
3. Aplicar el flujo de decisión anterior.
4. Al ejecutar: cargar **solo** la skill necesaria (no todo el repositorio).
5. Si la tarea tiene múltiples etapas: indicar explícitamente "Usando Skill A + Skill B".
6. Si se crea una skill nueva: guardarla en `.github/skills/[nombre]/SKILL.md` y actualizar el índice.

---

## Output esperado

- **Primer mensaje**: `Skill Manager activa. Repositorio actual: [N] skills disponibles. ¿Qué necesitás resolver?`
- **Al ejecutar una skill existente**: indicar nombre de la skill usada y resultado.
- **Al crear una skill nueva**: archivo `.github/skills/[nombre]/SKILL.md` + confirmación.

---

## Estructura de una Skill nueva

```markdown
---
name: [nombre-kebab-case]
description: "[Una oración: QUÉ hace y CUÁNDO se usa]"
---

## Objetivo
[1-2 oraciones]

## Pasos
1. [acción concreta]
2. [acción concreta]

## Output esperado
[Formato exacto: archivo, texto, código, tabla]

## Notas de eficiencia
[Solo si agrega valor real]
```

---

## Reglas críticas

| Regla | Motivo |
|-------|--------|
| Skill existente ≥80% → usarla, no crear nueva | Evitar duplicados |
| Skill nueva < 40 líneas | Mantener bajo consumo de tokens |
| Skill > 50 líneas → dividir en dos | Una skill = una responsabilidad |
| Sin ejemplos genéricos | Solo si son necesarios para ejecución correcta |
| No repetir info ya presente en el contexto | Eficiencia de tokens |
