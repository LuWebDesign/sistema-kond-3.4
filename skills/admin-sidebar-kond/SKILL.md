---
name: admin-sidebar-kond
description: >
  Patrones del sidebar admin colapsable de sistema-kond-3.4.
  Cubre componentes NavIcon / NavLink / SectionDivider, CSS hover-expand,
  mobile hamburger y el gotcha crítico de clipping en Windows/Chrome.
  Trigger: Cuando se modifica, extiende o revisa next-app/components/Layout.js
  o cualquier navegación del panel admin.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Agregar o renombrar un ítem de navegación admin
- Modificar anchos, colores o transiciones del sidebar
- Debuggear texto visible cuando el sidebar está colapsado
- Revisar comportamiento mobile del menú admin

## Architecture

El sidebar es **CSS-only en desktop** (`:hover` expand) y **JS en mobile** (`sidebarOpen` state + hamburger).

```
Layout.js
├── NavIcon({ d, size })          → SVG helper, stroke-based
├── NavLink({ href, icon, label, badge, external, router })
├── SectionDivider({ label })
└── <aside className="sidebar">
      <div className="sidebar-logo">
      <nav>
      <div className="sidebar-bottom">
```

## Critical CSS Variables

```css
:root {
  --sidebar-w: 64px;           /* collapsed width */
  --sidebar-expanded-w: 260px; /* expanded width  */
}
```

## Hard Rules

**1. Icon centering — SIEMPRE usar `nav-icon-wrap`**

```css
.nav-icon-wrap {
  width: var(--sidebar-w);   /* 64px fijo */
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

El ícono SVG NUNCA va directo en `.nav-link` — siempre dentro de `<span className="nav-icon-wrap">`.

**2. Ocultar labels — `max-width: 0` + `opacity: 0` (NO sólo overflow-x: hidden)**

```css
/* INCORRECTO en Windows/Chrome — el texto se filtra igual */
.sidebar { overflow-x: hidden; }

/* CORRECTO — ocultar explícitamente en collapsed */
@media (min-width: 601px) {
  .sidebar .nav-label,
  .sidebar .nav-badge,
  .sidebar .nav-ext,
  .sidebar .nav-section-label,
  .sidebar .sidebar-logo-text {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 0.25s ease, opacity 0.15s ease;
  }
  .sidebar:hover .nav-label,
  .sidebar:hover .nav-badge,
  .sidebar:hover .nav-ext,
  .sidebar:hover .nav-section-label,
  .sidebar:hover .sidebar-logo-text {
    max-width: 200px;
    opacity: 1;
  }
}
```

**3. Pill highlight — usar `::before`, no background en el row**

```css
.nav-link::before {
  content: '';
  position: absolute;
  top: 2px; bottom: 2px;
  left: 8px; right: 8px;
  border-radius: 8px;
  background: transparent;
  transition: background 0.15s;
}
.nav-link:hover::before  { background: var(--bg-hover); }
.nav-link.active::before { background: rgba(59,130,246,0.15); }
```

Esto evita que el highlight se extienda más allá del área visible en collapsed.

**4. Rows — `min-width` + `gap: 0`**

```css
.nav-link {
  display: flex;
  align-items: center;
  gap: 0;                               /* sin gap, el wrap ya tiene 64px */
  padding: 3px 0;
  min-width: var(--sidebar-expanded-w); /* 260px — overflow clipped by sidebar */
  white-space: nowrap;
  position: relative;
}
```

**5. Active link detection**

```js
const isActive = href === '/admin/dashboard'
  ? router.pathname === href          // exact match para dashboard
  : router.pathname.startsWith(href)  // startsWith para todo lo demás
```

**6. Mobile — JS state, no CSS hover**

```js
const [sidebarOpen, setSidebarOpen] = useState(false)
// hamburger: display block sólo en @media (max-width: 600px)
// sidebar mobile: position fixed + transform: translateX(-100%) → translateX(0) when open
// mobile-overlay cierra al hacer click fuera
```

## Section Dividers

```jsx
<SectionDivider label="Gestión Interna" />
// Renders:
// <div class="nav-section">
//   <span class="nav-section-line" />   → tick de 24px, siempre visible
//   <span class="nav-section-label">Gestión Interna</span>  → oculto collapsed
// </div>
```

`.nav-section-line` tiene `width: var(--sidebar-w)` + `::after` (24px × 1px line centrada).

## Adding a New Nav Item

```jsx
<NavLink
  href="/admin/nueva-seccion"
  icon="M...path SVG..."   // stroke path de heroicons.com (outline, 24px)
  label="Nueva Sección"
  router={router}
/>
```

Para íconos multi-path: `icon={['M...path1', 'M...path2']}`.

## NEVER Rules

- NEVER poner `sidebarOpen` como trigger de expand en desktop — CSS `:hover` only
- NEVER usar `background` directo en `.nav-link` para el highlight — usar `::before`
- NEVER confiar en `overflow-x: hidden` solo para esconder texto — agregar `max-width: 0` explícito
- NEVER usar íconos emoji en nav — sólo SVG via `NavIcon`

## Files

| File | Role |
|------|------|
| `next-app/components/Layout.js` | Único source of truth del sidebar admin |
