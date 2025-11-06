# Inventario del Backend - Sistema KOND 3.4

**Fecha**: 6 de noviembre de 2025  
**Estado**: Backend inexistente — toda la persistencia usa `localStorage` del navegador  
**Objetivo**: Migrar persistencia a Supabase (PostgreSQL + Storage) y desplegar en Vercel

---

## 1. Estado Actual

### 📦 Backend Físico
**No existe carpeta `backend/`** — el sistema es 100% client-side con persistencia en `localStorage`.

### 🗄️ Modelos de Datos (localStorage)

Actualmente los datos se almacenan con estas claves:

#### 1.1 `productosBase` - Productos del Catálogo
```javascript
// Clave localStorage: 'productosBase'
{
  id: Number,                // autoincremental
  nombre: String,            // ej: "Cartel LED"
  categoria: String,         // ej: "Carteles"
  tipo: String,              // ej: "Corporeo"
  medidas: String,           // ej: "30x40cm"
  tiempoUnitario: String,    // formato 'HH:MM:SS'
  publicado: Boolean,        // visible en catálogo público
  hiddenInProductos: Boolean, // oculto en vista interna
  unidadesPorPlaca: Number,
  usoPlacas: Number,
  costoPlaca: Number,
  costoMaterial: Number,
  imagen: String             // dataURL base64 (puede ser pesado)
}
```

#### 1.2 `pedidosCatalogo` - Pedidos desde el Catálogo Público
```javascript
// Clave localStorage: 'pedidosCatalogo'
{
  id: Number,
  cliente: {
    nombre: String,
    apellido: String,         // opcional
    telefono: String,
    email: String,
    direccion: String          // opcional
  },
  items: [
    {
      idProducto: Number,
      name: String,
      price: Number,
      quantity: Number,
      measures: String
    }
  ],
  metodoPago: String,          // 'transferencia' | 'whatsapp' | 'retiro'
  estadoPago: String,          // 'sin_seña' | 'seña_pagada' | 'pagado'
  comprobante: String | null,  // dataURL base64 o null
  _comprobanteOmitted: Boolean, // flag si se omitió por cuota localStorage
  fechaCreacion: ISOString,
  fechaSolicitudEntrega: String | null, // 'YYYY-MM-DD' o null
  total: Number
}
```

#### 1.3 `pedidos` - Pedidos Internos / Producción
```javascript
// Clave localStorage: 'pedidos'
{
  id: Number,
  cliente: String,             // nombre simple
  producto: String,
  cantidad: Number,
  fechaEntrega: String,        // 'YYYY-MM-DD'
  estado: String,              // 'pendiente' | 'produccion' | 'entregado'
  precioUnitario: Number,
  precioTotal: Number,
  tiempoEstimado: String,      // 'HH:MM:SS'
  fechaCreacion: ISOString
}
```

#### 1.4 `cart` - Carrito del Catálogo Público
```javascript
// Clave localStorage: 'cart'
[
  {
    idProducto: Number,
    name: String,
    price: Number,
    quantity: Number,
    measures: String
  }
]
```

#### 1.5 `adminSession` - Sesión de Usuario Admin
```javascript
// Clave localStorage: 'adminSession'
{
  username: String,
  rol: String,                 // 'admin' | 'usuario'
  loggedIn: Boolean,
  loginTimestamp: ISOString
}
```

---

## 2. Estructura Propuesta en Supabase

### 📊 Tablas PostgreSQL

