# Migración a Next.js - Sistema KOND

Este directorio contiene la nueva versión del Sistema KOND construida con Next.js para mejorar la escalabilidad, mantenibilidad y experiencia de desarrollo.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```powershell
cd next-app
npm install
```

### 2. Iniciar Servidor de Desarrollo

```powershell
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

### 3. Build para Producción

```powershell
npm run build
npm start
```

---

## 📁 Estructura del Proyecto

```
next-app/
├── components/          # Componentes React reutilizables
│   └── Layout.js       # Layout principal (Header + Sidebar)
├── pages/              # Páginas de la aplicación (rutas automáticas)
│   ├── _app.js         # App wrapper (estilos globales, tema)
│   ├── index.js        # Página de inicio
│   ├── catalog.js      # Catálogo de productos
│   └── marketing.js    # Marketing y promociones
├── styles/             # Estilos CSS
│   └── globals.css     # Estilos globales + sistema de temas
├── public/             # Archivos estáticos
│   └── css/            # CSS del proyecto original (para migración)
├── next.config.js      # Configuración de Next.js
├── package.json        # Dependencias y scripts
└── README.md           # Este archivo
```

---

## ✨ Características Implementadas

### ✅ Sistema de Temas (Claro/Oscuro)
- Toggle en el sidebar para cambiar entre modo claro y oscuro
- Persistencia en localStorage
- Variables CSS para fácil personalización

### ✅ Layout Responsivo
- Sidebar con navegación
- Diseño adaptable
- Estilos consistentes con el sistema original

### ✅ Routing Automático
- Next.js maneja las rutas automáticamente basándose en la estructura de `pages/`
- URLs limpias y amigables
- Navegación sin recarga de página

### ✅ Integración con Backend
- Configurado proxy API en `next.config.js` hacia `http://localhost:5000`
- Llamadas a `/api/*` se redirigen automáticamente al backend Express

---

## 🔄 Plan de Migración

### Fase 1: Infraestructura ✅
- [x] Configuración inicial de Next.js
- [x] Sistema de temas
- [x] Layout base con sidebar
- [x] Páginas placeholder

### Fase 2: Componentes Core (En Progreso)
- [ ] Migrar componentes de productos
- [ ] Migrar sistema de calendario
- [ ] Migrar gestión de pedidos
- [ ] Migrar sistema de promociones

### Fase 3: Funcionalidades Avanzadas
- [ ] Sistema de autenticación
- [ ] Gestión de imágenes optimizada
- [ ] Reportes y métricas
- [ ] Exportación de datos

### Fase 4: Optimización
- [ ] Server-Side Rendering (SSR) donde sea apropiado
- [ ] Optimización de imágenes con Next.js Image
- [ ] Code splitting automático
- [ ] PWA (Progressive Web App)

---

## 🔧 Configuración

### Backend API
El proyecto está configurado para conectarse al backend Express existente:
- **URL Backend:** `http://localhost:5000`
- **Proxy:** Configurado en `next.config.js`

Para cambiar la URL del backend, edita `next.config.js`:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://TU_BACKEND_URL/api/:path*'
    }
  ]
}
```

### Variables de Entorno (Futuro)
Crea un archivo `.env.local` para configuraciones sensibles:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 📝 Migración de Funcionalidades Existentes

### Reutilizar Lógica JavaScript
Muchas funciones de `js/` pueden ser reutilizadas:
- Copiar funciones utilitarias a un directorio `lib/` o `utils/`
- Adaptar código imperativo a React hooks cuando sea necesario
- Mantener localStorage para compatibilidad durante la transición

### Ejemplo: Migrar una función utilitaria

**Antes (js/utils.js):**
```javascript
function formatCurrency(value) {
  return `$${value.toFixed(2)}`
}
```

**Después (lib/formatters.js):**
```javascript
export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value)
}
```

---

## 🎨 Personalización de Estilos

Los estilos principales están en `styles/globals.css` usando CSS Variables:

```css
body[data-theme="dark"] {
  --bg-primary: #1c1f26;
  --text-primary: #e0e0e0;
  /* ... más variables */
}
```

Para agregar estilos específicos de componente:
1. Crear archivo CSS en `styles/`
2. Importar en el componente: `import styles from '../styles/MiComponente.module.css'`

---

## 🐛 Troubleshooting

### Error: "Cannot find module"
```powershell
rm -r node_modules
rm package-lock.json
npm install
```

### Puerto 3000 ocupado
Cambiar puerto en `package.json`:
```json
"dev": "next dev -p 3001"
```

### Backend no responde
Verificar que el backend esté corriendo:
```powershell
cd ../backend
npm start
```

---

## 📚 Recursos

- [Documentación Next.js](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Guía de Migración](../docs/guides/GUIA-NAVEGACION-URLS.md)

---

## 🤝 Contribuir

1. Crear branch para cada funcionalidad
2. Mantener compatibilidad con sistema existente durante transición
3. Documentar cambios en este README
4. Probar en modo desarrollo y producción

---

**Última actualización:** 20 de octubre de 2025  
**Versión:** 0.1.0 (Migración en progreso)

