import React from 'react'
import styles from './styles/UserSummary.module.css'

export default function ProfileProgress({ completeness = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(completeness)))

  return (
    <div className={styles.progress} data-testid="profile-progress">
      <div className={styles.bar} style={{ width: `${pct}%` }} aria-valuenow={pct} data-testid="profile-progress-bar" />
      <div className={styles.label} data-testid="profile-progress-label">{pct}% completo</div>
    </div>
  )
}
