# Configuración Supabase para Sistema KOND

## Requisitos previos
- Cuenta en [Supabase](https://supabase.com)
- Node.js 16+ instalado

## Paso 1: Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto
3. Anota tu **URL del proyecto** y **anon key** (las necesitarás más adelante)

## Paso 2: Configurar base de datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Ejecuta el contenido de `supabase/schema.sql` para crear las tablas
3. Ejecuta el contenido de `supabase/storage-buckets.sql` para configurar Storage

## Paso 3: Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local` y completa con tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_USE_SUPABASE=true
```

## Paso 4: Instalar dependencias

```bash
npm install @supabase/supabase-js
```

O si usas el proyecto Next.js:

```bash
cd next-app
npm install @supabase/supabase-js
```

## Paso 5: Migrar datos existentes (opcional)

Si ya tienes datos en localStorage, usa el script de migración:

```bash
node supabase/migrate-data.js
```

Este script:
- Lee productos, pedidos y otros datos de localStorage (o archivo JSON exportado)
- Los sube a Supabase
- Convierte imágenes base64 a archivos en Supabase Storage (opcional)

## Paso 6: Configurar autenticación (opcional)

Para habilitar login de administradores:

1. En Supabase Dashboard, ve a **Authentication > Providers**
2. Habilita Email/Password
3. Crea usuarios admin desde **Authentication > Users**

## Estructura de carpetas Supabase

```
supabase/
├── client.js           # Cliente Supabase configurado
├── schema.sql          # Definiciones de tablas y políticas RLS
├── storage-buckets.sql # Configuración de Storage
├── migrate-data.js     # Script de migración desde localStorage
└── README.md           # Este archivo
```

## Uso del cliente Supabase

```javascript
import { supabase, USE_SUPABASE } from './supabase/client';

// Obtener productos
const { data: productos, error } = await supabase
  .from('productos')
  .select('*')
  .eq('publicado', true);

// Insertar pedido
const { data, error } = await supabase
  .from('pedidos_catalogo')
  .insert({
    cliente_nombre: 'Juan',
    productos: [...],
    total: 15000
  });

// Subir comprobante
import { uploadFile } from './supabase/client';
const { url, error } = await uploadFile(file, 'comprobantes', `pedido-${id}.jpg`);
```

## Modo híbrido (localStorage + Supabase)

El sistema soporta modo híbrido durante la transición:

- Si `NEXT_PUBLIC_USE_SUPABASE=false`: usa localStorage (modo legacy)
- Si `NEXT_PUBLIC_USE_SUPABASE=true`: usa Supabase con fallback a localStorage

Esto te permite probar Supabase sin romper la funcionalidad existente.

## Troubleshooting

### Error: "Invalid API key"
- Verifica que copiaste correctamente `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- La clave debe ser la **anon key**, no la service key

### Error: "No policy found"
- Asegúrate de haber ejecutado `schema.sql` completamente
- Verifica que RLS esté habilitado en las tablas

### Imágenes no se cargan
- Verifica que el bucket `productos` sea público
- Comprueba que ejecutaste `storage-buckets.sql`

## Recursos adicionales

- [Documentación Supabase](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
