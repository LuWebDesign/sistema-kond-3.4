# Guía de Migración Progresiva a Next.js

## 📋 Objetivo

Migrar el Sistema KOND desde una SPA estática (HTML/CSS/JS vanilla) a Next.js para mejorar:
- **Escalabilidad**: Mejor organización del código y reutilización de componentes
- **Mantenibilidad**: Código más fácil de entender y modificar
- **Performance**: Optimizaciones automáticas de Next.js
- **Developer Experience**: Hot reload, TypeScript ready, mejor tooling

---

## 🎯 Estrategia de Migración

### Enfoque: Big Bang vs. Incremental

✅ **Elegimos Migración Incremental**:
- El sistema actual sigue funcionando durante la migración
- Podemos probar cada parte antes de migrar la siguiente
- Menor riesgo de romper funcionalidad crítica
- Equipo puede familiarizarse con Next.js gradualmente

---

## 📊 Estado Actual vs. Objetivo

### Sistema Actual (HTML/CSS/JS)
```
index.html
├── Sidebar navigation (js/sidebar.js)
├── Multiple sections (hidden/shown)
│   ├── Productos
│   ├── Pedidos
│   ├── Marketing
│   ├── Finanzas
│   └── Base de Datos
├── localStorage para persistencia
└── Backend separado (Express.js)
```

### Sistema Objetivo (Next.js)
```
next-app/
├── pages/ (rutas automáticas)
│   ├── index.js (dashboard)
│   ├── productos.js
│   ├── pedidos.js
│   ├── marketing.js
│   ├── finanzas.js
│   └── database.js
├── components/ (reutilizables)
├── lib/ (lógica compartida)
├── styles/ (CSS modular)
└── API integration
```

---

## 🔄 Fases de Migración

### Fase 1: Infraestructura ✅ COMPLETADA

**Objetivo**: Tener un esqueleto funcional de Next.js

**Tareas completadas**:
- [x] Inicializar proyecto Next.js
- [x] Configurar sistema de temas (claro/oscuro)
- [x] Crear Layout base con sidebar
- [x] Configurar proxy a backend
- [x] Páginas placeholder para todas las secciones

**Archivos creados**:
```
next-app/
├── package.json           # Dependencias Next.js
├── next.config.js         # Config + proxy backend
├── pages/_app.js          # App wrapper + tema
├── pages/index.js         # Home
├── components/Layout.js   # Layout principal
├── styles/globals.css     # Estilos + variables CSS
└── README.md              # Documentación
```

---

### Fase 2: Migración de Utilidades 🔄 EN PROGRESO

**Objetivo**: Portar funciones utilitarias reutilizables

**Tareas**:
1. Crear directorio `lib/` para utilidades
2. Migrar funciones de `js/utils.js`:
   - [ ] `formatCurrency()`
   - [ ] `escapeHtml()`
   - [ ] `timeToMinutes()` y `minutesToTime()`
   - [ ] `fileToBase64()`
3. Migrar funciones de `js/calculations.js`:
   - [ ] `updateFormCalculatedFields()`
   - [ ] Lógica de cálculo de precios
4. Crear tests unitarios para cada utilidad

**Ejemplo de migración**:

**Antes (js/utils.js)**:
```javascript
function formatCurrency(value) {
  return `$${value.toFixed(2)}`
}
```

**Después (lib/formatters.js)**:
```javascript
export function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value)
}
```

---

### Fase 3: Componentes de Productos 📦

**Objetivo**: Migrar gestión de productos

**Tareas**:
1. Crear `pages/productos.js`
2. Componentes necesarios:
   - [ ] `ProductCard.js` - Tarjeta de producto
   - [ ] `ProductForm.js` - Formulario agregar/editar
   - [ ] `ProductList.js` - Lista con filtros
   - [ ] `ProductMetrics.js` - Métricas y totales
3. Hooks personalizados:
   - [ ] `useProducts.js` - Gestión de estado de productos
   - [ ] `useFilters.js` - Filtrado y búsqueda
