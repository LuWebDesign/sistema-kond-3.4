# 🔍 ANÁLISIS COMPLETO: localStorage vs Supabase

**Fecha:** 7 de noviembre de 2025  
**Estado:** En migración progresiva

---

## 📊 RESUMEN EJECUTIVO

### ✅ Ya Migrado a Supabase (con fallback a localStorage)
- ✅ `productos` - CRUD completo con Storage
- ✅ `pedidos_catalogo` - Sistema híbrido funcional
- ✅ `materiales` - Con proveedores normalizados
- ✅ `promociones` - Sistema de cupones
- ✅ `usuarios` - Autenticación con bcrypt

### ⚠️ Parcialmente Migrado (usa localStorage como fallback)
- ⚠️ `pedidos internos` (key: 'pedidos') - Funcionalidad híbrida
- ⚠️ `finanzas` (key: 'finanzas') - Gastos e ingresos

### ✅ Debe Permanecer en localStorage (preferencias del usuario)
- ✅ `theme` - Tema dark/light
- ✅ `cart` - Carrito temporal del catálogo
- ✅ `currentUser` - Datos temporales de sesión pública
- ✅ `adminSession` - Sesión temporal admin (migrando a Supabase Auth)
- ✅ `kond-user` - Usuario autenticado (Supabase Auth)
- ✅ `notifications` - Notificaciones del sistema

---

## 🔴 PRIORIDAD ALTA: Archivos que AÚN usan localStorage exclusivamente

### 1. **Pedidos Internos** (`pedidos`)
**Archivos afectados:**
- `pages/calendar.js` (líneas 65-67, 322, 1415, 1417)
- `pages/dashboard.js` (línea 31)
- `pages/admin.js` (línea 25)
- `pages/pedidos-catalogo.js` (líneas 1191, 1211)
- `hooks/useCatalog.js` (líneas 763, 775, 788, 799, 804, 815, 818)
- `utils/catalogUtils.js` (línea 57)
- `components/PedidosModal.js`

**Funcionalidades:**
- Crear pedidos internos de producción
- Calcular capacidad del calendario
- Generar pedidos desde el catálogo
- Vista de dashboard con métricas

**Estado:** ❌ 100% localStorage
**Tabla Supabase:** `pedidos_internos` (existe pero vacía)
**Acción requerida:** Migrar CRUD completo a `supabasePedidos.js`

---

### 2. **Finanzas** (`finanzas`)
**Archivos afectados:**
- `utils/finanzasUtils.js` (líneas 31, 59, 95, 100, 125, 131, 156, 174, 175, 223, 240)

**Funcionalidades:**
- Registrar gastos
- Registrar ingresos
- Calcular márgenes y reportes
- Sincronizar con pedidos del catálogo

**Estado:** ❌ 100% localStorage
**Tablas Supabase:** `gastos`, `ingresos` (existen pero vacías)
**Acción requerida:** 
1. Implementar CRUD en `supabaseFinanzas.js` (ya existe)
2. Actualizar `finanzasUtils.js` para usar Supabase

---

### 3. **Productos Base** (`productosBase`)
**Archivos que aún leen de localStorage:**
- `pages/pedidos-catalogo.js` (líneas 321, 354)
- `pages/dashboard.js` (línea 27)
- `pages/admin.js` (línea 22)
- `components/PedidosModal.js` (líneas 51, 129, 155)
- `components/PedidoCard.js` (línea 52)
- `utils/catalogUtils.js` (línea 58)
- `hooks/useCatalog.js` (línea 152)
- `pages/calendar.js` (línea 66)

**Estado:** ⚠️ Parcialmente migrado
**Tabla Supabase:** `productos` (1 registro)
**Módulo:** `supabaseProductos.js` (existe y funcional)
**Acción requerida:** Reemplazar lecturas de localStorage por llamadas a Supabase

---

### 4. **Materiales** (`materiales`)
**Archivos que aún leen de localStorage:**
- `pages/pedidos-catalogo.js` (líneas 347, 355)
- `pages/calendar.js` (líneas 662, 667)
- `components/PedidosModal.js` (línea 130)
- `components/PedidoCard.js` (línea 104)
- `pages/catalog.js` (línea 426)

**Estado:** ⚠️ Parcialmente migrado
**Tabla Supabase:** `materiales` (1 registro)
**Módulo:** `supabaseMateriales.js` (existe y funcional)
**Acción requerida:** Reemplazar lecturas de localStorage por llamadas a Supabase

---

### 5. **Pedidos Catálogo** (`pedidosCatalogo`)
**Archivos que aún leen/escriben localStorage:**
- `pages/pedidos-catalogo.js` (múltiples líneas)
- `pages/dashboard.js` (línea 35)
- `pages/admin.js` (línea 26)
- `components/PedidosModal.js` (línea 17)
- `hooks/useCatalog.js` (sistema híbrido implementado)
- `utils/finanzasUtils.js` (línea 175)
- `pages/calendar.js` (línea 67)

**Estado:** ✅ Sistema híbrido funcional (Supabase primero, fallback a localStorage)
**Tabla Supabase:** `pedidos_catalogo` (5 registros)
**Módulo:** `supabasePedidos.js` (existe y funcional)
**Acción requerida:** Convertir más páginas para usar el sistema híbrido

---

## 🟢 PRIORIDAD MEDIA: Autenticación

