---
name: push-to-github
description: "Skill para guiar y automatizar los pasos locales para añadir cambios, crear una rama, commitear, pushear y abrir un Pull Request en GitHub. Útil para contribuciones rápidas desde el equipo." 
argument-hint: "Mensaje de commit breve (ej: 'admin: añadir selector país WhatsApp')"
---

# Skill: push-to-github

## Cuando usar
- Tienes cambios locales listos y quieres subirlos a GitHub en una rama nueva.
- Quieres un conjunto de comandos reproducibles para crear la rama, commitear y abrir el PR.

## Qué hace
- Verifica el estado del repo (`git status`).
- Crea una rama con nombre seguro (`feature/xxx` o `fix/xxx`).
- Añade ficheros especificados al índice y realiza `git commit` con mensaje.
- Empuja la rama al remoto (`git push -u origin <branch>`).
- Opcional: crea un PR usando la CLI `gh` (si está instalada).

## Requisitos
- Repositorio Git inicializado y remoto `origin` configurado.
- Acceso SSH/HTTP configurado para push.
- Opcional: `gh` CLI instalada para crear PRs desde la terminal.

## Comandos recomendados

1) Comprobar estado:

```
git status --porcelain
```

2) Crear y cambiar a rama (reemplazar `feature/desc`):

```
git checkout -b feature/desc
```

3) Añadir archivos específicos (recomendado) o todos:

```
git add path/to/file1 path/to/file2
# o
git add -A
```

4) Hacer commit (mensaje corto + opcional cuerpo):

```
git commit -m "<tipo>: <breve descripción>" -m "Detalles opcionales..."
```

5) Empujar y crear upstream:

```
git push -u origin HEAD
```

6) Crear PR con `gh` (opcional):

```
gh pr create --fill --base main --head feature/desc
```

## Buenas prácticas
- Evita commits grandes; agrupa cambios lógicamente.
- Usa prefijos convencionales en mensajes (`feat:`, `fix:`, `chore:`, `admin:`).
- Añade archivos concretos en `git add` en vez de `-A` si no estás seguro.
- Verifica que las pruebas locales y linter (si aplica) pasen antes de push.

## Ejemplo de flujo (copy-paste)

```
git checkout -b feature/catalog-whatsapp-country
git add next-app/pages/admin/catalog-styles.js next-app/utils/supabaseCatalogStyles.js .github/copilot-instructions.md
git commit -m "admin: añadir selector de país para número WhatsApp en catalog-styles"
git push -u origin feature/catalog-whatsapp-country
gh pr create --fill --base main --head feature/catalog-whatsapp-country
```

## Seguridad y permisos
- No incluyas secretos en commits.
- No hacer push directo a `main` salvo que el equipo lo autorice.

## Extensiones posibles
- Añadir script que abra una plantilla de PR prellenada con checklist.
- Integrar hooks (pre-commit, pre-push) para ejecutar linters/tests automáticamente.

---
Archivo creado por la skill `push-to-github` para Sistema KOND.
