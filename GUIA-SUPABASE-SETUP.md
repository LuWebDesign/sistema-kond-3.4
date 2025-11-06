# Guía: Provisionar Supabase para Sistema KOND

**Fecha**: 6 de noviembre de 2025  
**Objetivo**: Configurar proyecto Supabase staging para migración del backend

---

## Paso 1: Crear Cuenta en Supabase

### 1.1 Registrarse
1. Ve a **https://supabase.com**
2. Haz clic en **"Start your project"**
3. Opciones de registro:
   - **Recomendado**: Sign in with GitHub (conecta directamente tu repo)
   - Alternativa: Email + contraseña

### 1.2 Verificar Email
- Si usaste email, revisa tu bandeja y verifica la cuenta
- Si usaste GitHub, ya estás listo

---

## Paso 2: Crear Nuevo Proyecto

### 2.1 Dashboard de Supabase
1. Una vez logueado, verás el dashboard principal
2. Haz clic en **"New project"**

### 2.2 Configuración del Proyecto

#### Nombre y Organización
- **Organization**: Si es tu primera vez, Supabase crea una org automáticamente. Usa tu nombre o "KOND"
- **Project Name**: `sistema-kond-staging`
- **Database Password**: 
  - ⚠️ **IMPORTANTE**: Guarda esta contraseña en un lugar seguro
  - Genera una fuerte (usa el botón "Generate a password")
  - Ejemplo: `K0nd$St4g1ng2025!xYz`

#### Región
- Selecciona la región más cercana a tus usuarios
- **Recomendado para Argentina/LATAM**: `South America (São Paulo)`
- Alternativa: `East US (North Virginia)`

#### Plan
- Selecciona **"Free"** (suficiente para staging)
- Incluye:
  - 500 MB de base de datos
  - 1 GB de almacenamiento de archivos
  - 50,000 usuarios activos mensuales
  - 2 GB de transferencia

### 2.3 Crear Proyecto
- Haz clic en **"Create new project"**
- ⏱️ Espera 2-3 minutos mientras Supabase provisiona tu proyecto

---

## Paso 3: Obtener Credenciales del Proyecto

Una vez que el proyecto esté listo:

### 3.1 API Keys
1. En el menú lateral, ve a **"Settings"** (⚙️)
2. Selecciona **"API"**
3. Verás dos secciones importantes:

#### Project URL
```
https://xxxxxxxxxxxxxxxx.supabase.co
```
**Guarda esta URL** — la necesitarás en el código

#### API Keys
Verás dos keys:

**a) `anon` / `public` key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4...
```
- Esta key es **pública** (puede estar en el frontend)
- Respeta Row Level Security (RLS)
- **Guarda esta key** con el nombre `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**b) `service_role` / `secret` key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4...
```
- Esta key es **secreta** (SOLO para servidor)
- Bypasea RLS — tiene permisos totales
- **⚠️ NUNCA la expongas en el frontend**
- **Guarda esta key** con el nombre `SUPABASE_SERVICE_ROLE_KEY`

### 3.2 Crear archivo .env.local

En tu proyecto Next.js, crea el archivo `.env.local`:

```bash
# Supabase Staging Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

**⚠️ Importante**: Añade `.env.local` a tu `.gitignore` (ya debería estar)

---

## Paso 4: Configurar Base de Datos

### 4.1 Acceder al SQL Editor
1. En el menú lateral, ve a **"SQL Editor"**
2. Verás un editor de SQL donde puedes ejecutar queries

### 4.2 Crear Tablas
Copia y pega el siguiente script SQL (ejecuta todo de una vez):

