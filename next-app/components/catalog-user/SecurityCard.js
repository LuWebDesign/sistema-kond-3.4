import React, { useState } from 'react'
import styles from './styles/UserSummary.module.css'

export default function SecurityCard({ userId }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => setPassword(e.target.value)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // stubbed: callers will replace with adapter usage
      await new Promise(r => setTimeout(r, 300))
    } finally {
      setSaving(false)
      setPassword('')
    }
  }

  return (
    <div className={styles.card} data-testid="security-card">
      <h3>Seguridad</h3>
      <form onSubmit={handleSubmit} data-testid="security-form">
        <label>
          Nueva contraseña
          <input type="password" value={password} onChange={handleChange} data-testid="security-password" />
        </label>
        <button type="submit" disabled={saving} data-testid="security-save">{saving ? 'Guardando...' : 'Cambiar contraseña'}</button>
      </form>
    </div>
  )
}
