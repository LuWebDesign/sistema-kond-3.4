import PublicLayout from '../../../components/PublicLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createToast } from '../../../utils/catalogUtils'
import { getCurrentSession, updateUserProfile } from '../../../utils/supabaseAuthV2'

export default function Perfil() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    direccion: '',
    localidad: '',
    cp: '',
    provincia: '',
    observaciones: ''
  })

  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      // Intentar sesión Supabase primero
      const session = await getCurrentSession()

      if (session && session.user && session.user.rol !== 'admin') {
        const u = session.user
        setCurrentUser(u)
        setFormData({
          nombre: u.nombre || '',
          apellido: u.apellido || '',
          email: u.email || '',
          password: '',
          telefono: u.telefono || '',
          direccion: u.direccion || '',
          localidad: u.localidad || '',
          cp: u.cp || '',
          provincia: u.provincia || '',
          observaciones: u.observaciones || ''
        })
        setIsLoading(false)
        return
      }

      // Fallback localStorage
      try {
        const stored = localStorage.getItem('currentUser')
        if (stored) {
          const localUser = JSON.parse(stored)
          if (localUser && localUser.rol !== 'admin' && !localUser.isAdmin) {
            setCurrentUser(localUser)
            setFormData({
              nombre: localUser.nombre || '',
              apellido: localUser.apellido || '',
              email: localUser.email || '',
              password: '',
              telefono: localUser.telefono || '',
              direccion: localUser.direccion || '',
              localidad: localUser.localidad || '',
              cp: localUser.cp || '',
              provincia: localUser.provincia || '',
              observaciones: localUser.observaciones || ''
            })
            setIsLoading(false)
            return
          }
        }
      } catch { /* noop */ }

      // Sin sesión → redirigir a login
      router.replace('/catalog/user')
    }

    loadUser()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      createToast('El archivo debe ser menor a 2MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setAvatar(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { password, ...profileFields } = formData

      if (currentUser?.id) {
        const { error: dbError } = await updateUserProfile(currentUser.id, profileFields)
        if (dbError) {
          createToast('Error al guardar en el servidor: ' + dbError, 'error')
          setIsSaving(false)
          return
        }
      }

      const updatedUser = { ...currentUser, ...profileFields, avatar }
      try { localStorage.setItem('currentUser', JSON.stringify(updatedUser)) } catch { /* noop */ }
      try { localStorage.setItem('kond-user', JSON.stringify(updatedUser)) } catch { /* noop */ }
      setCurrentUser(updatedUser)
      try { window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser })) } catch { /* noop */ }

      createToast('Perfil actualizado correctamente', 'success')
      router.push('/catalog/user')
    } catch (error) {
      createToast('Error al actualizar perfil', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <PublicLayout title="Editar Perfil - KOND">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout title="Editar Perfil - KOND">
      <div style={{ padding: '24px 20px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <button
            onClick={() => router.push('/catalog/user')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '12px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            ← Mi cuenta
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Editar perfil
          </h1>
        </div>

        <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '20px' }}>

          {/* Avatar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
              background: avatar ? `url(${avatar}) center/cover` : 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.1rem', fontWeight: 600
            }}>
              {!avatar && (currentUser?.nombre?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ background: 'var(--accent-blue)', color: 'white', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                Cambiar foto
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
              {avatar && (
                <button type="button" onClick={() => setAvatar(null)}
                  style={{ background: 'transparent', color: 'var(--text-muted)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                  Quitar
                </button>
              )}
            </div>
          </div>

          {/* Datos personales */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
              Datos personales
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              <Field label="Nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              <Field label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} />
              <Field label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
              <Field label="Teléfono" name="telefono" type="tel" value={formData.telefono} onChange={handleInputChange} />

              {/* Contraseña - full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
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
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dirección de envío */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
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
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
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
            <button type="button" onClick={() => router.push('/catalog/user')}
              style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={isSaving}
              style={{ background: isSaving ? 'var(--text-muted)' : 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease' }}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

        </form>
      </div>
    </PublicLayout>
  )
}

function Field({ label, name, type = 'text', value, onChange, required }) {
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