```sql
-- ============================================
-- SISTEMA KOND - SCHEMA INICIAL
-- ============================================

-- Tabla: productos
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  tipo VARCHAR(100),
  medidas VARCHAR(100),
  tiempo_unitario VARCHAR(10), -- 'HH:MM:SS'
  publicado BOOLEAN DEFAULT false,
  hidden_in_productos BOOLEAN DEFAULT false,
  unidades_por_placa INTEGER,
  uso_placas INTEGER,
  costo_placa NUMERIC(10, 2),
  costo_material NUMERIC(10, 2),
  imagen_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: pedidos_catalogo
CREATE TABLE pedidos_catalogo (
  id SERIAL PRIMARY KEY,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_apellido VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_email VARCHAR(255),
  cliente_direccion TEXT,
  metodo_pago VARCHAR(50), -- 'transferencia' | 'whatsapp' | 'retiro'
  estado_pago VARCHAR(50) DEFAULT 'sin_seña',
  comprobante_url TEXT,
  comprobante_omitido BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_solicitud_entrega DATE,
  total NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: pedidos_catalogo_items
CREATE TABLE pedidos_catalogo_items (
  id SERIAL PRIMARY KEY,
  pedido_catalogo_id INTEGER REFERENCES pedidos_catalogo(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  producto_nombre VARCHAR(255),
  producto_precio NUMERIC(10, 2),
  cantidad INTEGER NOT NULL,
  medidas VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: pedidos_internos
CREATE TABLE pedidos_internos (
  id SERIAL PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  producto VARCHAR(255),
  cantidad INTEGER,
  fecha_entrega DATE,
  estado VARCHAR(50) DEFAULT 'pendiente',
  precio_unitario NUMERIC(10, 2),
  precio_total NUMERIC(10, 2),
  tiempo_estimado VARCHAR(10),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_productos_publicado ON productos(publicado);
CREATE INDEX idx_pedidos_catalogo_fecha ON pedidos_catalogo(fecha_creacion);
CREATE INDEX idx_pedidos_internos_estado ON pedidos_internos(estado);
CREATE INDEX idx_usuarios_username ON usuarios(username);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_catalogo_updated_at BEFORE UPDATE ON pedidos_catalogo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_internos_updated_at BEFORE UPDATE ON pedidos_internos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Haz clic en "Run"** (o Ctrl+Enter)

✅ Verás el mensaje "Success. No rows returned"

---

## Paso 5: Configurar Row Level Security (RLS)

### 5.1 ¿Qué es RLS?
Row Level Security permite controlar qué usuarios pueden acceder a qué filas de cada tabla.

### 5.2 Habilitar RLS
En el **SQL Editor**, ejecuta:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_catalogo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

### 5.3 Crear Políticas de Seguridad

```sql
-- ============================================
-- POLÍTICAS RLS - PRODUCTOS
-- ============================================

-- Productos: Lectura pública solo de publicados
CREATE POLICY "Lectura pública de productos publicados"
ON productos FOR SELECT
TO anon, authenticated
USING (publicado = true);

-- Productos: Admins pueden ver todos
CREATE POLICY "Admins ven todos los productos"
ON productos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- Productos: Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "Solo admins modifican productos"
ON productos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - PEDIDOS CATÁLOGO
-- ============================================

-- Pedidos catálogo: Cualquiera puede crear (público)
CREATE POLICY "Cualquiera puede crear pedidos catálogo"
ON pedidos_catalogo FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Pedidos catálogo: Solo admins pueden leer
CREATE POLICY "Solo admins leen pedidos catálogo"
ON pedidos_catalogo FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- Pedidos catálogo: Solo admins pueden actualizar
CREATE POLICY "Solo admins actualizan pedidos catálogo"
ON pedidos_catalogo FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - ITEMS PEDIDOS CATÁLOGO
-- ============================================

-- Items: Cualquiera puede insertar (junto con pedido)
CREATE POLICY "Cualquiera puede crear items de pedido"
ON pedidos_catalogo_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Items: Solo admins pueden leer
CREATE POLICY "Solo admins leen items de pedido"
ON pedidos_catalogo_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - PEDIDOS INTERNOS
-- ============================================

-- Pedidos internos: Solo admins
CREATE POLICY "Solo admins gestionan pedidos internos"
ON pedidos_internos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS RLS - USUARIOS
-- ============================================

-- Usuarios: Solo admins pueden leer/modificar
CREATE POLICY "Solo admins gestionan usuarios"
ON usuarios FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);
```

**Ejecuta todo el bloque**

---

## Paso 6: Crear Usuario Admin Inicial

### 6.1 Instalar bcrypt (en tu máquina local)
Abre una terminal y ejecuta:

```bash
npm install -g bcryptjs
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('TuContraseñaSegura123!', 10));"
```

Esto te dará un hash como:
```
$2a$10$XYZ123abcDEF456...
```

### 6.2 Insertar Admin en Supabase

En el **SQL Editor** de Supabase:

```sql
-- Crear usuario admin inicial
INSERT INTO usuarios (username, password_hash, rol)
VALUES (
  'admin',
  '$2a$10$TU_HASH_AQUI',  -- Reemplaza con el hash que generaste
  'admin'
);
```

✅ Ya tienes tu primer usuario admin

---

## Paso 7: Configurar Storage (Almacenamiento de Archivos)

### 7.1 Crear Buckets
1. En el menú lateral, ve a **"Storage"**
2. Haz clic en **"Create a new bucket"**

#### Bucket 1: `productos-imagenes`
- **Name**: `productos-imagenes`
- **Public bucket**: ✅ Marcado (las imágenes de productos son públicas)
- Haz clic en **"Create bucket"**

#### Bucket 2: `comprobantes-pago`
- **Name**: `comprobantes-pago`
- **Public bucket**: ❌ Sin marcar (los comprobantes son privados)
- Haz clic en **"Create bucket"**

### 7.2 Configurar Políticas de Storage

Ve al **SQL Editor** y ejecuta:

```sql
-- ============================================
-- POLÍTICAS STORAGE - productos-imagenes
-- ============================================

