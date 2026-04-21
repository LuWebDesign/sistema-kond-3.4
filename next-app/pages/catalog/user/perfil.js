import PublicLayout from '../../../components/PublicLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createToast } from '../../../utils/catalogUtils'
import { getCurrentSession, updateUserProfile } from '../../../utils/supabaseAuthV2'
import UserSummary from '../../../components/catalog-user/UserSummary'
import AddressForm from '../../../components/catalog-user/AddressForm'
import * as localStorageUser from '../../../utils/localStorageUser'

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
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <button onClick={() => router.push('/catalog/user')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>← Volver a Mi Cuenta</button>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-blue)', margin: '8px 0 0 0' }}>✏️ Editar Perfil</h1>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
            <aside>
              <UserSummary user={currentUser} onEditProfile={() => {}} />
            </aside>

            <main>
              <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: 24 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: avatar ? `url(${avatar}) center/cover` : 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 700 }}>{!avatar && (currentUser?.nombre?.charAt(0)?.toUpperCase() || 'U')}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <label style={{ background: 'var(--accent-blue)', color: 'white', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>📷 Cambiar foto<input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} /></label>
                      {avatar && <button type="button" onClick={() => setAvatar(null)} style={{ background: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: 8 }}>🗑️ Eliminar</button>}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                    {[
                      { label: 'Nombre *', name: 'nombre', required: true },
                      { label: 'Apellido', name: 'apellido' },
                      { label: 'Email *', name: 'email', type: 'email', required: true },
                      { label: 'Teléfono', name: 'telefono', type: 'tel' },
                    ].map(({ label, name, type = 'text', required }) => (
                      <div key={name}>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
                        <input type={type} name={name} value={formData[name]} onChange={handleInputChange} required={required} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6 }}>🔑 Contraseña (dejar vacío para no cambiarla)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••" style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }} />
                        <button type="button" onClick={() => setShowPassword(s => !s)} style={{ padding: '8px 12px', borderRadius: 8 }}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                  <h4>Dirección de Envío</h4>
                  <AddressForm initialAddress={{ street: formData.direccion || '', city: formData.localidad || '', postalCode: formData.cp || '', phone: formData.telefono || '' }} onSave={async (addr) => {
                    setFormData(prev => ({ ...prev, direccion: addr.street, localidad: addr.city, cp: addr.postalCode, telefono: addr.phone }))
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" onClick={() => router.push('/catalog/user')} style={{ background: 'var(--bg-section)', padding: '12px 20px', borderRadius: 8 }}>❌ Cancelar</button>
                  <button type="submit" disabled={isSaving} style={{ background: isSaving ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)', color: 'white', padding: '12px 24px', borderRadius: 8 }}>{isSaving ? '⏳ Guardando...' : '💾 Guardar Cambios'}</button>
                </div>
              </form>
            </main>
          </div>
        </div>
      </PublicLayout>
    )
}
