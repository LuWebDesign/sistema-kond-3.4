# Configuración de Métodos de Pago - Migración Supabase

## Tabla: `payment_config`

Esta tabla almacena la configuración de los métodos de pago disponibles en el catálogo público.

### Estructura

- **id**: Identificador único (autoincremental)
- **config**: JSONB con la configuración de los métodos de pago
- **created_at**: Fecha de creación
- **updated_at**: Fecha de última actualización

### Formato del campo `config`

```json
{
  "transferencia": {
    "enabled": true,
    "alias": "KOND.PRODUCCION",
    "cbu": "0000000000000000000000",
    "titular": "Juan Pérez",
    "banco": "Banco Galicia"
  },
  "whatsapp": {
    "enabled": true,
    "numero": "5491112345678",
    "mensaje": "¡Gracias por tu pedido! Te contactaremos pronto..."
  },
  "retiro": {
    "enabled": true,
    "direccion": "Av. Corrientes 1234, CABA",
    "horarios": "Lun a Vie 9-18hs, Sáb 9-13hs"
  }
}
```

## Pasos para crear la tabla

### Opción 1: SQL Editor en Supabase Dashboard

1. Accede a tu proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido de `create-payment-config-table.sql`
5. Ejecuta la query (botón RUN)

### Opción 2: CLI de Supabase

```bash
# Ejecutar desde el directorio next-app
supabase db push
```

### Opción 3: Migración manual

```bash
# Conectarse a la base de datos
psql -h <tu-host> -U postgres -d postgres

# Ejecutar el script
\i migrations/create-payment-config-table.sql
```

## Verificación

Después de ejecutar la migración, verifica que la tabla se creó correctamente:

```sql
-- Ver la estructura de la tabla
\d payment_config

-- Ver las políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'payment_config';

-- Ver si hay datos por defecto
SELECT * FROM payment_config;
```

## Permisos (RLS - Row Level Security)

La tabla tiene las siguientes políticas:

- ✅ **Lectura pública**: Cualquiera puede leer la configuración (necesario para el catálogo)
- 🔒 **Escritura protegida**: Solo usuarios autenticados pueden insertar/actualizar/eliminar

## Uso en el código

### Obtener configuración

```javascript
import { getPaymentConfig } from '../utils/supabasePaymentConfig'

const config = await getPaymentConfig()
console.log(config.transferencia.alias) // "KOND.PRODUCCION"
```

### Guardar configuración

```javascript
import { savePaymentConfig } from '../utils/supabasePaymentConfig'

const newConfig = {
  transferencia: { enabled: true, alias: 'MI.ALIAS', ... },
  whatsapp: { enabled: true, numero: '549...', ... },
  retiro: { enabled: false, direccion: '', ... }
}

const success = await savePaymentConfig(newConfig)
```

### Verificar si un método está habilitado

```javascript
import { isPaymentMethodEnabled } from '../utils/supabasePaymentConfig'

const isTransferenciaEnabled = await isPaymentMethodEnabled('transferencia')
```

## Notas importantes

1. La configuración se guarda tanto en **Supabase** como en **localStorage** como backup
2. Solo debe haber **un registro** en la tabla (se actualiza, no se inserta nuevo)
3. La configuración por defecto se inserta automáticamente si la tabla está vacía
4. Los cambios son visibles inmediatamente en el catálogo público

## Troubleshooting

### Error: "relation payment_config does not exist"
- La tabla no se creó. Ejecuta el script SQL de migración.

### Error: "permission denied"
- Verifica que las políticas RLS estén correctamente configuradas.
- Para admin: asegúrate de estar autenticado en Supabase.

### La configuración no se guarda
- Verifica la consola del navegador para errores.
- Revisa que las variables de entorno de Supabase estén configuradas.
- Verifica que tengas permisos de escritura (usuario autenticado).

## Siguiente paso

Después de crear la tabla, ve a `/payment-config` en tu aplicación para configurar los métodos de pago.
