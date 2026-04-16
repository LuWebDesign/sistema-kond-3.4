Resumen de la migración a Supabase (estado: completada)
===================================================

Resumen
-------
Este documento registra el estado de la migración de datos y esquema a Supabase. Según los artefactos presentes en el repositorio, la migración ya fue ejecutada en el pasado y los scripts/SQL que se mantienen son referencias históricas. El propósito de este archivo es:

- Documentar que la migración está completada (histórica).
- Indicar los archivos y comandos que se usaron o pueden usarse para reproducir la migración.
- Evitar que `verify-setup.js` reporte la ausencia de documentación de migración.

Estado
------
- Migración: completada (histórica). No es necesario ejecutar nada si no hay cambios nuevos en esquema o datos.
- Artefactos disponibles en el repositorio: scripts de migración y SQL bajo `supabase/` y migraciones relacionadas en `next-app/migrations/`.

Archivos y scripts clave
------------------------
- `supabase/migrate-data.js` — Script Node.js para importar datos exportados desde localStorage hacia Supabase. Usa `SUPABASE_SERVICE_ROLE_KEY` (solo en entorno servidor).
- `supabase/schema.sql` — Esquema principal (tablas, índices, etc.).
- `supabase/storage-buckets.sql` — Definición de buckets de Storage en Supabase.
- `supabase/*.sql` — SQL con cambios puntuales (ej.: `add-productos-fields.sql`, `add-stock-field.sql`, `add-producto-imagen-field.sql`, `migrate-usuarios-uuid.sql`, `marketing-tables.sql`, `finanzas-tables.sql`, etc.).
- `supabase/migrations/` — Migraciones numeradas (ej.: `supabase/migrations/20260310000003_fix_imagenes_urls_domain.sql`).
- `next-app/migrations/` — Migraciones y README para la app Next.js (ej.: `next-app/migrations/2025-11-migrate-imagen_url-to-imagenes_urls.sql`, `apply-pedidos-catalogo-migration.js`).
- `.env.example` — Variables de entorno de ejemplo (incluye nota sobre la service role key para migraciones).
- `verify-setup.js` — Script de verificación que exige la existencia de este archivo para considerar la estructura Supabase documentada.

Comandos de referencia (reproducir parcialmente)
------------------------------------------------
1) Preparar variables de entorno (solo servidor):
   - SUPABASE_URL=https://<tu-proyecto>.supabase.co
   - SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # NO compartir ni subir
   Recomendado: copiar `.env.example` a `.env.local` y completar.

2) Ejecutar migración de datos (si necesitas reimportar un export desde localStorage):
   - Exportar JSON desde la consola del navegador (ver `supabase/migrate-data.js` para el formato esperado).
   - node supabase/migrate-data.js

3) Ejecutar esquemas SQL:
   - psql -h <host> -U <user> -d <db> -f supabase/schema.sql
   - psql -h <host> -U <user> -d <db> -f supabase/storage-buckets.sql
   O usar `supabase` CLI (`supabase db push`) si prefieres.

Precauciones importantes
-----------------------
- Nunca poner `SUPABASE_SERVICE_ROLE_KEY` en código cliente ni en repositorios públicos.
- `supabase/migrate-data.js` requiere la service role key; úsala solo en entorno seguro (server/CI con permisos controlados).
- Antes de re-ejecutar migraciones en un entorno con datos de producción, tomar un backup (pg_dump o snapshot en Supabase).
- Revisar las claves de localStorage usadas por el sitio estático: `productosBase`, `pedidos`, `pedidosCatalogo`, `cart`.
- Algunas migraciones cambiaron cómo se almacenan imágenes (por ejemplo `imagen_url` → `imagenes_urls`). Revisar `supabase/migrations/*` antes de intervenir.

Sugerencias de mantenimiento
---------------------------
- Si consideras estos artefactos como históricos, puedes moverlos a `supabase/archive/` para dejarlos como referencia y reducir ruido en la raíz del proyecto.
- Alternativa: mantenerlos pero añadir una nota en los READMEs indicando "histórico — no ejecutar sin revisión".
- Si prefieres que `verify-setup.js` no exija este archivo, puedo:
  1) eliminar la comprobación correspondiente en `verify-setup.js`, o
  2) dejar este archivo (recomendado) y documentar el estado.

Dónde buscar más detalles
-------------------------
- Código de migración de datos: `supabase/migrate-data.js`
- Migrations SQL: `supabase/*.sql` y `supabase/migrations/`
- Migraciones de la app Next.js: `next-app/migrations/`
- Guías relacionadas: `supabase/README.md`, `supabase/README-SUPABASE-BOOTSTRAP.md`, `README.md`

Contacto / Siguientes pasos
---------------------------
Si quieres que archive los archivos antiguos, que actualice `verify-setup.js` para no requerir este archivo, o que realice otra acción (por ejemplo, crear `supabase/archive/` y mover los SQL antiguos), dime cuál opción prefieres y lo implemento.

Fecha de creación de este documento: 2026-04-15 (generado automáticamente)

Registro de archivos detectados (no exhaustivo)
---------------------------------------------
- supabase/migrate-data.js
- supabase/schema.sql
- supabase/storage-buckets.sql
- supabase/add-productos-fields.sql
- supabase/add-stock-field.sql
- supabase/add-producto-imagen-field.sql
- supabase/migrate-usuarios-uuid.sql
- supabase/marketing-tables.sql
- supabase/finanzas-tables.sql
- supabase/set-costo-material-calculated.sql
- supabase/add-pedido-catalogo-id-to-movimientos.sql
- supabase/migrations/20260310000003_fix_imagenes_urls_domain.sql
- supabase/migrations/2025-11-migrate-imagen_url-to-imagenes_urls.sql
- next-app/migrations/2025-11-migrate-imagen_url-to-imagenes_urls.sql
- next-app/migrations/README.md
- next-app/migrations/README-PAYMENT-CONFIG.md
- next-app/apply-pedidos-catalogo-migration.js

Fin del documento.
