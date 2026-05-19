// next-app/components/home/ProductCard.js
// Presentational product card for the Megafibro home page.
// Supports both dynamic promos (from promo engine via API enrichment)
// and static promos (static_promo_price / promo_badge from DB).

import { useRouter } from 'next/router'
import { slugifyPreserveCase } from '../../utils/slugify'

function formatPrice(n) {
  if (!n && n !== 0) return null
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function ProductCard({ product, categorySlug, onClick }) {
  const router = useRouter()
  const imageUrl = product.imagenes_urls?.[0] || null
  const price = formatPrice(product.precio_unitario)

  // Dynamic promos (enriched by API via promo engine)
  const hasDynamicPromo = product.hasPromotion && product.precioPromocional != null && product.precioPromocional < product.precio_unitario
  const dynamicPromoPrice = formatPrice(product.precioPromocional)
  const dynamicBadges = product.promotionBadges || []

  // Static promos (from DB columns)
  const hasStaticPromo = product.static_promo_price != null && product.static_promo_price < product.precio_unitario
  const staticPromoPrice = formatPrice(product.static_promo_price)
  const staticBadge = product.promo_badge || null

  // Prefer dynamic promos; fall back to static
  const hasPromo = hasDynamicPromo || hasStaticPromo
  const promoPrice = hasDynamicPromo ? dynamicPromoPrice : staticPromoPrice
  const badges = hasDynamicPromo ? dynamicBadges : (staticBadge ? [{ text: staticBadge, color: '#3b82f6', textColor: '#fff' }] : [])

  const handleClick = () => {
    if (onClick) { onClick(product); return }
    if (categorySlug) {
      const productSlug = slugifyPreserveCase(product.nombre).toLowerCase()
      router.push(`/catalog/${categorySlug}/${productSlug}`)
    } else {
      router.push('/catalog')
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '75%', background: '#f8fafc' }}>
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
            color: '#cbd5e1',
            fontSize: '2.5rem',
          }}>
            📦
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary, #1e293b)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
        }}>
          {product.nombre}
        </p>

        {/* Price block: crossed-out price above, promo price below, badge to the right */}
        {hasPromo ? (
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                {price}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-blue, #3b82f6)' }}>
                {promoPrice}
              </span>
            </div>
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {badges.map((b, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: b.color || '#3b82f6',
                      color: b.textColor || '#fff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : price ? (
          <span style={{ marginTop: 'auto', fontSize: '0.95rem', fontWeight: 700, color: '#000' }}>
            {price}
          </span>
        ) : null}
      </div>
    </div>
  )
}
