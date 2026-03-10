# 🗑️ GUÍA DE LIMPIEZA - Sistema KOND

## ✅ ARCHIVOS SEGUROS PARA ELIMINAR

### 📄 Páginas HTML Originales (Ya migradas a Next.js)
- `catalog.html` → Migrado a `next-app/pages/catalog.js`
- `dashboard.html` → Migrado a `next-app/pages/dashboard.js`
- `tracking.html` → Migrado a `next-app/pages/tracking.js`
- `user.html` → Migrado a `next-app/pages/user.js`
- `index.html` → Migrado a `next-app/pages/index.js`

### 📜 JavaScript Específico del Catálogo (Ya migrado)
- `js/catalog.js` → Funcionalidad en `next-app/pages/catalog.js`
- `js/catalog_backup_errors.js` → Ya no necesario
- `js/catalog-auth.js` → Migrado a `next-app/pages/user.js`
- `js/pedidos-catalogo.js` → Migrado a `next-app/pages/orders.js`

### 🎨 CSS Específico (Reemplazado por styles de Next.js)
- `css/catalog.css` → Reemplazado por `next-app/styles/catalog-next.css`
- `css/pedidos-catalogo.css` → Incluido en los components de Next.js

### 🧪 Archivos de Testing (Ya no necesarios)
- `test-calendario-dinamico.html`
- `test-diagnostico-catalogo.html`
- `test-pedidos.html`
- `test-promociones-multiples.html`

## ⚠️ ARCHIVOS QUE DEBES MANTENER

### 🎯 Sistema Migrado
- `next-app/` → **TODO EL DIRECTORIO** (Sistema nuevo)

### 🔧 Utilidades Compartidas
- `js/utils.js` → Funciones compartidas
- `js/products.js` → Gestión administrativa de productos
- `js/main.js` → Funciones administrativas generales
- `js/dashboard.js` → Dashboard administrativo (si se usa)
- `js/database.js` → Gestión de base de datos
- `js/finanzas.js` → Módulo de finanzas

### 🎨 Estilos Base
- `css/theme.css` → Variables CSS globales
- `css/reset.css` → Reset CSS base
- `css/sidebar.css` → Estilos del sidebar
- `css/topbar.css` → Estilos del topbar
- `css/modals.css` → Estilos de modales
- `css/cards.css` → Componentes de tarjetas

### 🚀 Backend (Si existe)
- `backend/` → **TODO EL DIRECTORIO**

### 📝 Documentación
- `*.md` → Archivos de documentación
- `README.md`
- `CHANGELOG-*.md`
- `GUIA-*.md`

## 🚨 IMPORTANTE ANTES DE ELIMINAR

1. **Hacer backup** del directorio completo
2. **Verificar** que Next.js funciona correctamente
3. **Confirmar** que tus datos en localStorage están intactos
4. **Probar** todas las funcionalidades críticas

## 📋 COMANDO DE LIMPIEZA SUGERIDO

Si quieres eliminar los archivos de forma batch, puedes usar:

```batch
REM Crear backup primero
mkdir backup
xcopy *.html backup\ /Y
xcopy js\catalog*.js backup\ /Y
xcopy css\catalog*.css backup\ /Y

REM Eliminar archivos migrados
del catalog.html
del dashboard.html
del tracking.html
del user.html
del test-*.html
del js\catalog.js
del js\catalog_backup_errors.js
del js\catalog-auth.js
del js\pedidos-catalogo.js
del css\catalog.css
del css\pedidos-catalogo.css
```

## 📊 RESULTADO ESPERADO

Después de la limpieza tendrás:
- **~50% menos archivos** en el directorio principal
- **Solo el sistema Next.js** para funcionalidad web
- **Archivos administrativos** para gestión interna
- **Documentación** preservada
- **Backend** intacto (si existe)

## 🎉 SIGUIENTE PASO

Una vez limpio, tu estructura quedará:
```
sistema 3.2 - con cambios/
├── next-app/           ← Sistema web principal
├── backend/            ← API (si existe)
├── js/                 ← Solo utilidades y admin
├── css/                ← Solo estilos base
└── docs/               ← Documentación
```