### 6. **Sesión Admin** (`adminSession`)
**Archivos afectados:**
- `components/Layout.js` (líneas 38, 65, 72)
- `pages/admin.js` (línea 63)
- `pages/admin-login.js` (línea 54)
- `utils/catalogUtils.js` (líneas 314, 329, 352)

**Estado:** ⚠️ En migración
**Sistema actual:** localStorage con token temporal
**Sistema nuevo:** Supabase Auth + JWT
**Módulos:** `supabaseAuth.js`, `supabaseAuthV2.js` (existen)
**Acción requerida:** Completar migración a Supabase Auth

---

## 🟢 OK: Debe permanecer en localStorage

### 7. **Preferencias de Usuario**
- ✅ `theme` - Tema visual (dark/light)
- ✅ `cart` - Carrito temporal de compras
- ✅ `currentUser` - Datos temporales del usuario público
- ✅ `notifications` - Notificaciones del sistema
- ✅ `kond-user` - Sesión local de Supabase Auth

**Razón:** Son datos de sesión local, no necesitan sincronización entre dispositivos.

---

## 📋 PLAN DE MIGRACIÓN RECOMENDADO

### Fase 1: Pedidos Internos (Alta prioridad)
**Impacto:** 🔴 Alto - Afecta calendario y producción
**Archivos a modificar:** 10+
**Pasos:**
1. Completar CRUD en `supabasePedidos.js` para pedidos internos
2. Crear hook `usePedidosInternos()` en `hooks/useCatalog.js`
3. Actualizar `pages/calendar.js` para usar Supabase
4. Actualizar `pages/internal-orders.js`
5. Actualizar `components/PedidosModal.js`
6. Probar flujo completo de creación/edición/eliminación

**Estimación:** 4-6 horas

---

### Fase 2: Finanzas
**Impacto:** 🟡 Medio - Módulo independiente
**Archivos a modificar:** 2-3
**Pasos:**
1. Verificar que `supabaseFinanzas.js` tiene CRUD completo
2. Actualizar `finanzasUtils.js` para usar Supabase
3. Implementar sistema híbrido (como en pedidos catálogo)
4. Probar en página de finanzas

**Estimación:** 2-3 horas

---

### Fase 3: Consolidar Productos y Materiales
**Impacto:** 🟡 Medio - Ya migrado, solo consolidar
**Archivos a modificar:** 15+
**Pasos:**
1. Buscar y reemplazar todas las lecturas de `localStorage.getItem('productosBase')`
2. Usar `supabaseProductos.js` en todos los archivos
3. Buscar y reemplazar `localStorage.getItem('materiales')`
4. Usar `supabaseMateriales.js` en todos los archivos
5. Probar cada módulo afectado

**Estimación:** 3-4 horas

---

### Fase 4: Autenticación (Opcional)
**Impacto:** 🟢 Bajo - Sistema actual funciona
**Pasos:**
1. Migrar completamente a Supabase Auth
2. Eliminar `adminSession` de localStorage
3. Usar tokens JWT de Supabase
4. Actualizar middleware de autenticación

**Estimación:** 2-3 horas

---

## 📈 MÉTRICAS DE MIGRACIÓN

### Estado Actual
- **Tablas migradas:** 5/5 (100%)
- **Módulos con CRUD Supabase:** 5/5 (100%)
- **Páginas usando Supabase:** ~40%
- **Dependencia localStorage:** ~60%

### Después de Fase 1-3
- **Tablas migradas:** 5/5 (100%)
- **Módulos con CRUD Supabase:** 5/5 (100%)
- **Páginas usando Supabase:** ~90%
- **Dependencia localStorage:** ~10% (solo preferencias)

---

## 🎯 ARCHIVOS CLAVE POR MÓDULO

### Pedidos Internos
1. `pages/calendar.js` - Vista principal
2. `pages/internal-orders.js` - Gestión de pedidos
3. `hooks/useCatalog.js` - Lógica del estado
4. `components/PedidosModal.js` - Modal de creación/edición

### Finanzas
1. `pages/finanzas.js` - Vista principal
2. `utils/finanzasUtils.js` - Lógica de negocio
3. `utils/supabaseFinanzas.js` - CRUD (ya existe)

### Productos
1. `pages/products.js` - Vista principal
2. `pages/database.js` - Gestión masiva
3. `utils/supabaseProductos.js` - CRUD (ya existe)

### Materiales
1. `pages/materiales.js` - Vista principal
2. `utils/supabaseMateriales.js` - CRUD (ya existe)

---

## ✅ CHECKLIST DE VALIDACIÓN

### Por cada módulo migrado:
- [ ] CRUD completo en Supabase
- [ ] Sistema híbrido con fallback a localStorage
- [ ] Manejo de errores de red
- [ ] Manejo de errores de autenticación
- [ ] Actualización de UI en tiempo real
- [ ] Pruebas de carga con múltiples registros
- [ ] Pruebas sin conexión (offline)
- [ ] Migración de datos existentes en localStorage

---

## 🚨 RIESGOS Y CONSIDERACIONES

1. **Pérdida de datos:** Implementar sistema híbrido antes de eliminar localStorage
2. **Offline:** Mantener fallback a localStorage para UX sin conexión
3. **Performance:** Cache local para reducir llamadas a Supabase
4. **RLS Policies:** Verificar permisos antes de cada operación
5. **Migración de datos:** Script para migrar localStorage → Supabase

---

**Última actualización:** 7 de noviembre de 2025
