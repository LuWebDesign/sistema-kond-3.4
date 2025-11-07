Guía rápida: ejecutar el bootstrap de Supabase para Sistema KOND

Este README resume los pasos para provisionar el proyecto Supabase `sistema-kond-staging` y ejecutar el SQL de inicialización desde tu máquina.

Prerequisitos
- Cuenta en Supabase (https://supabase.com)
- Acceso al dashboard del proyecto (crear proyecto manualmente o por la UI)
- Opcional: `psql` instalado si prefieres ejecutar SQL por línea de comandos
- Opcional: `supabase` CLI si deseas usar migraciones locales

Archivos generados
- `supabase/init.sql` – Script SQL con tablas, triggers e índices.

Flujo recomendado (rápido)
1) Crear el proyecto en Supabase UI
   - Project Name: sistema-kond-staging
   - Guardar Database Password, Project URL y API keys
2) En Settings > API copia la Project URL y la ANON / SERVICE_ROLE keys
3) Crear `.env.local` en la raíz de `next-app` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key)
```

4) Ejecutar el SQL de inicialización

Opción A — Usar SQL Editor (recomendado para la mayoría):
- Abre Supabase Dashboard > SQL Editor
- Carga el contenido de `supabase/init.sql` y ejecútalo (Run)

Opción B — Usar psql (si tienes la cadena de conexión):
- En Supabase Dashboard > Settings > Database > Connection string copia la cadena (ej: postgresql://user:password@dbhost:5432/postgres)
- En PowerShell (reemplaza valores):

```powershell
# Asumiendo que tienes psql instalado
$PG_CONN = "postgresql://postgres:TuPassword@dbhost:5432/postgres"
# Ejecutar el script
psql $PG_CONN -f .\supabase\init.sql
```

Opción C — Usar Supabase CLI / migraciones (opcional avanzado):
- Instalar CLI: https://supabase.com/docs/guides/cli
- Inicializar: `supabase init`
- Crear migración y ejecutar: `supabase db remote set <connection-string>` y luego `supabase db push` (consulta docs CLI para flujo exacto)

5) Habilitar RLS y crear políticas
- Puedes ejecutar las sentencias de RLS y políticas desde el SQL Editor (la guía contiene los bloques de políticas).
- Tras crear políticas, habilita RLS en cada tabla (ALTER TABLE ... ENABLE ROW LEVEL SECURITY;)

6) Crear usuario admin
- Genera hash bcrypt localmente:
```powershell
# desde PowerShell en tu máquina
npm install -g bcryptjs
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('TuContraseñaSegura123!',10));"
```
- Inserta el admin en SQL Editor (reemplaza el hash):
```sql
INSERT INTO usuarios (username, password_hash, rol)
VALUES ('admin', '$2a$10$TU_HASH_AQUI', 'admin');
```

7) Crear buckets de Storage
- Storage > Create bucket
  - productos-imagenes (public)
  - comprobantes-pago (private)
- Ejecuta las políticas de storage desde SQL Editor (bloques en la guía)

8) Verificación
- Insertar producto de prueba (consulta la guía)
- Revisar tablas y buckets en Table Editor / Storage

Notas de seguridad
- NO subir `SUPABASE_SERVICE_ROLE_KEY` al repo. Guárdalo en lugares seguros (secreto del CI, vault o archivo fuera del repo).
- Asegúrate de que `.env.local` está en `.gitignore`.

Soporte/seguimiento
- Si querés, puedo generar automáticamente una migración SQL más estructurada (migraciones numeradas) o crear un pequeño script PowerShell que automatice el flujo psql si me das la cadena de conexión (recomiendo no compartir credenciales por el chat).

Fin.