4. Migrar lógica de `js/products.js`

**API Integration**:
```javascript
// pages/api/productos/index.js (API Routes de Next.js)
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Fetch productos del backend o localStorage
  } else if (req.method === 'POST') {
    // Crear producto
  }
}
```

---

### Fase 4: Sistema de Calendario 📅

**Objetivo**: Migrar calendario de producción

**Tareas**:
1. Crear `pages/calendario.js`
2. Componentes:
   - [ ] `Calendar.js` - Vista de calendario
   - [ ] `DayCell.js` - Celda de día con pedidos
   - [ ] `PedidoModal.js` - Modal para crear/editar
3. Migrar lógica de `js/calendar.js`
4. Integrar con productos existentes

**Consideraciones**:
- Usar biblioteca como `react-big-calendar` o `fullcalendar`
- Mantener compatibilidad con localStorage durante transición

---

### Fase 5: Pedidos y Gestión 📋

**Objetivo**: Migrar sistema de pedidos

**Tareas**:
1. Crear `pages/pedidos.js`
2. Componentes:
   - [ ] `PedidoCard.js`
   - [ ] `PedidosList.js`
   - [ ] `PedidosFilters.js`
   - [ ] `EstadoPedido.js`
3. Migrar de `js/pedidos.js` y `js/pedidos-catalogo.js`

---

### Fase 6: Marketing y Promociones 🎯

**Objetivo**: Migrar sistema de marketing

**Tareas**:
1. Mejorar `pages/marketing.js`
2. Componentes:
   - [ ] `PromoCard.js` - Tarjeta de promoción
   - [ ] `PromoForm.js` - Formulario crear/editar
   - [ ] `BadgeConfigurator.js` - Configurador de badges
   - [ ] `ColorPicker.js` - Selector de colores
3. Migrar lógica de `js/marketing.js` y `js/promo-engine.js`

**Features importantes**:
- Sistema de colores personalizado
- Preview en tiempo real
- Badges con auto-contraste

---

### Fase 7: Catálogo Público 🛒

**Objetivo**: Migrar catálogo público y checkout

**Tareas**:
1. Mejorar `pages/catalog.js`
2. Componentes:
   - [ ] `ProductGrid.js`
   - [ ] `ProductCard.js` (versión pública)
   - [ ] `ShoppingCart.js`
   - [ ] `CheckoutFlow.js`
3. Migrar de `catalog.html` y `js/catalog.js`

**Features**:
- Filtros por categoría
- Carrito de compras
- Checkout con métodos de pago
- Calendario de entrega

---

### Fase 8: Autenticación y Usuarios 🔐

**Objetivo**: Sistema de autenticación robusto

**Tareas**:
1. Implementar autenticación (NextAuth.js o JWT)
2. Páginas:
   - [ ] `pages/login.js`
   - [ ] `pages/register.js`
   - [ ] `pages/mi-cuenta.js`
3. Middleware de protección de rutas
4. Integrar con backend existente

---

### Fase 9: Optimizaciones ⚡

**Objetivo**: Aprovechar features de Next.js

**Tareas**:
1. **Imágenes**:
   - [ ] Migrar a `next/image` para optimización automática
   - [ ] Implementar lazy loading
2. **Performance**:
   - [ ] Análisis con Lighthouse
   - [ ] Code splitting automático
   - [ ] Prefetching de rutas
3. **SEO**:
   - [ ] Meta tags por página
   - [ ] Open Graph tags
   - [ ] Sitemap dinámico

---

### Fase 10: Testing y Deployment 🚀

**Objetivo**: Producción ready

**Tareas**:
1. **Testing**:
   - [ ] Tests unitarios (Jest)
   - [ ] Tests de integración (React Testing Library)
   - [ ] Tests E2E (Playwright)
2. **Deployment**:
   - [ ] Build de producción
   - [ ] Deploy a Vercel/Netlify/otro
   - [ ] CI/CD pipeline
3. **Documentación**:
   - [ ] Guías de uso
   - [ ] Documentación de API
   - [ ] Changelog

