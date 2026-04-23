import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { createToast } from '../../../utils/catalogUtils'
import { getCurrentSession, updateUserProfile } from '../../../utils/supabaseAuthV2'

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

const InfoPerfil = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '', nombre: '', apellido: '', telefono: '', direccion: '', localidad: '', cp: '', provincia: '', observaciones: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const session = await getCurrentSession()
      if (session) {
        setCurrentUser(session.user)
        setFormData(prev => ({
          ...prev,
          email: session?.user?.email || prev.email,
          nombre: session?.user?.username || session?.user?.nombre || prev.nombre,
          apellido: session?.user?.apellido || prev.apellido,
          telefono: session?.user?.telefono || prev.telefono,
          direccion: session?.user?.direccion || prev.direccion,
          localidad: session?.user?.localidad || prev.localidad,
          cp: session?.user?.cp || prev.cp,
          provincia: session?.user?.provincia || prev.provincia,
          observaciones: session?.user?.observaciones || prev.observaciones
        }))
      }
    }
    load()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    const sanitizedData = {
      nombre: formData.nombre?.trim().slice(0, 100) || '',
      apellido: formData.apellido?.trim().slice(0, 100) || '',
      telefono: formData.telefono?.trim().slice(0, 20) || '',
      direccion: formData.direccion?.trim().slice(0, 200) || '',
      localidad: formData.localidad?.trim().slice(0, 100) || '',
      cp: formData.cp?.trim().slice(0, 10) || '',
      provincia: formData.provincia?.trim().slice(0, 100) || '',
      observaciones: formData.observaciones?.trim().slice(0, 500) || ''
    }

    try {
      const updatedUser = { ...currentUser, ...sanitizedData }
      if (currentUser?.id) {
        const { error } = await updateUserProfile(currentUser.id, formData)
        if (error) {
          createToast('Error al guardar en el servidor: ' + error, 'error')
          setIsLoading(false)
          return
        }
      }

      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      try { localStorage.setItem('kond-user', JSON.stringify(updatedUser)) } catch { }
      setCurrentUser(updatedUser)
      try { window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser })) } catch { }
      createToast('Perfil actualizado correctamente', 'success')
    } catch (err) {
      createToast('Error al actualizar perfil', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout title="Información del Perfil - Mi Cuenta">
      <div style={{ padding: '24px 20px', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Información del Perfil</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Gestiona tus datos personales</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>Datos personales</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <Field label="Nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                <Field label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} />
                <Field label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled />
                <Field label="Teléfono" name="telefono" type="tel" value={formData.telefono} onChange={handleInputChange} />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>Dirección</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Dirección" name="direccion" value={formData.direccion} onChange={handleInputChange} />
                </div>
                <Field label="Localidad" name="localidad" value={formData.localidad} onChange={handleInputChange} />
                <Field label="Código Postal" name="cp" value={formData.cp} onChange={handleInputChange} />
                <Field label="Provincia" name="provincia" value={formData.provincia} onChange={handleInputChange} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>Observaciones</label>
                  <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} placeholder="Notas adicionales..." style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', maxHeight: '100px', fontFamily: 'inherit' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
              <button type="submit" disabled={isLoading} style={{ background: isLoading ? 'var(--text-muted)' : 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer' }}>{isLoading ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(InfoPerfil)
