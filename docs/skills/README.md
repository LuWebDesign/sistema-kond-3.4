# Skills: indexer y Skill Runner

Este directorio contiene utilidades para indexar y ejecutar las `SKILL.md` del repositorio.

Scripts disponibles:

- `node scripts/build-skill-index.js`
  - Genera `.github/skills/index.json` con metadatos compactos de cada skill.

- `node scripts/skill-runner.js --list`
  - Lista las skills indexadas.

- `node scripts/skill-runner.js --skill <name> --dry-run`
  - Muestra un preview de la skill y las acciones que *se ejecutarían* en modo dry-run.

Objetivo inicial: `dry-run` para revisar antes de implementar el Action DSL y los handlers que aplican cambios reales.

Próximos pasos:
- Diseñar Action DSL
- Implementar handlers (edit-file, run-cmd, create-pr, call-api)
- Añadir sandboxing (git worktree o Docker) y flow de PR por defecto

