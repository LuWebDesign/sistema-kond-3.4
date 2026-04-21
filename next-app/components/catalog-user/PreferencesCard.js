import React, { useState, useEffect } from 'react'
import styles from './styles/UserSummary.module.css'

export default function PreferencesCard({ preferences = {}, onSave = async () => {} }) {
  const [prefs, setPrefs] = useState({ emailNotifications: false, smsNotifications: false, ...preferences })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPrefs({ emailNotifications: false, smsNotifications: false, ...preferences })
  }, [preferences])

  const handleToggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(prefs)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.card} data-testid="preferences-card">
      <h3>Preferencias</h3>
      <div>
        <label>
          <input type="checkbox" checked={!!prefs.emailNotifications} onChange={() => handleToggle('emailNotifications')} data-testid="prefs-email-toggle" /> Recibir notificaciones por email
        </label>
      </div>
      <div>
        <label>
          <input type="checkbox" checked={!!prefs.smsNotifications} onChange={() => handleToggle('smsNotifications')} data-testid="prefs-sms-toggle" /> Recibir notificaciones por SMS
        </label>
      </div>
      <div>
        <button onClick={handleSave} disabled={saving} data-testid="prefs-save">{saving ? 'Guardando...' : 'Guardar preferencias'}</button>
      </div>
    </div>
  )
}
