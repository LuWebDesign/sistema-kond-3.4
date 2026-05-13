// next-app/components/home/ProductCard.js
// Presentational product card for the Megafibro home page.
// Shows image, name, price, and optional promo badge.

import { useRouter } from 'next/router'

function isPromoActive(product) {
  if (!product.allow_promotions || !product.static_promo_price) return false
  const now = new Date()
  if (product.static_promo_start) {
    const start = new Date(product.static_promo_start)
    if (!isNaN(start.getTime()) && start > now) return false
  }
  if (product.static_promo_end) {
    const end = new Date(product.static_promo_end)
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999)
      if (end < now) return false
    }
  }
  return true
}

function formatPrice(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function ProductCard({ product, onClick }) {
  const router = useRouter()
  const imageUrl = product.imagenes_urls?.[0] || null
  const promoActive = isPromoActive(product)

  const handleClick = () => {
    if (onClick) { onClick(product); return }
    router.push('/catalog')
  }

  return (
    <div
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'var(--card-bg, #1a1a2e)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '75%', background: '#111' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.nombre}
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)',
            fontSize: '2.5rem',
          }}>
            📦
          </div>
        )}
        {/* Promo badge */}
        {promoActive && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#e63946',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '100px',
            letterSpacing: '0.5px',
          }}>
            {product.promo_badge || 'OFERTA'}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary, #f1f5f9)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
        }}>
          {product.nombre}
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {promoActive ? (
            <>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#e63946' }}>
                {formatPrice(product.static_promo_price)}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', textDecoration: 'line-through' }}>
                {formatPrice(product.precio_unitario)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
              {formatPrice(product.precio_unitario)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
