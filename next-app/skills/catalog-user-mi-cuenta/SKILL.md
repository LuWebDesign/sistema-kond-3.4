---
name: catalog-user-mi-cuenta
description: >
  Diseño de "Mi Cuenta" para usuarios del catálogo público (/catalog/user y /catalog/user/perfil).
  Trigger: Cuando se necesite crear, modificar o mantener la página de Mi Cuenta o Editar Perfil del catálogo público.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Modificar `/catalog/user` (Mi Cuenta del catálogo público)
- Modificar `/catalog/user/perfil` (Editar Perfil del catálogo)
- Crear nuevas secciones dentro de Mi Cuenta del catálogo
- Mantener consistencia visual con el diseño actual del catálogo

## Layout

- **Componente**: `PublicLayout` (import de `../../../components/PublicLayout`)
- **Max width**: `640px`, centrado con `margin: 0 auto`
- **Padding**: `24px 20px`

---

## Página 1: /catalog/user — Mi Cuenta

### Estructura: Usuario Logueado

#### 1. Header
- `display: flex, justifyContent: space-between, alignItems: center, marginBottom: 32px`
- Título: `fontSize: 1.5rem, fontWeight: 700, color: var(--text-primary)`
- Botón cerrar sesión: clase `btn-ghost`, estilo minimal con borde

#### 2. Profile Card
- Avatar circular: `56x56px`, fondo `var(--accent-blue)`, inicial del nombre
- Nombre: `fontSize: 1.1rem, fontWeight: 600`
- Email: `fontSize: 0.875rem`, con text-overflow ellipsis
- `borderRadius: 12px, padding: 24px, marginBottom: 20px`

#### 3. Info Grid (2 columnas, gap 12px)
- Cada card: label en uppercase muted + value en primary
- `borderRadius: 10px, padding: 14px 16px`
- Campos: Teléfono, Localidad, Provincia, Miembro desde

#### 4. Action Button — Editar Perfil
- Full width, estilo card con hover en borde
- Redirige a `/catalog/user/perfil`
- Hover: `borderColor: var(--accent-blue)`

### Estructura: No Logueado

- Centrado vertical y horizontal (`minHeight: 80vh`)
- Card: `maxWidth: 380px, borderRadius: 12px, padding: 32px`
- Toggle entre Login y Registro
- Campos: Email, Password (+ Nombre solo en registro)
- Botón Google OAuth con SVG del logo
- Divider "o continuá con"

---

## Página 2: /catalog/user/perfil — Editar Perfil

### Header
- Botón "← Mi cuenta": sin borde, color `var(--text-muted)`, hover `var(--text-primary)`
- Título: `fontSize: 1.5rem, fontWeight: 700, color: var(--text-primary)`
- `marginBottom: 28px`

### Formulario (display: grid, gap: 20px)

#### 1. Sección Avatar
- Avatar: `48x48px`, circular, fondo imagen o `var(--accent-blue)`
- Botón "Cambiar foto": fondo `var(--accent-blue)`, color blanco
- Botón "Quitar": solo visible si hay avatar, transparente con borde
- Input file oculto, accept `image/*`, max 2MB

#### 2. Sección Datos Personales
- Estilo card: `bg-card, border: 1px solid var(--border-color), borderRadius: 12px, padding: 20px`
- Título sección: `fontSize: 0.8rem, fontWeight: 600, color: var(--text-muted), textTransform: uppercase, letterSpacing: 0.05em`
- Grid 2 columnas, gap `14px`
- Contraseña: full width con botón toggle Mostrar/Ocultar
- Placeholder: "Dejar vacío para no cambiarla"

#### 3. Sección Dirección de Envío
- Mismo estilo de card que Datos Personales
- Grid 2 columnas, gap `14px`
- Dirección: full width (`gridColumn: 1 / -1`)
- Observaciones: textarea, `resize: vertical, minHeight: 70px, maxHeight: 100px`
- Placeholder: "Ej: Llamar al timbre, horario de entrega preferido..."

#### 4. Botones de Acción
- Alineados a la derecha, gap `10px`, paddingTop `8px`
- Cancelar: transparente con borde, redirige a `/catalog/user`
- Guardar: fondo `var(--accent-blue)`, color blanco

### Input Style (Catálogo)
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

### Field Component (Catálogo)
```javascript
function Field({ label, name, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
        {label}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} style={inputStyle} />
    </div>
  )
}
```

---

## Auth Functions (utils/supabaseAuthV2)

- `loginWithEmail(email, password)` — Login con email
- `registerWithEmail(email, password, profileData)` — Registro
- `loginWithGoogle()` — OAuth Google
- `handleOAuthCallback()` — Procesar callback OAuth
- `getCurrentSession()` — Obtener sesión actual
- `updateUserProfile(userId, data)` — Actualizar perfil en Supabase
- `logoutClient()` — Cerrar sesión (Supabase + localStorage)

## localStorage Keys

- `currentUser` — Datos del usuario logueado (catálogo)
- `kond-user` — Clave alternativa para sesiones

## Security Rules

- NO permitir que admins se logueen como compradores (check `rol !== 'admin'`)
- NO guardar password en localStorage
- Usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nunca service role key)
- Avatar: validar tamaño máximo 2MB

## Related Files

- `pages/catalog/user.js` — Mi Cuenta principal
- `pages/catalog/user/perfil.js` — Editar perfil
- `components/PublicLayout.js` — Layout del catálogo
- `utils/supabaseAuthV2.js` — Funciones de autenticación
- `utils/catalogUtils.js` — createToast, formatCurrency, formatDate
