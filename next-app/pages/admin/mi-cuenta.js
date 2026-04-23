import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { createToast } from '../../utils/catalogUtils'
import { getCurrentSession, updatePassword, updateUserProfile } from '../../utils/supabaseAuthV2'

const MiCuenta = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [isProfileExpanded, setIsProfileExpanded] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    localidad: '',
    cp: '',
    provincia: '',
    observaciones: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const session = await getCurrentSession()
      if (session) {
        setCurrentUser(session.user)
        setFormData(prev => ({
          ...prev,
          email: session.user.email || prev.email,
          nombre: session.user.username || session.user.nombre || prev.nombre,
          apellido: session.user.apellido || prev.apellido,
          telefono: session.user.telefono || prev.telefono,
          direccion: session.user.direccion || prev.direccion,
          localidad: session.user.localidad || prev.localidad,
          cp: session.user.cp || prev.cp,
          provincia: session.user.provincia || prev.provincia,
          observaciones: session.user.observaciones || prev.observaciones
        }))
      }
    }
    loadUser()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = { ...currentUser, ...formData }

      if (currentUser?.id) {
        const { error: dbError } = await updateUserProfile(currentUser.id, formData)
        if (dbError) {
          createToast('Error al guardar en el servidor: ' + dbError, 'error')
          setIsLoading(false)
          return
        }
      }

      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      try { localStorage.setItem('kond-user', JSON.stringify(updatedUser)) } catch { /* noop */ }
      setCurrentUser(updatedUser)
      try { window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser })) } catch { /* noop */ }
      createToast('Perfil actualizado correctamente', 'success')
      setIsProfileExpanded(false)
    } catch (error) {
      createToast('Error al actualizar perfil', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      createToast('Completá ambos campos de contraseña', 'error')
      return
    }

    if (passwordData.newPassword.length < 8) {
      createToast('La contraseña debe tener al menos 8 caracteres', 'error')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      createToast('Las contraseñas no coinciden', 'error')
      return
    }

    setIsPasswordLoading(true)

    try {
      const { error } = await updatePassword(passwordData.newPassword)

      if (error) {
        createToast(error.message || 'Error al actualizar la contraseña', 'error')
        return
      }

      setPasswordData({ newPassword: '', confirmPassword: '' })
      createToast('Contraseña actualizada correctamente', 'success')
    } catch (error) {
      createToast('Error al actualizar la contraseña', 'error')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <Layout title="Mi Cuenta - Panel Admin">
      <div style={{ padding: '24px 20px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Mi Cuenta
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentUser?.rol === 'admin' ? 'Administrador' : 'Usuario'} &bull; {currentUser?.email}
          </p>
        </div>

        {/* Tarjeta Colapsable */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
          {/* Header colapsable */}
          <div
            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
            style={{ padding: '16px 20px', background: 'var(--accent-blue)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'opacity 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Información del Perfil</h3>
              <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', opacity: 0.9 }}>Gestiona tus datos personales</p>
            </div>
            <span style={{ fontSize: '0.85rem', transition: 'transform 0.2s ease', transform: isProfileExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              &#9660;
            </span>
          </div>

          {/* Contenido expandido */}
          {isProfileExpanded && (
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '20px' }}>

                {/* Datos personales */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
                    Datos personales
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <Field label="Nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                    <Field label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} />
                    <Field label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled />
                    <Field label="Teléfono" name="telefono" type="tel" value={formData.telefono} onChange={handleInputChange} />
                  </div>
                </div>

                {/* Dirección */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
                    Dirección
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Field label="Dirección" name="direccion" value={formData.direccion} onChange={handleInputChange} />
                    </div>
                    <Field label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} />
                    <Field label="Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} />
                    <Field label="Provincia" name="provincia" value={formData.provincia} onChange={handleInputChange} />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
                        Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        placeholder="Notas adicionales..."
                        style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', maxHeight: '100px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                  <button type="button" onClick={() => setIsProfileExpanded(false)}
                    style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={isLoading}
                    style={{ background: isLoading ? 'var(--text-muted)' : 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease' }}>
                    {isLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>

        {/* Seguridad y credenciales */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Seguridad y Credenciales</h3>
            <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>Cambiá tu contraseña de acceso</p>
          </div>

          <div style={{ padding: '20px' }}>
            <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '20px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
                  Contraseña
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <Field
                    label="Nueva contraseña"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <Field
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Repetí la nueva contraseña"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  La contraseña debe tener al menos 8 caracteres.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPasswordData({ newPassword: '', confirmPassword: '' })}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  style={{ background: isPasswordLoading ? 'var(--text-muted)' : 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: isPasswordLoading ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease' }}
                >
                  {isPasswordLoading ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Field({ label, name, type = 'text', value, onChange, required, disabled = false, placeholder, autoComplete }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </div>
  )
}

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

export default withAdminAuth(MiCuenta)
