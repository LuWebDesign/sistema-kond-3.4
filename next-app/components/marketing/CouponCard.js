import styles from '../../styles/marketing.module.css';

function fmtRange(a, b) {
  const s = a || '';
  const e = b || '';
  if (!s && !e) return '—';
  if (s && !e) return `${s} →`;
  if (!s && e) return `→ ${e}`;
  return `${s} → ${e}`;
}

export default function CouponCard({ coupon, onEdit, onToggle, onDelete, isLight = false }) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const isExpired = coupon.end && coupon.end < today;
  const isScheduled = coupon.start && coupon.start > today;
  const isActive = coupon.active && !isExpired && !isScheduled;

  let statusText = '';
  let statusColor = '';
  if (!coupon.active) {
    statusText = '🔴 Inactivo';
    statusColor = '#ef4444';
  } else if (isExpired) {
    statusText = '⚫ Expirado';
    statusColor = '#9ca3af';
  } else if (isScheduled) {
    statusText = '🟡 Programado';
    statusColor = '#f59e0b';
  } else {
    statusText = '🟢 Activo';
    statusColor = '#10b981';
  }

  const typeLabel =
    coupon.type === 'percentage'
      ? `${coupon.value}% de descuento`
      : `$${coupon.value.toLocaleString()} de descuento`;

  const conditions = [];
  if (coupon.minAmount) conditions.push(`Compra mínima: $${coupon.minAmount.toLocaleString()}`);
  if (coupon.minQuantity) conditions.push(`Mín. ${coupon.minQuantity} productos`);

  return (
    <article className={`${styles.couponCard} ${isLight ? styles.couponCardLight : ''}`}>
      <div className={styles.couponHeader}>
        <span className={styles.couponCode}>{coupon.code}</span>
        <span style={{ fontSize: '.85rem', color: statusColor }}>{statusText}</span>
      </div>

      <h4 className={styles.couponType}>{typeLabel}</h4>
      {coupon.description && <p className={styles.couponDesc}>{coupon.description}</p>}

      {conditions.length > 0 && (
        <div className={styles.couponConditions}>{conditions.join(' • ')}</div>
      )}

      <div className={styles.couponDate}>
        {coupon.start || coupon.end ? `📅 ${fmtRange(coupon.start, coupon.end)}` : '📅 Sin límite de fecha'}
      </div>

      <div className={styles.couponActions}>
        <button className={styles.couponBtn} onClick={onEdit}>
          ✏️ Editar
        </button>
        <button
          className={`${styles.couponBtn} ${coupon.active ? styles.deactivate : styles.activate}`}
          onClick={onToggle}
        >
          {coupon.active ? '⏸️ Desactivar' : '▶️ Activar'}
        </button>
        <button className={`${styles.couponBtn} ${styles.delete}`} onClick={onDelete}>
          🗑️ Eliminar
        </button>
      </div>
    </article>
  );
}
