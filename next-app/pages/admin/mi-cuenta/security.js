import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import { useState } from 'react'
import { createToast } from '../../../utils/catalogUtils'
import { updatePassword } from '../../../utils/supabaseAuthV2'

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

function getPasswordStrength(password) {
  const value = password || ''
  const lengthOk = value.length >= 8
  const hasUpper = /[A-Z]/.test(value)
  const hasLower = /[a-z]/.test(value)
  const hasNumber = /\d/.test(value)
  const hasSymbol = /[^A-Za-z0-9]/.test(value)

  let score = 0
  if (lengthOk) score += 1
  if (hasUpper && hasLower) score += 1
  if (hasNumber) score += 1
  if (hasSymbol) score += 1

  if (!value) {
    return {
      score: 0,
      label: 'Sin definir',
      color: 'var(--text-secondary)',
      lengthOk,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol
    }
  }

  if (score <= 1) {
    return { score, label: 'Débil', color: '#dc2626', lengthOk, hasUpper, hasLower, hasNumber, hasSymbol }
  }
  if (score === 2 || score === 3) {
    return { score, label: 'Media', color: '#d97706', lengthOk, hasUpper, hasLower, hasNumber, hasSymbol }
  }
  return { score: 4, label: 'Fuerte', color: '#16a34a', lengthOk, hasUpper, hasLower, hasNumber, hasSymbol }
}

const SecurityPage = () => {
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const passwordStrength = getPasswordStrength(passwordData.newPassword)

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleClearPassword = () => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const handleUpdatePassword = async (e) => {
    e.preventDefault()

    if (!passwordData.currentPassword) return createToast('Ingresá tu contraseña actual', 'error')
    if (!passwordData.newPassword || !passwordData.confirmPassword) return createToast('Completá los campos de nueva contraseña', 'error')
    if (passwordData.newPassword.length < 8) return createToast('La nueva contraseña debe tener al menos 8 caracteres', 'error')
    if (passwordData.newPassword !== passwordData.confirmPassword) return createToast('Las contraseñas no coinciden', 'error')

    setIsPasswordLoading(true)
    try {
      const { error } = await updatePassword(passwordData.currentPassword, passwordData.newPassword)
      if (error) {
        createToast(error.message || 'Error al actualizar la contraseña', 'error')
        return
      }
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      createToast('Contraseña actualizada correctamente', 'success')
    } catch (err) {
      createToast('Error al actualizar la contraseña', 'error')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <Layout title="Seguridad - Mi Cuenta">
      <div style={{ padding: '24px 20px', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Seguridad y Credenciales</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Cambiá tu contraseña de acceso</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>Para cambiar tu contraseña, usá el formulario de abajo. Una vez actualizada, tendrás que iniciar sesión nuevamente.</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px' }}>
            <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '20px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
                  Cambiar contraseña
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <Field label="Contraseña actual" name="currentPassword" type="password" value={passwordData.currentPassword} onChange={handlePasswordInputChange} placeholder="Tu contraseña actual" autoComplete="current-password" required />
                  <div />
                  <Field label="Nueva contraseña" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordInputChange} placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
                  <Field label="Confirmar contraseña" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} placeholder="Repetí la nueva contraseña" autoComplete="new-password" required />
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fortaleza</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: passwordStrength.color }}>{passwordStrength.label}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[0, 1, 2, 3].map((step) => (
                      <div key={step} style={{ height: '8px', borderRadius: '999px', background: step < passwordStrength.score ? passwordStrength.color : 'var(--border-color)', transition: 'background 0.15s ease' }} />
                    ))}
                  </div>

                  <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'grid', gap: '4px' }}>
                    <li>{passwordStrength.lengthOk ? 'Longitud mínima cumplida' : 'Usá al menos 8 caracteres'}</li>
                    <li>{passwordStrength.hasUpper ? 'Incluye mayúsculas' : 'Sumá una mayúscula'}</li>
                    <li>{passwordStrength.hasNumber ? 'Incluye números' : 'Sumá un número'}</li>
                    <li>{passwordStrength.hasSymbol ? 'Incluye símbolos' : 'Sumá un símbolo'}</li>
                  </ul>
                </div>

                <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>La contraseña debe tener al menos 8 caracteres.</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button type="button" onClick={handleClearPassword} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}>Limpiar</button>
                <button type="submit" disabled={isPasswordLoading} style={{ background: isPasswordLoading ? 'var(--text-muted)' : 'var(--accent-blue)', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: isPasswordLoading ? 'not-allowed' : 'pointer', transition: 'background 0.15s ease' }}>{isPasswordLoading ? 'Actualizando...' : 'Actualizar contraseña'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(SecurityPage)
