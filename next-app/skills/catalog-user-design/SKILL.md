---
name: catalog-user-design
description: >
  Define el diseño de las páginas de usuario en el catálogo y su adaptación para el área de administración.
  Trigger: Cuando se necesite crear o modificar páginas de perfil de usuario en /catalog/user o /admin/mi-cuenta.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Para mantener consistencia visual entre el perfil de usuario en el catálogo y en el panel de administración
- Al crear nuevas funcionalidades de perfil de usuario
- Al necesitar diferenciar estilos entre áreas de usuario regular y administrador
- Para reutilizar componentes comunes entre las dos secciones

## Critical Patterns

- **Diseño modular**: Separar componentes comunes de componentes específicos por rol
- **Consistencia**: Mantener campos y funcionalidades similares entre ambas vistas
- **Distinción de roles**: El área de admin debe tener estilos más robustos y claros indicadores de rol
- **Reutilización**: Crear componentes compartidos para formularios y vistas similares
- **Seguridad**: Validar siempre el rol del usuario antes de mostrar funcionalidades sensibles

## Componentes Comunes

Los siguientes componentes deben ser reutilizables entre `/catalog/user/perfil.js` y `/admin/mi-cuenta.js`:

- Formulario de perfil con campos: nombre, apellido, email, teléfono, dirección, localidad, código postal, provincia, observaciones
- Campo de contraseña con opción para mostrar/ocultar
- Validación de formularios
- Funciones de actualización de perfil
- Mensajes de toast para feedback de usuario

## Diferencias Específicas

### `/catalog/user/perfil.js`
- Diseño más simplificado y centrado en el usuario
- Menos secciones colapsables
- Enfoque en funcionalidades básicas del usuario
- Layout público (`PublicLayout`)

### `/admin/mi-cuenta.js`
- Diseño más robusto con secciones colapsables
- Indicadores visuales claros de rol de administrador
- Estilo más profesional y detallado
- Layout de administrador (`Layout`)
- Mayor jerarquía visual y elementos decorativos

## Código Base para Componentes Reutilizables

```javascript
// components/UserProfileForm.js
import { useState } from 'react'

export function UserProfileForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  isSaving, 
  showPasswordToggle = true,
  layoutType = 'catalog' // 'catalog' o 'admin'
}) {
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const togglePasswordVisibility = () => {
    setShowPassword(s => !s)
  }

  // Renderizado condicional según layoutType
  if (layoutType === 'admin') {
    return (
      <form onSubmit={onSubmit}>
        {/* Diseño específico para admin con secciones colapsables */}
        <div className="admin-profile-section">
          <h3>Datos Personales</h3>
          <div className="form-grid admin-grid">
            <Field label="Nombre *" name="nombre" value={formData.nombre} onChange={handleInputChange} required layoutType="admin" />
            <Field label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} layoutType="admin" />
            <Field label="Email *" name="email" value={formData.email} onChange={handleInputChange} required disabled layoutType="admin" />
            <Field label="Teléfono" name="telefono" value={formData.telefono} onChange={handleInputChange} layoutType="admin" />
          </div>
        </div>
        
        <div className="admin-profile-section">
          <h3>Dirección</h3>
          <div className="form-grid admin-grid">
            <div className="full-width">
              <Field label="Dirección" name="direccion" value={formData.direccion} onChange={handleInputChange} layoutType="admin" />
            </div>
            <Field label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} layoutType="admin" />
            <Field label="Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} layoutType="admin" />
            <Field label="Provincia" name="provincia" value={formData.provincia} onChange={handleInputChange} layoutType="admin" />
            <div className="full-width">
              <TextAreaField 
                label="Observaciones" 
                name="observaciones" 
                value={formData.observaciones} 
                onChange={handleInputChange} 
                placeholder="Notas adicionales..."
                layoutType="admin"
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    )
  } else {
    // Diseño para catálogo
    return (
      <form onSubmit={onSubmit}>
        <div className="profile-section">
          <h3>Datos personales</h3>
          <div className="form-grid catalog-grid">
            <Field label="Nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
            <Field label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} />
            <Field label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
            <Field label="Teléfono" name="telefono" type="tel" value={formData.telefono} onChange={handleInputChange} />
            
            {showPasswordToggle && (
              <div className="full-width">
                <label>Contraseña</label>
                <div className="password-field-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Dejar vacío para no cambiarla"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={togglePasswordVisibility}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-section">
          <h3>Dirección de envío</h3>
          <div className="form-grid catalog-grid">
            <div className="full-width">
              <Field label="Dirección" name="direccion" value={formData.direccion} onChange={handleInputChange} />
            </div>
            
            <Field label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} />
            <Field label="Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} />
            <Field label="Provincia" name="provincia" value={formData.provincia} onChange={handleInputChange} />
            
            <div className="full-width">
              <TextAreaField 
                label="Observaciones" 
                name="observaciones" 
                value={formData.observaciones} 
                onChange={handleInputChange} 
                placeholder="Ej: Llamar al timbre, horario de entrega preferido..."
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    )
  }
}

function Field({ label, name, type = 'text', value, onChange, required, disabled = false, layoutType = 'catalog' }) {
  if (layoutType === 'admin') {
    return (
      <div>
        <label>{label}</label>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="admin-input"
        />
      </div>
    )
  } else {
    return (
      <div>
        <label>{label}</label>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="catalog-input"
        />
      </div>
    )
  }
}

function TextAreaField({ label, name, value, onChange, placeholder, layoutType = 'catalog' }) {
  if (layoutType === 'admin') {
    return (
      <div>
        <label>{label}</label>
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="admin-textarea"
        />
      </div>
    )
  } else {
    return (
      <div>
        <label>{label}</label>
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="catalog-textarea"
        />
      </div>
    )
  }
}
```

## Commands

```bash
# Para actualizar el perfil de usuario en el catálogo
cp components/UserProfileForm.js pages/catalog/user/perfil.js

# Para actualizar el perfil de admin
cp components/UserProfileForm.js pages/admin/mi-cuenta.js
```

## Recursos Adicionales

- Revisar `pages/catalog/user/perfil.js` para el diseño actual de usuario
- Revisar `pages/admin/mi-cuenta.js` para el diseño actual de administrador
- Consultar `components/PublicLayout.js` y `components/Layout.js` para layouts
- Verificar funciones de autenticación en `utils/supabaseAuthV2.js`