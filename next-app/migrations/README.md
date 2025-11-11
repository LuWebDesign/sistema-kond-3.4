# Migración: Agregar campos de perfil a usuarios

## Descripción
Esta migración agrega los campos necesarios para almacenar el perfil completo de los usuarios en la tabla `usuarios`.

## Campos agregados
- `nombre` - Nombre del usuario
- `apellido` - Apellido del usuario
- `email` - Email del usuario
- `telefono` - Teléfono de contacto
- `direccion` - Dirección de envío
- `localidad` - Localidad/ciudad
- `cp` - Código postal
- `provincia` - Provincia
- `observaciones` - Observaciones adicionales para envíos

## Cómo ejecutar la migración

### Opción 1: Desde Supabase Dashboard (Recomendado)
1. Ve a tu proyecto en https://supabase.com/dashboard
2. En el menú lateral, selecciona "SQL Editor"
3. Crea una nueva query
4. Copia y pega el contenido de `add_user_profile_fields.sql`
5. Haz click en "Run" para ejecutar

### Opción 2: Usando supabase CLI
```bash
# Asegúrate de estar en la carpeta del proyecto
cd next-app

# Ejecuta la migración
supabase db push
```

### Opción 3: Usando psql (si tienes acceso directo)
```bash
psql -h <host> -U <usuario> -d <database> -f migrations/add_user_profile_fields.sql
```

## Verificación
Después de ejecutar la migración, verifica que los campos fueron agregados:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;
```

Deberías ver todos los nuevos campos listados.

## Rollback (si es necesario)
Si necesitas revertir esta migración:

```sql
ALTER TABLE usuarios
DROP COLUMN IF EXISTS nombre,
DROP COLUMN IF EXISTS apellido,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS telefono,
DROP COLUMN IF EXISTS direccion,
DROP COLUMN IF EXISTS localidad,
DROP COLUMN IF EXISTS cp,
DROP COLUMN IF EXISTS provincia,
DROP COLUMN IF EXISTS observaciones;

DROP INDEX IF EXISTS idx_usuarios_email;
```

## Notas
- Esta migración usa `IF NOT EXISTS` para ser idempotente (puede ejecutarse múltiples veces sin error)
- Los campos se agregan como nullable, los usuarios existentes tendrán NULL en estos campos hasta que actualicen su perfil
- Se crea un índice en el campo `email` para mejorar las búsquedas