-- Permitir lectura pública
CREATE POLICY "Lectura pública de imágenes de productos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'productos-imagenes');

-- Solo admins pueden subir imágenes
CREATE POLICY "Solo admins suben imágenes de productos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'productos-imagenes'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- Solo admins pueden eliminar imágenes
CREATE POLICY "Solo admins eliminan imágenes de productos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'productos-imagenes'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS STORAGE - comprobantes-pago
-- ============================================

-- Cualquiera puede subir comprobantes
CREATE POLICY "Cualquiera puede subir comprobantes"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'comprobantes-pago');

-- Solo admins pueden leer comprobantes
CREATE POLICY "Solo admins leen comprobantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprobantes-pago'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()::integer
    AND usuarios.rol = 'admin'
  )
);
```

---

## Paso 8: Verificar Configuración

### 8.1 Revisar Tablas
1. Ve a **"Table Editor"** en el menú lateral
2. Deberías ver tus 5 tablas:
   - ✅ productos
   - ✅ pedidos_catalogo
   - ✅ pedidos_catalogo_items
   - ✅ pedidos_internos
   - ✅ usuarios

### 8.2 Revisar Storage
1. Ve a **"Storage"**
2. Deberías ver tus 2 buckets:
   - ✅ productos-imagenes (público)
   - ✅ comprobantes-pago (privado)

### 8.3 Probar Inserción Manual
En el **SQL Editor**, prueba insertar un producto de ejemplo:

```sql
INSERT INTO productos (
  nombre,
  categoria,
  tipo,
  medidas,
  publicado,
  costo_placa,
  costo_material
) VALUES (
  'Producto de Prueba',
  'Test',
  'Corporeo',
  '10x10cm',
  true,
  100.00,
  50.00
);

-- Verificar inserción
SELECT * FROM productos;
```

✅ Si ves el producto insertado, todo está funcionando correctamente

---

## Paso 9: Guardar Configuración

### 9.1 Crear archivo de respaldo

Crea un archivo `SUPABASE-CREDENTIALS.txt` **FUERA del repositorio Git**:

```
PROYECTO: sistema-kond-staging
FECHA: 6 nov 2025

PROJECT URL: https://xxxxxxxxxxxxxxxx.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE ROLE KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE PASSWORD: K0nd$St4g1ng2025!xYz

USUARIO ADMIN:
- Username: admin
- Password: TuContraseñaSegura123!

BUCKETS STORAGE:
- productos-imagenes (público)
- comprobantes-pago (privado)
```

### 9.2 Actualizar .env.local

Asegúrate de que tu archivo `.env.local` en Next.js tenga:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ Checklist Final

Antes de continuar, verifica que tienes:

- [ ] Proyecto Supabase creado y activo
- [ ] PROJECT URL guardada
- [ ] ANON KEY guardada
- [ ] SERVICE ROLE KEY guardada
- [ ] Archivo `.env.local` creado con las keys
- [ ] 5 tablas creadas (productos, pedidos_catalogo, pedidos_catalogo_items, pedidos_internos, usuarios)
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS creadas y funcionando
- [ ] Usuario admin creado
- [ ] 2 buckets Storage creados (productos-imagenes, comprobantes-pago)
- [ ] Políticas Storage configuradas
- [ ] Inserción de prueba exitosa

---

## 🎉 ¡Supabase Listo!

Ya tienes tu backend Supabase configurado. Ahora puedes continuar con:

**Siguiente paso**: Generar migraciones SQL (Paso 3 del plan de migración)

---

## 📚 Recursos Útiles

- **Documentación Supabase**: https://supabase.com/docs
- **SQL Editor**: Experimenta con queries en tiempo real
- **Table Editor**: Interfaz visual para ver/editar datos
- **API Docs**: Supabase genera documentación automática de tu API
- **Logs**: Monitorea errores y queries en tiempo real

---

**¿Necesitas ayuda?** Revisa la consola del navegador para errores de RLS o consulta los logs en Supabase Dashboard > Logs.
