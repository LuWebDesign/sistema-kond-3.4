---
name: theme-centralized
description: >
  Sistema de temas centralizado para el admin de sistema-kond-3.4.
  Usa data-theme del body, CSS variables, y script inline en _document.js para evitar flash.
  Trigger: Cuando se agrega/modifica dark mode en páginas admin.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Agregar soporte de tema a una nueva página admin
- Arreglar flash de tema al cargar una página
- Unificar páginas que usan lógica de tema propia
- Crear nuevos módulos CSS con soporte dark/light

## How It Works

El sistema tiene tres partes:

1. **_document.js** — Script inline que aplica el tema ANTES de que React cargue
2. **Layout.js** — Lee el tema del body (ya configurado) y provee toggle
3. **CSS modules** — Usan CSS vars (`--bg-card`, `--text-primary`, etc.)

## Flash Prevention

```javascript
// _document.js — se ejecuta antes que cualquier JS
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      var theme = localStorage.getItem('theme') || 'dark';
      document.body.setAttribute('data-theme', theme);
    })();
  `
}} />
```

## Page-Level Theme Detection

```javascript
// Correcto: leer del body (sistema centralizado)
const isDarkMode = typeof window !== 'undefined' 
  && document.body.getAttribute('data-theme') !== 'light'

// Incorrecto: NO usar estado propio
const [darkMode, setDarkMode] = useState(false) // ❌
localStorage.getItem('finanzas_dark') // ❌
```

## CSS Variables

```css
/* theme.css / globals.css */
[data-theme="dark"] {
  --bg-primary: #1c1f26;
  --bg-secondary: #252a32;
  --bg-card: #2a2a2a;
  --text-primary: #e0e0e0;
  --text-secondary: #cfcfcf;
  --border-color: rgba(255, 255, 255, 0.05);
}

[data-theme="light"] {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-card: #e6eaee;
  --text-primary: #1a1a1a;
  --text-secondary: #333333;
}
```

## Toggle Theme

```javascript
// En Layout.js
const toggleTheme = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark'
  document.body.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}
```

## Common Issues

- **Flash azul al cargar**: Falta el script en `_document.js`
- **Tema no persiste**: El estado inicial es hardcodeado `'dark'` en lugar de leer del body
- **Colores distintos**: El CSS usa colores hardcodeados en lugar de CSS vars