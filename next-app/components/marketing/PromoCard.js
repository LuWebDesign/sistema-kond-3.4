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
  const typeConfig = PROMO_TYPES[promo.tipo] || {};
  
  // Determinar qué productos aplican según aplicaA
  let aplicaDesc = '';
  if (promo.aplicaA === 'todos') {
    aplicaDesc = 'Todos los productos';
  } else if (promo.aplicaA === 'categoria') {
    aplicaDesc = `Categoría: ${promo.categoria || 'No especificada'}`;
  } else if (promo.aplicaA === 'producto') {
    const prod = products.find(p => p.id === promo.productoId);
    aplicaDesc = prod ? `Producto: ${prod.nombre}` : `Producto #${promo.productoId}`;
  }

  let configDesc = '';
  if (promo.descuentoPorcentaje) {
    configDesc = `${promo.descuentoPorcentaje}% de descuento`;
  } else if (promo.precioEspecial) {
    configDesc = `Precio especial: $${promo.precioEspecial.toLocaleString()}`;
  } else if (promo.descuentoMonto) {
    configDesc = `Monto mínimo: $${promo.descuentoMonto.toLocaleString()}`;
  } else if (promo.tipo === 'badge_only') {
    configDesc = 'Solo insignia decorativa';
  }

  let badgeTextColor = promo.badgeTextColor || '#ffffff';
  if (badgeTextColor === 'auto') {
    badgeTextColor = getContrastColor(promo.badgeColor || '#3b82f6');
  }

  return (
    <article className={`${styles.promoCard} ${isLight ? styles.promoCardLight : ''}`}>
      <div className={`${styles.promoHeader} ${isLight ? styles.promoHeaderLight : ''}`}>
        <span className={styles.promoType}>{typeConfig.label || promo.tipo}</span>
        <span className={`${styles.promoStatus} ${promo.activo ? styles.active : styles.inactive}`}>
          <span className={styles.statusDot}></span>
          {promo.activo ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className={styles.promoTitleContainer}>
        {promo.badgeTexto && (
          <span
            className={styles.promoBadge}
            style={{ background: promo.badgeColor || '#3b82f6', color: badgeTextColor }}
          >
            {promo.badgeTexto}
          </span>
        )}
        <h3 className={styles.promoTitle}>{promo.nombre || 'Promoción sin nombre'}</h3>
      </div>

      {promo.summary && <p className={styles.promoSummary}>{promo.summary}</p>}

      {configDesc && <div className={styles.promoConfig}>{configDesc}</div>}

      <div className={styles.promoDetails}>
        <div className={styles.promoDetail}>
          <span className={styles.detailIcon}>�</span>
          <span className={styles.detailText}>{configDesc || 'Sin configuración'}</span>
        </div>
        <div className={styles.promoDetail}>
          <span className={styles.detailIcon}>📅</span>
          <span className={styles.detailText}>{fmtRange(promo.fechaInicio, promo.fechaFin)}</span>
        </div>
        <div className={styles.promoDetail}>
          <span className={styles.detailIcon}>🎯</span>
          <span className={styles.detailText}>{aplicaDesc}</span>
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
          className={`${styles.cardBtn} ${styles.btnToggle} ${promo.activo ? styles.deactivate : styles.activate}`}
          onClick={onToggle}
        >
          <span className={styles.btnIcon}>{promo.activo ? '⏸️' : '▶️'}</span>
          {promo.activo ? 'Desactivar' : 'Activar'}
        </button>
        <button className={`${styles.cardBtn} ${styles.btnDelete}`} onClick={onDelete}>
          <span className={styles.btnIcon}>🗑️</span>
          Eliminar
        </button>
      </div>
    </article>
  );
}