#### 2.1 `productos`
```sql
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
  imagen_url TEXT,             -- URL a Supabase Storage (en lugar de base64)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2 `pedidos_catalogo`
```sql
CREATE TABLE pedidos_catalogo (
  id SERIAL PRIMARY KEY,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_apellido VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_email VARCHAR(255),
  cliente_direccion TEXT,
  metodo_pago VARCHAR(50),     -- 'transferencia' | 'whatsapp' | 'retiro'
  estado_pago VARCHAR(50) DEFAULT 'sin_seña', -- 'sin_seña' | 'seña_pagada' | 'pagado'
  comprobante_url TEXT,        -- URL a Supabase Storage
  comprobante_omitido BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_solicitud_entrega DATE,
  total NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.3 `pedidos_catalogo_items`
```sql
CREATE TABLE pedidos_catalogo_items (
  id SERIAL PRIMARY KEY,
  pedido_catalogo_id INTEGER REFERENCES pedidos_catalogo(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  producto_nombre VARCHAR(255),  -- snapshot del nombre en el momento del pedido
  producto_precio NUMERIC(10, 2),
  cantidad INTEGER NOT NULL,
  medidas VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.4 `pedidos_internos`
```sql
CREATE TABLE pedidos_internos (
  id SERIAL PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  producto VARCHAR(255),
  cantidad INTEGER,
  fecha_entrega DATE,
  estado VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente' | 'produccion' | 'entregado'
  precio_unitario NUMERIC(10, 2),
  precio_total NUMERIC(10, 2),
  tiempo_estimado VARCHAR(10),  -- 'HH:MM:SS'
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.5 `usuarios`
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- usar bcrypt
  rol VARCHAR(50) DEFAULT 'usuario',    -- 'admin' | 'usuario'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.6 `sesiones_admin` (opcional — puede manejarse con JWT/Supabase Auth)
```sql
CREATE TABLE sesiones_admin (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  login_timestamp TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  token VARCHAR(512) UNIQUE
);
```

---

## 3. Almacenamiento de Archivos (Supabase Storage)

### Buckets requeridos:

1. **`productos-imagenes`**  
   - Guarda imágenes de productos  
   - Política: pública (lectura), autenticada (escritura)

2. **`comprobantes-pago`**  
   - Guarda comprobantes de transferencia  
   - Política: privada (solo admin puede leer)

---

## 4. API Endpoints a Crear

### 4.1 Productos
- `GET /api/productos` — Listar productos (filtro `publicado=true` para el catálogo)
- `POST /api/productos` — Crear producto (admin)
- `PATCH /api/productos/:id` — Actualizar producto (admin)
- `DELETE /api/productos/:id` — Eliminar producto (admin)
- `POST /api/productos/:id/imagen` — Subir imagen a Storage

### 4.2 Pedidos Catálogo
- `GET /api/pedidos-catalogo` — Listar pedidos (admin)
- `POST /api/pedidos-catalogo` — Crear pedido desde catálogo (público)
- `PATCH /api/pedidos-catalogo/:id` — Actualizar estado de pago (admin)
- `POST /api/pedidos-catalogo/:id/comprobante` — Subir comprobante (público o admin)

### 4.3 Pedidos Internos
- `GET /api/pedidos-internos` — Listar pedidos internos (admin)
- `POST /api/pedidos-internos` — Crear pedido interno (admin)
- `PATCH /api/pedidos-internos/:id` — Actualizar pedido (admin)
- `DELETE /api/pedidos-internos/:id` — Eliminar pedido (admin)

### 4.4 Autenticación
- `POST /api/auth/login` — Login usuario/admin
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Verificar sesión actual

---

## 5. Consideraciones Técnicas

### 🔒 Seguridad
- Usar **Row Level Security (RLS)** de Supabase para:
  - `productos`: lectura pública (publicado=true), escritura admin
  - `pedidos_catalogo`: lectura/escritura solo admin (excepto POST público)
  - `pedidos_internos`: lectura/escritura solo admin
  - `usuarios`: solo admin puede leer/escribir

### 📦 Migración de Imágenes Base64
- **Problema**: las imágenes actuales en `productosBase` y comprobantes en `pedidosCatalogo` están en base64 (pueden ser muy grandes)
- **Solución**: 
  1. Script de migración que:
     - Lee localStorage
     - Convierte base64 → Blob
     - Sube a Storage (`productos-imagenes`, `comprobantes-pago`)
     - Actualiza tabla Postgres con URL de Storage

### 📊 Volumen de Datos
- **Productos**: estimado 50-200 registros
- **Pedidos catálogo**: estimado 100-500/mes
- **Pedidos internos**: estimado 50-200/mes
- **Usuarios**: estimado 2-10

### 🛡️ Fallback y Compatibilidad
- Durante la transición, mantener localStorage como backup temporal
- Implementar sincronización bidireccional:
  - Al cargar: intentar fetch desde Supabase, si falla usar localStorage
  - Al guardar: intentar POST a Supabase, si falla guardar en localStorage y marcar para "sync pendiente"

---

## 6. Stack Técnico Propuesto

### Frontend (Next.js + Vercel)
- **Framework**: Next.js 16.0.1 (ya instalado)
- **Cliente Supabase**: `@supabase/supabase-js`
- **Auth**: Supabase Auth o JWT custom
- **Deployment**: Vercel

### Backend / Database (Supabase)
- **Base de Datos**: PostgreSQL (RLS habilitado)
- **Storage**: Supabase Storage para imágenes y PDFs
- **Auth**: Supabase Auth (integrado)
- **Funciones Edge**: opcional (para lógica compleja de servidor)

### Herramientas de Migración
- Script Node.js para exportar localStorage → Supabase
- CLI de Supabase para migraciones SQL

---

## 7. Plan de Ejecución

### ✅ Paso 1: Inventario del backend (COMPLETADO)
Este documento.

### 📝 Paso 2: Provisionar Supabase (staging)
- Crear proyecto Supabase staging
- Obtener URL, anon key, service_role key
- Configurar DB y Storage buckets
- Habilitar Auth

### 🗄️ Paso 3: Generar migraciones SQL
- Crear scripts SQL para tablas
- Configurar RLS policies
- Seed data inicial (usuarios admin)

### 🔧 Paso 4: Adaptar backend a Supabase
- Instalar `@supabase/supabase-js` en `next-app/`
- Crear cliente Supabase en `utils/supabaseClient.js`
- Crear API routes en `next-app/pages/api/`

### 🧪 Paso 5: Probar localmente con Supabase staging
- Configurar `.env.local` con keys de Supabase
- Ejecutar Next en dev y probar endpoints
- Validar RLS y autenticación

### 📦 Paso 6: Migrar datos existentes
- Crear script de migración localStorage → Supabase
- Ejecutar migración en staging
- Verificar integridad de datos

### 🚀 Paso 7: Desplegar backend/frontend a Vercel
- Configurar env vars en Vercel
- Conectar repo GitHub
- Deploy staging
- Verificar funcionalidad

### 🔄 Paso 8: Actualizar frontend Next
- Reemplazar localStorage calls con API calls a Supabase
- Implementar fallback temporal
- Probar flujos de usuario y admin

### 📈 Paso 9: Post-deploy
- Configurar backups automáticos en Supabase
- Configurar monitoreo (Sentry / Vercel Analytics)
- Actualizar CI/CD workflow de GitHub Actions

---

## 8. Notas y Advertencias

### ⚠️ Cuota de localStorage
- Actualmente si un pedido con comprobante excede la cuota de localStorage (~5MB), el sistema lo guarda sin el comprobante y marca `_comprobanteOmitted: true`
- **Con Supabase Storage, este límite desaparece** (hasta 50GB gratis tier)

### 🔐 Autenticación Actual
- Solo hay validación básica de `adminSession` en localStorage (no es segura)
- **Con Supabase Auth se implementará autenticación real** con JWT y hash de contraseñas (bcrypt)

### 📦 Imágenes de Productos
- Actualmente en base64 dentro de cada `producto`
- **Con Storage, URLs ligeras** → mejora performance del catálogo

---

**Fin del Inventario**  
**Próximo paso**: Provisionar Supabase staging (Item 2 del plan de migración)
