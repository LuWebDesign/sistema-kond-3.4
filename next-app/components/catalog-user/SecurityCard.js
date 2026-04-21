import React, { useState } from 'react'
import styles from './styles/UserSummary.module.css'
import { changePassword as adapterChangePassword } from '../../utils/supabaseAuthAdapter'

export default function SecurityCard({ userId }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!newPassword || newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    try {
      await adapterChangePassword(userId, { currentPassword, newPassword })
    } catch (err) {
      setError(err.message || 'Error cambiando la contraseña')
    } finally {
      setSaving(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className={styles.card} data-testid="security-card">
      <h3>Seguridad</h3>
      <form onSubmit={handleSubmit} data-testid="security-form">
        <label>
          Contraseña actual
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="security-current" />
        </label>

        <label>
          Nueva contraseña
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="security-new" />
        </label>

        <label>
          Confirmar contraseña
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} data-testid="security-confirm" />
        </label>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <button type="submit" disabled={saving} data-testid="security-save">{saving ? 'Guardando...' : 'Cambiar contraseña'}</button>
      </form>
    </div>
  )
}
