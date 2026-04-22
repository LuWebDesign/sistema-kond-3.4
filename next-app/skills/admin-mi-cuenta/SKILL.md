---
name: admin-mi-cuenta
description: >
  Diseño de "Mi Cuenta" para el panel de administración (/admin/mi-cuenta).
  Trigger: Cuando se necesite crear, modificar o mantener la página de Mi Cuenta del panel admin.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Modificar `/admin/mi-cuenta` (Mi Cuenta del panel admin)
- Agregar nuevas secciones a Mi Cuenta del admin
- Mantener consistencia visual con el diseño del panel de administración

## Layout

- **Componente**: `Layout` (import de `../../components/Layout`)
- **HOC**: `withAdminAuth` (protección de ruta)
- **Max width**: `640px`, centrado con `margin: 0 auto`
- **Padding**: `24px 20px`

## Estructura

### Header
- Título: `fontSize: 1.5rem, fontWeight: 700, color: var(--text-primary), marginBottom: 28px`
- Subtítulo: rol + email, `fontSize: 0.875rem, color: var(--text-secondary), marginTop: 4px`

### Tarjeta Colapsable
- Fondo card: `bg-card, border: 1px solid var(--border-color), borderRadius: 12px, overflow: hidden, marginBottom: 20px`
- Header colapsable: `background: var(--accent-blue), padding: 16px 20px, color: white, cursor: pointer`
- Hover: `opacity: 0.9`
- Flecha ▼ rota 180° cuando está expandido
- Estado inicial: **colapsado** (`isProfileExpanded = false`)

### Secciones internas (Datos Personales, Dirección)
- Cada sección: `bg-card, border: 1px solid var(--border-color), borderRadius: 12px, padding: 20px`
- Título sección: `fontSize: 0.8rem, fontWeight: 600, color: var(--text-muted), textTransform: uppercase, letterSpacing: 0.05em`
- Grid 2 columnas, gap `14px`
- Dirección: full width (`gridColumn: 1 / -1`)
- Observaciones: textarea, `resize: vertical, minHeight: 70px, maxHeight: 100px`

### Botones de Acción
- Alineados a la derecha, gap `10px`, paddingTop `8px`
- Cancelar: transparente con borde, cierra la sección
- Guardar: fondo `var(--accent-blue)`, color blanco
- Guardando: fondo `var(--text-muted)`, cursor not-allowed

## Input Style

```javascript
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box'
}
```

## Field Component

```javascript
function Field({ label, name, type = 'text', value, onChange, required, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
        {label}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} disabled={disabled} style={inputStyle} />
    </div>
  )
}
```

## State Management

```javascript
const [currentUser, setCurrentUser] = useState(null)
const [isProfileExpanded, setIsProfileExpanded] = useState(false)
const [formData, setFormData] = useState({
  email: '', password: '', nombre: '', apellido: '',
  telefono: '', direccion: '', localidad: '', cp: '',
  provincia: '', observaciones: ''
})
const [isLoading, setIsLoading] = useState(false)
```

## Auth Flow

1. Cargar sesión con `getCurrentSession()`
2. Rellenar formData con datos de la sesión
3. Al guardar:
   - Primero: `updateUserProfile(userId, formData)` → Supabase
   - Segundo: `localStorage.setItem('currentUser', ...)`
   - Tercero: `localStorage.setItem('kond-user', ...)`
   - Dispatch evento: `user:updated`
   - Toast de éxito
   - Colapsar sección (`setIsProfileExpanded(false)`)

## Auth Functions (utils/supabaseAuthV2)

- `getCurrentSession()` — Obtener sesión actual
- `updateUserProfile(userId, data)` — Actualizar perfil en Supabase

## Toast (utils/catalogUtils)

- `createToast(message, type)` — type: 'success' | 'error'

## Related Files

- `pages/admin/mi-cuenta.js` — Mi Cuenta admin
- `components/Layout.js` — Layout del admin
- `components/withAdminAuth.js` — HOC de protección
- `utils/supabaseAuthV2.js` — Funciones de autenticación
- `utils/catalogUtils.js` — createToast
