import React, { useState } from 'react'
import styles from './styles/UserSummary.module.css'

export default function PreferencesCard({ preferences = {}, onSave = async () => {} }) {
  const [prefs, setPrefs] = useState(preferences)
  const [saving, setSaving] = useState(false)

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
          <input type="checkbox" checked={!!prefs.newsletter} onChange={() => handleToggle('newsletter')} data-testid="pref-newsletter" /> Recibir novedades
        </label>
      </div>
      <div>
        <button onClick={handleSave} disabled={saving} data-testid="preferences-save">{saving ? 'Guardando...' : 'Guardar preferencias'}</button>
      </div>
    </div>
  )
}
