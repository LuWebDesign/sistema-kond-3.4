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
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <button
              onClick={() => router.push('/catalog/user')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Volver a Mi Cuenta
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-blue)', margin: 0 }}>
              ✏️ Editar Perfil
            </h1>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '24px' }}>

          {/* Avatar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
              background: avatar ? `url(${avatar}) center/cover` : 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '2rem', fontWeight: 700
            }}>
              {!avatar && (currentUser?.nombre?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ background: 'var(--accent-blue)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                📷 Cambiar foto
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
              {avatar && (
                <button type="button" onClick={() => setAvatar(null)}
                  style={{ background: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </div>

          {/* Información Personal */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid var(--accent-blue)' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Información Personal</h3>
            </div>

            <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              {[
                { label: 'Nombre *', name: 'nombre', icon: '👤', required: true },
                { label: 'Apellido', name: 'apellido', icon: '📛' },
                { label: 'Email *', name: 'email', icon: '📧', type: 'email', required: true },
                { label: 'Teléfono', name: 'telefono', icon: '📱', type: 'tel' },
              ].map(({ label, name, icon, type = 'text', required }) => (
                <div key={name} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                    {icon} {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    required={required}
                    style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
              ))}

              {/* Contraseña */}
              <div style={{ position: 'relative', gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                  🔑 Contraseña (dejar vacío para no cambiarla)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    style={{ flex: 1, padding: '14px 16px', border: '2px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dirección de Envío */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid var(--accent-secondary)' }}>
              <span style={{ fontSize: '1.2rem' }}>🏠</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Dirección de Envío</h3>
            </div>

            <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>🏠 Dirección</label>
                <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange}
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'} />
              </div>

              {[
                { label: 'Localidad', name: 'localidad', icon: '🏙️' },
                { label: 'Código Postal', name: 'cp', icon: '📮' },
                { label: 'Provincia', name: 'provincia', icon: '🗺️' },
              ].map(({ label, name, icon }) => (
                <div key={name}>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>{icon} {label}</label>
                  <input type="text" name={name} value={formData[name]} onChange={handleInputChange}
                    style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'} />
                </div>
              ))}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>📝 Observaciones</label>
                <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange}
                  placeholder="Ej: Llamar al timbre, dejar en conserjería, horario de entrega preferido..."
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: '80px', maxHeight: '120px', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'} />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingBottom: '24px' }}>
            <button type="button" onClick={() => router.push('/catalog/user')}
              style={{ background: 'var(--bg-section)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
              ❌ Cancelar
            </button>
            <button type="submit" disabled={isSaving}
              style={{ background: isSaving ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: isSaving ? 'none' : '0 4px 12px rgba(59,130,246,0.3)' }}>
              {isSaving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>

        </form>
      </div>
    </PublicLayout>
  )
}
