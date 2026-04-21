import React, { useState } from 'react'
import styles from './styles/UserSummary.module.css'

export default function AddressForm({ initialAddress = {}, onSave = async () => {} }) {
  const [address, setAddress] = useState(initialAddress)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setAddress(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(address)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="address-form">
      <label>
        Calle
        <input name="street" value={address.street || ''} onChange={handleChange} data-testid="address-street" />
      </label>

      <label>
        Ciudad
        <input name="city" value={address.city || ''} onChange={handleChange} data-testid="address-city" />
      </label>

      <label>
        CP
        <input name="postalCode" value={address.postalCode || ''} onChange={handleChange} data-testid="address-postalCode" />
      </label>

      <div>
        <button type="submit" disabled={saving} data-testid="address-save-button">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  )
}
