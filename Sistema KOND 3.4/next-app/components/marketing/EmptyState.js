import styles from '../../styles/marketing.module.css';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <div className={styles.emptyActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
