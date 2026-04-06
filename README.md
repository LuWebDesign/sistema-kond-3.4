# Sistema KOND 3.4 - Sistema de Gestión de Producción

Sistema integral para gestión de productos, pedidos, calendario de producción, finanzas y marketing.

## 🎯 Características Principales

- **Gestión de Productos:** CRUD completo con catálogo público
- **Calendario de Producción:** Planificación visual de pedidos
- **Sistema de Pedidos:** Checkout público con múltiples métodos de pago
- **Marketing:** Promociones, cupones y badges dinámicos
- **Finanzas:** Control de ingresos, egresos y cierres de caja
- **Base de datos:** Supabase (nube) con fallback a localStorage

## 🚀 Tecnologías

- **Frontend:** HTML, CSS, JavaScript vanilla
- **Framework:** Next.js (en `next-app/`)
- **Base de datos:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (comprobantes e imágenes)
- **Autenticación:** Supabase Auth (opcional)

## 📂 Estructura del Proyecto

```
Sistema KOND 3.4/
├── index.html              # Dashboard administrativo
├── home.html               # Página principal
├── marketing.html          # Gestión de promociones
├── css/                    # Estilos por secciones
├── js/                     # Lógica frontend
│   ├── main.js            # Inicialización global
│   ├── utils.js           # Utilidades compartidas
│   ├── catalog.js         # Catálogo público (backup)
│   ├── products.js        # CRUD de productos
│   ├── calendar.js        # Calendario de producción
│   ├── marketing.js       # Sistema de promociones
│   ├── finanzas.js        # Módulo financiero
│   └── supabase-init.js   # Inicialización Supabase
├── supabase/              # Infraestructura Supabase
│   ├── client.js          # Cliente Supabase
│   ├── schema.sql         # Definiciones de tablas
│   ├── storage-buckets.sql # Configuración Storage
│   ├── migrate-data.js    # Script de migración
│   └── README.md          # Guía de configuración
├── next-app/              # Aplicación Next.js (migración progresiva)
└── backup-archivos-originales/ # Archivos históricos

```

## 🛠️ Instalación y Configuración

### Opción 1: HTML Estático (modo actual)

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repo>
   cd "Sistema KOND 3.4"
   ```

2. **Abrir en navegador:**
   - Abrir `index.html` para dashboard admin
   - Abrir `catalog.html` para catálogo público (en `backup-archivos-originales/`)

3. **Configurar Supabase (opcional pero recomendado):**
   ```bash
   # Ver instrucciones detalladas en:
   cat supabase/README.md
   ```

### Opción 2: Next.js App

1. **Instalar dependencias:**
   ```bash
   cd next-app
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp ../.env.example .env.local
   # Editar .env.local con tus credenciales de Supabase
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en navegador:**
   ```
   http://localhost:3000
   ```

## 🗄️ Configuración de Supabase

### Paso 1: Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Crear cuenta y nuevo proyecto
3. Anotar **URL** y **anon key**

### Paso 2: Ejecutar SQL

En el **SQL Editor** de Supabase:

```sql
-- 1. Crear tablas
-- Copiar y ejecutar contenido de: supabase/schema.sql

-- 2. Configurar Storage
-- Copiar y ejecutar contenido de: supabase/storage-buckets.sql
```

### Paso 3: Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_USE_SUPABASE=true
```

### Paso 4: Migrar datos (opcional)

Si tienes datos en localStorage:

```bash
# 1. Exportar desde navegador (ver instrucciones en migrate-data.js)
# 2. Ejecutar migración
node supabase/migrate-data.js
```

**📖 Guía completa:** `supabase/README.md`

## 📋 Modo de Uso

### Para Administradores

1. Abrir `index.html` o `http://localhost:3000/admin`
2. Gestionar productos, pedidos, calendario
3. Configurar promociones en sección Marketing
4. Revisar finanzas y reportes

### Para Clientes

1. Abrir catálogo público (configurar URL)
2. Agregar productos al carrito
3. Completar checkout con:
   - Transferencia (con comprobante)
   - WhatsApp (contacto directo)
   - Retiro en local

## 🔐 Seguridad

- **RLS habilitado** en todas las tablas Supabase
- **Escapado de HTML** en todas las interpolaciones (`escapeHtml()`)
- **Storage privado** para comprobantes de pago
- **Validación de inputs** en formularios críticos
- **Fallback automático** a localStorage si Supabase falla

## 📊 Estructura de Datos

### Tablas principales:

- `productos` — Catálogo de productos
- `pedidos` — Pedidos internos de producción
- `pedidos_catalogo` — Pedidos de clientes públicos
- `promociones` — Sistema de marketing
- `cupones` — Cupones de descuento
- `finanzas` — Movimientos financieros
- `registros` — Cierres de caja

**Ver schema completo:** `supabase/schema.sql`

## 🧪 Testing

```bash
# Ejecutar tests (si están configurados)
npm test

# Verificar errores de sintaxis
npm run lint
```

## 📝 Changelog

Ver archivos de cambios:
- `CHANGELOG-PROMOCIONES.md` — Historial de promociones
- `CHANGELOG-COLORES-PROMOCIONES.md` — Cambios de colores y badges
- `SISTEMA-NOTIFICACIONES-README.md` — Sistema de notificaciones por email
- `GUIA-DEPLOY-VERCEL.md` — Guía de deploy en Vercel

## 🆘 Troubleshooting

### "No se guardan los datos"
- Verificar configuración de Supabase en `.env.local`
- Comprobar que los scripts SQL se ejecutaron correctamente
- Revisar consola del navegador para errores

### "Quota exceeded" en localStorage
- Activar modo Supabase (`USE_SUPABASE=true`)
- Los comprobantes se subirán a Storage en vez de localStorage

### "Imágenes no se cargan"
- Verificar que el bucket `productos` es público
- Comprobar políticas de Storage en Supabase

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Todos los derechos reservados © 2026 LuWebDesign

## 👥 Autores

- **LuWebDesign** — [github.com/LuWebDesign](https://github.com/LuWebDesign)

## 📞 Soporte

Para dudas o soporte:
- Revisar `supabase/README.md`
- Consultar documentación en archivos MD del proyecto
- [Crear issue en el repositorio](https://github.com/LuWebDesign/sistema-kond-3.4/issues)

---

**¡Sistema listo para producción!** 🚀