---

## 🛠️ Herramientas y Librerías Recomendadas

### State Management
- **React Context API** (para estado simple)
- **Zustand** (alternativa ligera a Redux)
- **React Query** (para datos del servidor)

### UI Components
- **Headless UI** (componentes accesibles sin estilos)
- **Radix UI** (primitivas UI de alta calidad)
- Mantener CSS custom existente

### Forms
- **React Hook Form** (manejo de formularios performante)
- **Zod** (validación de schemas)

### Date/Time
- **date-fns** (manipulación de fechas)
- Migrar lógica custom de calendario

### Charts/Metrics
- **Recharts** (gráficos React)
- **Victory** (alternativa)

---

## 📝 Checklist por Feature

Al migrar cada funcionalidad, verificar:

- [ ] **Funcionalidad**: ¿Funciona igual o mejor que antes?
- [ ] **Performance**: ¿Es rápido? ¿Hay lag?
- [ ] **Responsive**: ¿Funciona en mobile/tablet?
- [ ] **Accesibilidad**: ¿Navegable con teclado? ¿Screen reader friendly?
- [ ] **Testing**: ¿Tiene tests?
- [ ] **Documentación**: ¿Está documentado el código?
- [ ] **Migración de datos**: ¿localStorage/backend funcionan?

---

## 🎨 Guía de Estilo para Componentes

### Estructura de Componente
```javascript
// components/ProductCard.js
import { useState } from 'react'
import styles from './ProductCard.module.css'

export default function ProductCard({ producto, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={styles.card}>
      {/* Contenido */}
    </div>
  )
}
```

### Naming Conventions
- **Componentes**: PascalCase (`ProductCard.js`)
- **Hooks**: camelCase con prefijo `use` (`useProducts.js`)
- **Utilidades**: camelCase (`formatCurrency.js`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_PRODUCTS`)

---

## 🐛 Problemas Comunes y Soluciones

### localStorage no disponible en SSR
```javascript
// ❌ Mal
const data = localStorage.getItem('key')

// ✅ Bien
const [data, setData] = useState(null)
useEffect(() => {
  setData(localStorage.getItem('key'))
}, [])
```

### Eventos del cliente en Server Components
```javascript
// Agregar 'use client' al inicio del archivo
'use client'

import { useState } from 'react'
// ... resto del componente
```

### CSS no se aplica
```javascript
// Asegurarse de importar correctamente
import styles from './Component.module.css'
// Usar: className={styles.nombreClase}
```

---

## 📚 Recursos de Aprendizaje

### Next.js
- [Documentación oficial](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)

### React
- [React Docs (nueva)](https://react.dev)
- [React Hooks](https://react.dev/reference/react)

### Patrones
- [Patterns.dev](https://www.patterns.dev/)
- [React Patterns](https://reactpatterns.com/)

---

## 🤝 Mejores Prácticas

1. **Commits frecuentes**: Commit pequeños y descriptivos
2. **Tests primero**: Escribir tests antes de migrar (TDD)
3. **Documentar decisiones**: Comentar por qué se tomó un approach
4. **Code review**: Revisar cambios antes de mergear
5. **Mantener compatibilidad**: No romper sistema actual durante migración

---

## 📅 Timeline Estimado

| Fase | Duración Estimada | Prioridad |
|------|-------------------|-----------|
| 1. Infraestructura | ✅ Completado | Alta |
| 2. Utilidades | 1 semana | Alta |
| 3. Productos | 2 semanas | Alta |
| 4. Calendario | 2 semanas | Media |
| 5. Pedidos | 2 semanas | Alta |
| 6. Marketing | 1 semana | Media |
| 7. Catálogo | 2 semanas | Alta |
| 8. Auth | 1 semana | Media |
| 9. Optimización | 1 semana | Baja |
| 10. Testing | 2 semanas | Alta |

**Total estimado**: 10-14 semanas (ajustable según recursos)

---

**Última actualización**: 20 de octubre de 2025  
**Mantenido por**: Equipo Sistema KOND