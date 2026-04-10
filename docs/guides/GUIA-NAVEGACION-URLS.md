# Guía: Sistema de Navegación con URLs Amigables

## 📋 Descripción General

El sistema ahora utiliza la **History API** del navegador para proporcionar URLs amigables que reflejan la sección activa de la aplicación, mejorando la experiencia de usuario y permitiendo compartir enlaces a secciones específicas.

---

## 🎯 Características Implementadas

### 1. **URLs Reflejan la Sección Activa**
Antes:
```
index.html  (siempre igual, sin importar la sección)
```

Ahora:
```
index.html#/productos
index.html#/marketing
index.html#/pedidos
index.html#/finanzas
index.html#/database
index.html#/mi-cuenta
```

### 2. **Navegación con Botones del Navegador**
- ✅ El botón **Atrás** regresa a la sección anterior
- ✅ El botón **Adelante** avanza a la siguiente sección
- ✅ El historial se mantiene correctamente

### 3. **Títulos Dinámicos**
El título de la pestaña del navegador se actualiza según la sección:
- `Productos - Sistema KOND`
- `Marketing - Sistema KOND`
- `Pedidos - Sistema KOND`
- etc.

### 4. **Compartir URLs Específicas**
Ahora puedes:
- Copiar la URL de una sección específica
- Compartirla con otro usuario
- Al abrir el enlace, se carga directamente en esa sección

### 5. **Recarga de Página Preserva Sección**
Si recargas la página estando en "Marketing", volverás a "Marketing" (no a "Productos").

---

## 🔧 Implementación Técnica

### Archivo Modificado: `js/sidebar.js`

#### Función `showSection(name, updateHistory = true)`

**Parámetros:**
- `name`: Nombre de la sección (ej: 'productos', 'marketing')
- `updateHistory`: Boolean que indica si debe actualizar la URL (default: `true`)

**Comportamiento:**
```javascript
// Llamada normal desde sidebar - actualiza URL
showSection('marketing', true);

// Llamada desde navegación atrás/adelante - NO actualiza URL
showSection('marketing', false);
```

#### Listener `popstate`
Detecta cuando el usuario usa botones atrás/adelante:
```javascript
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.section) {
    showSection(event.state.section, false);
  }
});
```

#### Función `getInitialSection()`
Obtiene la sección inicial desde la URL:
```javascript
// Si la URL es: index.html#/marketing
// Retorna: 'marketing'

// Si no hay hash o es inválido
// Retorna: 'productos' (default)
```

---

## 🌐 Acceso Global

La función `showSection` está disponible globalmente:
```javascript
window.showSection = showSection;
```

Esto permite que otros módulos la usen:
```javascript
// Desde database.js
if (typeof showSection === 'function') {
  showSection('marketing');
}
```

---

## 📝 Ejemplos de Uso

### 1. Navegar desde JavaScript
```javascript
// Cambiar a sección Marketing y actualizar URL
window.showSection('marketing');

// Cambiar sin actualizar URL (uso interno)
window.showSection('productos', false);
```

### 2. Obtener Sección Actual
```javascript
const hash = window.location.hash; // "#/marketing"
const section = hash.replace('#/', ''); // "marketing"
```

### 3. Compartir URL de Sección
```html
<!-- Link directo a sección Marketing -->
<a href="index.html#/marketing">Ir a Marketing</a>
```

---

## 🧪 Casos de Prueba

### ✅ Prueba 1: Navegación por Sidebar
1. Abrir `index.html`
2. Click en "Marketing" en el sidebar
3. **Verificar:** URL cambia a `index.html#/marketing`
4. **Verificar:** Título cambia a "Marketing - Sistema KOND"

### ✅ Prueba 2: Botón Atrás del Navegador
1. Navegar: Productos → Marketing → Pedidos
2. Click en botón "Atrás" del navegador (2 veces)
3. **Verificar:** Regresa a Productos
4. **Verificar:** URL y contenido coinciden

### ✅ Prueba 3: Compartir URL
1. Navegar a Marketing
2. Copiar URL: `index.html#/marketing`
3. Pegar en nueva pestaña
4. **Verificar:** Abre directamente en Marketing

### ✅ Prueba 4: Recarga de Página
1. Navegar a Finanzas
2. Presionar F5 o Ctrl+R
3. **Verificar:** Permanece en Finanzas

### ✅ Prueba 5: URL Inválida
1. Escribir manualmente: `index.html#/seccion-inexistente`
2. **Verificar:** Carga la sección por defecto (Productos)

---

## 🔍 Debugging

### Ver Estado Actual
```javascript
// En consola del navegador:
console.log('Sección actual:', window.location.hash);
console.log('Estado history:', history.state);
```

### Ver Historial
```javascript
// El navegador mantiene un stack de estados
// Cada cambio de sección agrega un nuevo estado
console.log('Historia length:', history.length);
```

---

## ⚙️ Configuración

### Agregar Nueva Sección
Si creas una nueva sección, agrégala al objeto `sectionTitles`:

```javascript
// En sidebar.js, función showSection()
const sectionTitles = {
  'productos': 'Productos - Sistema KOND',
  'pedidos': 'Pedidos - Sistema KOND',
  'marketing': 'Marketing - Sistema KOND',
  'finanzas': 'Finanzas - Sistema KOND',
  'database': 'Base de Datos - Sistema KOND',
  'mi-cuenta': 'Mi Cuenta - Sistema KOND',
  'reportes': 'Reportes - Sistema KOND',
  'nueva-seccion': 'Nueva Sección - Sistema KOND'  // ← Agregar aquí
};
```

---

## 🚀 Ventajas del Sistema

1. **UX Mejorado:** URLs intuitivas y navegación natural
2. **Compartibilidad:** Links directos a secciones específicas
3. **SEO-Friendly:** URLs descriptivas (importante si se sube a servidor)
4. **Sin Recarga:** Navegación instantánea tipo SPA
5. **Historial:** Botones del navegador funcionan correctamente
6. **Accesibilidad:** Títulos descriptivos para lectores de pantalla

---

## 🔒 Compatibilidad

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ IE11 (requiere polyfill de History API)

---

## 📚 Referencias

- [MDN: History API](https://developer.mozilla.org/es/docs/Web/API/History_API)
- [MDN: pushState](https://developer.mozilla.org/es/docs/Web/API/History/pushState)
- [MDN: popstate event](https://developer.mozilla.org/es/docs/Web/API/Window/popstate_event)

---

## 📅 Última Actualización

**Fecha:** 19 de octubre de 2025  
**Versión:** 3.2  
**Autor:** Sistema KOND
