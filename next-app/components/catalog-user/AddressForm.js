import React, { useState } from 'react'
import styles from './styles/UserSummary.module.css'

function validate(address) {
  const errors = {}
  if (!address.street || address.street.trim() === '') errors.street = 'La calle es requerida'
  if (!address.city || address.city.trim() === '') errors.city = 'La ciudad es requerida'
  if (address.postalCode && !/^[0-9]+$/.test(address.postalCode)) errors.postalCode = 'Código postal inválido'
  if (address.phone && !/^\+?[0-9 \-()]{6,20}$/.test(address.phone)) errors.phone = 'Teléfono inválido'
  return errors
}

export default function AddressForm({ initialAddress = {}, onSave = async () => {} }) {
  const [address, setAddress] = useState({ street: '', city: '', postalCode: '', phone: '', ...initialAddress })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setAddress(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate(address)
    setErrors(v)
    if (Object.keys(v).length) return
    setSaving(true)
    try {
      await onSave(address)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="addressform">
      <label>
        Calle
        <input name="street" value={address.street || ''} onChange={handleChange} data-testid="addressform-street" />
        {errors.street && <div className={styles.error} data-testid="addressform-street-error">{errors.street}</div>}
      </label>

      <label>
        Ciudad
        <input name="city" value={address.city || ''} onChange={handleChange} data-testid="addressform-city" />
        {errors.city && <div className={styles.error}>{errors.city}</div>}
      </label>

      <label>
        Código postal
        <input name="postalCode" value={address.postalCode || ''} onChange={handleChange} data-testid="addressform-postalCode" />
        {errors.postalCode && <div className={styles.error}>{errors.postalCode}</div>}
      </label>

      <label>
        Teléfono
        <input name="phone" value={address.phone || ''} onChange={handleChange} data-testid="addressform-phone" />
        {errors.phone && <div className={styles.error}>{errors.phone}</div>}
      </label>

      <div>
        <button type="submit" disabled={saving} data-testid="addressform-save">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  )
}
