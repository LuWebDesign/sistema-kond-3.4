import { useState } from 'react';

export function UserProfileForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  isSaving, 
  showPasswordToggle = true,
  layoutType = 'catalog', // 'catalog' o 'admin'
  showAvatar = false,
  avatar,
  onAvatarChange,
  currentUser = null
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(s => !s);
  };

  // Componente Field reutilizable
  const Field = ({ label, name, type = 'text', value, onChange, required, disabled = false }) => {
    if (layoutType === 'admin') {
      return (
        <div style={{ position: 'relative' }}>
          <label style={{
            display: 'block',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '6px'
          }}>
            {label}
          </label>
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
          />
        </div>
      );
    } else {
      return (
        <div>
          <label style={{ 
            display: 'block', 
            color: 'var(--text-secondary)', 
            fontSize: '0.8rem', 
            fontWeight: 500, 
            marginBottom: '6px' 
          }}>
            {label}
          </label>
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            style={{
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
            }}
          />
        </div>
      );
    }
  };

  // Componente TextAreaField reutilizable
  const TextAreaField = ({ label, name, value, onChange, placeholder }) => {
    if (layoutType === 'admin') {
      return (
        <div style={{ position: 'relative' }}>
          <label style={{
            display: 'block',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '6px'
          }}>
            {label}
          </label>
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px'
            }}
          />
        </div>
      );
    } else {
      return (
        <div>
          <label style={{ 
            display: 'block', 
            color: 'var(--text-secondary)', 
            fontSize: '0.8rem', 
            fontWeight: 500, 
            marginBottom: '6px' 
          }}>
            {label}
          </label>
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={{ 
              ...inputStyle, 
              resize: 'vertical', 
              minHeight: '70px', 
              maxHeight: '100px', 
              fontFamily: 'inherit' 
            }} 
          />
        </div>
      );
    }
  };

  // Estilo base para inputs (usado en layout de catalog)
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
  };

  // Renderizado condicional según layoutType
  if (layoutType === 'admin') {
    return (
      <form onSubmit={onSubmit} style={{ width: '100%' }}>
        {/* Sección Información Personal */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            paddingBottom: '12px',
            borderBottom: '2px solid var(--accent-blue)'
          }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Información Personal
            </h4>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <Field label="👤 Nombre *" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
            <Field label="📛 Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} />
            <Field label="📧 Email *" name="email" value={formData.email} onChange={handleInputChange} required disabled />
            <Field label="📱 Teléfono" name="telefono" value={formData.telefono} onChange={handleInputChange} />
          </div>
        </div>

        {/* Sección Dirección */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            paddingBottom: '12px',
            borderBottom: '2px solid var(--accent-secondary)'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🏠</span>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Dirección
            </h4>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px'
          }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="🏠 Dirección" name="direccion" value={formData.direccion} onChange={handleInputChange} />
            </div>

            <Field label="🏙️ Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} />
            <Field label="📮 Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} />
            <Field label="🗺️ Provincia" name="provincia" value={formData.provincia} onChange={handleInputChange} />

            <div style={{ gridColumn: '1 / -1' }}>
              <TextAreaField 
                label="📝 Observaciones" 
                name="observaciones" 
                value={formData.observaciones} 
                onChange={handleInputChange} 
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              background: isSaving ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isSaving ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            {isSaving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    );
  } else {
    // Diseño para catálogo
    return (
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '20px' }}>
        {/* Avatar */}
        {showAvatar && (
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px' 
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
              background: avatar ? `url(${avatar}) center/cover` : 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.1rem', fontWeight: 600
            }}>
              {!avatar && (currentUser?.nombre?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ 
                background: 'var(--accent-blue)', 
                color: 'white', 
                padding: '6px 14px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontSize: '0.85rem', 
                fontWeight: 500 
              }}>
                Cambiar foto
                <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
              </label>
              {avatar && (
                <button type="button" onClick={() => onAvatarChange(null)}
                  style={{ 
                    background: 'transparent', 
                    color: 'var(--text-muted)', 
                    padding: '6px 14px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    fontWeight: 500 
                  }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Datos personales */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '20px' 
        }}>
          <h3 style={{ 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            margin: '0 0 16px 0' 
          }}>
            Datos personales
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <Field label="Nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
            <Field label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} />
            <Field label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
            <Field label="Teléfono" name="telefono" type="tel" value={formData.telefono} onChange={handleInputChange} />

            {/* Contraseña - full width */}
            {showPasswordToggle && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.8rem', 
                  fontWeight: 500, 
                  marginBottom: '6px' 
                }}>
                  Contraseña
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Dejar vacío para no cambiarla"
                    autoComplete="new-password"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="button" onClick={togglePasswordVisibility}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)', 
                      background: 'transparent', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer', 
                      fontSize: '0.8rem', 
                      whiteSpace: 'nowrap' 
                    }}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dirección de envío */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '20px' 
        }}>
          <h3 style={{ 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            margin: '0 0 16px 0' 
          }}>
            Dirección de envío
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Dirección" name="direccion" value={formData.direccion} onChange={handleInputChange} />
            </div>

            <Field label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} />
            <Field label="Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} />
            <Field label="Provincia" name="provincia" value={formData.provincia} onChange={handleInputChange} />

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-secondary)', 
                fontSize: '0.8rem', 
                fontWeight: 500, 
                marginBottom: '6px' 
              }}>
                Observaciones
              </label>
              <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange}
                placeholder="Ej: Llamar al timbre, horario de entrega preferido..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', maxHeight: '100px', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
          <button type="button" onClick={onCancel}
            style={{ 
              background: 'transparent', 
              color: 'var(--text-secondary)', 
              border: '1px solid var(--border-color)', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontSize: '0.9rem', 
              fontWeight: 500, 
              cursor: 'pointer', 
              transition: 'all 0.15s ease' 
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.color = 'var(--text-primary)'; 
              e.currentTarget.style.borderColor = 'var(--text-muted)' 
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.color = 'var(--text-secondary)'; 
              e.currentTarget.style.borderColor = 'var(--border-color)' 
            }}
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSaving}
            style={{ 
              background: isSaving ? 'var(--text-muted)' : 'var(--accent-blue)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 28px', 
              borderRadius: '8px', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              cursor: isSaving ? 'not-allowed' : 'pointer', 
              transition: 'background 0.15s ease' 
            }}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    );
  }
}

export default UserProfileForm;