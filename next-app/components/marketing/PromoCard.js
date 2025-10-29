import styles from '../../styles/marketing.module.css';

const PROMO_TYPES = {
  percentage_discount: { label: 'Descuento Porcentual' },
  fixed_price: { label: 'Precio Fijo' },
  buy_x_get_y: { label: '2x1 / Lleva X Paga Y' },
  free_shipping: { label: 'Envío Gratis' },
  badge_only: { label: 'Solo Insignia' }
};

function getContrastColor(hexColor) {
  if (!hexColor || hexColor === 'auto') hexColor = '#3b82f6';
  if (!hexColor.startsWith('#')) hexColor = '#' + hexColor;
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function fmtRange(a, b) {
  const s = a || '';
  const e = b || '';
  if (!s && !e) return '—';
  if (s && !e) return `${s} →`;
  if (!s && e) return `→ ${e}`;
  return `${s} → ${e}`;
}

export default function PromoCard({ promo, products, onEdit, onToggle, onDelete, isLight = false }) {
  const typeConfig = PROMO_TYPES[promo.type] || {};
  const productCount = (promo.productIds || []).length;
  const productNames = (promo.productIds || [])
    .map(id => {
      const prod = products.find(p => p.id === id);
      return prod ? prod.nombre : `#${id}`;
    })
    .slice(0, 3);

  let configDesc = '';
  if (promo.config) {
    const cfg = promo.config;
    switch (promo.type) {
      case 'percentage_discount':
        configDesc = `${cfg.percentage || 0}% de descuento`;
        break;
      case 'fixed_price':
        configDesc = `Precio fijo: $${(cfg.newPrice || 0).toLocaleString()}`;
        break;
      case 'buy_x_get_y':
        configDesc = `Lleva ${cfg.buyQuantity || 1}, paga ${cfg.payQuantity || 1}`;
        break;
      case 'free_shipping':
        configDesc = `Envío gratis desde $${(cfg.minAmount || 0).toLocaleString()}`;
        break;
      case 'badge_only':
        configDesc = 'Solo insignia decorativa';
        break;
    }
  }

  let badgeTextColor = promo.textColor || '#ffffff';
  if (badgeTextColor === 'auto') {
    badgeTextColor = getContrastColor(promo.color || '#3b82f6');
  }

  return (
    <article className={`${styles.promoCard} ${isLight ? styles.promoCardLight : ''}`}>
      <div className={`${styles.promoHeader} ${isLight ? styles.promoHeaderLight : ''}`}>
        <span className={styles.promoType}>{typeConfig.label || promo.type}</span>
        <span className={`${styles.promoStatus} ${promo.active ? styles.active : styles.inactive}`}>
          <span className={styles.statusDot}></span>
          {promo.active ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className={styles.promoTitleContainer}>
        {promo.badge && (
          <span
            className={styles.promoBadge}
            style={{ background: promo.color || '#3b82f6', color: badgeTextColor }}
          >
            {promo.badge}
          </span>
        )}
        <h3 className={styles.promoTitle}>{promo.title || 'Promoción sin título'}</h3>
      </div>

      {promo.summary && <p className={styles.promoSummary}>{promo.summary}</p>}

      {configDesc && <div className={styles.promoConfig}>{configDesc}</div>}

      <div className={styles.promoDetails}>
        <div className={styles.promoDetail}>
          <span className={styles.detailIcon}>📅</span>
          <span className={styles.detailText}>{fmtRange(promo.start, promo.end)}</span>
        </div>
        <div className={styles.promoDetail}>
          <span className={styles.detailIcon}>🎯</span>
          <span className={styles.detailText}>
            {productCount} producto{productCount !== 1 ? 's' : ''}
            {productNames.length > 0
              ? `: ${productNames.join(', ')}${productCount > 3 ? '...' : ''}`
              : ''}
          </span>
        </div>
        {promo.tags && promo.tags.length > 0 && (
          <div className={styles.promoDetail}>
            <span className={styles.detailIcon}>🏷️</span>
            <span className={styles.detailText}>{promo.tags.join(', ')}</span>
          </div>
        )}
      </div>

      <div className={styles.promoActions}>
        <button className={`${styles.cardBtn} ${styles.btnEdit}`} onClick={onEdit}>
          <span className={styles.btnIcon}>✏️</span>
          Editar
        </button>
        <button
          className={`${styles.cardBtn} ${styles.btnToggle} ${promo.active ? styles.deactivate : styles.activate}`}
          onClick={onToggle}
        >
          <span className={styles.btnIcon}>{promo.active ? '⏸️' : '▶️'}</span>
          {promo.active ? 'Desactivar' : 'Activar'}
        </button>
        <button className={`${styles.cardBtn} ${styles.btnDelete}`} onClick={onDelete}>
          <span className={styles.btnIcon}>🗑️</span>
          Eliminar
        </button>
      </div>
    </article>
  );
}
