import React from 'react'
import styles from './styles/UserSummary.module.css'

export default function UserSummary({ user = {}, onEditProfile = () => {} }) {
  const name = user.nombre || user.name || user.username || 'Usuario'
  const email = user.email || ''
  const avatar = user.avatar || user.photo || null

  return (
    <div className={styles.card} data-testid="user-summary-card">
      <div className={styles.avatar} data-testid="user-summary-avatar">
        {avatar ? (
          // lazy load and guard window usage by relying on img loading attribute
          <img src={avatar} alt={`${name} avatar`} loading="lazy" />
        ) : (
          <div aria-hidden className={styles.avatarPlaceholder}>👤</div>
        )}
      </div>

      <div className={styles.info}>
        <h2 data-testid="user-summary-name" className={styles.name}>{name}</h2>
        <div data-testid="user-summary-email" className={styles.email}>{email}</div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onEditProfile}
          data-testid="user-summary-edit-button"
          className={styles.editBtn}
        >
          Editar perfil
        </button>
      </div>
    </div>
  )
}
