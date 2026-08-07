// next-app/components/home/ProductCard.js
// Presentational product card for the Megafibro home page.
// Supports both dynamic promos (from promo engine via API enrichment)
// and static promos (static_promo_price / promo_badge from DB).
//
// Badge placement:
//   - transfer_discount badges → next to the transfer price
//   - other badges → next to the effective price

import { useRouter } from 'next/router'
import { slugifyPreserveCase } from '../../utils/slugify'
import { applyTransferDiscount, getActivePromotions, getTransferPresentation } from '../../utils/promoEngine'

function formatPrice(n) {
  if (!n && n !== 0) return null
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function ProductCard({ product, categorySlug, onClick, activePromotions = [] }) {
  const router = useRouter()
  const imageUrl = product.imagenes_urls?.[0] || null
  const basePrice = Number(product.precio_unitario) || 0
  const price = formatPrice(basePrice)

  // Dynamic promos (enriched by API via promo engine)
  const dynamicBadges = product.promotionBadges || []
  const hasDynamicPromo = product.hasPromotion && product.precioPromocional != null && product.precioPromocional < basePrice
  const dynamicPrice = hasDynamicPromo ? Number(product.precioPromocional) : null
  const dynamicPromoPrice = formatPrice(product.precioPromocional)

  // Static promos (from DB columns)
  const staticPrice = product.static_promo_price != null ? Number(product.static_promo_price) : null
  const hasStaticPromo = staticPrice != null && staticPrice < basePrice
  const staticPromoPrice = formatPrice(product.static_promo_price)
  const staticBadge = product.promo_badge || null

  // Keep transfer badges separate so they only appear beside the transfer price.
  const transferBadges = dynamicBadges.filter(b => b.type === 'transfer_discount')
  const priceBadges = dynamicBadges.filter(b => b.type !== 'transfer_discount')

  // Static badge (no type info) → treat as price badge
  const staticPriceBadges = staticBadge ? [{ text: staticBadge, color: '#3b82f6', textColor: '#fff' }] : []

  // Price reduction: dynamic or static
  const hasPromo = hasDynamicPromo || hasStaticPromo
  const promoPrice = hasDynamicPromo ? dynamicPromoPrice : staticPromoPrice
  const effectivePrice = hasDynamicPromo ? dynamicPrice : hasStaticPromo ? staticPrice : basePrice
  const activeTransferPromo = getActivePromotions(activePromotions).find(p => (p.tipo || p.type) === 'transfer_discount')
  const transferPresentation = getTransferPresentation(activeTransferPromo)
  const transferDiscount = activeTransferPromo ? applyTransferDiscount(activePromotions, effectivePrice) : 0
  const transferPrice = transferDiscount > 0 ? effectivePrice - transferDiscount : null

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
        position: 'relative',
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

        {/* Price block with price-reducing badges */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasPromo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                {price}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-blue, #3b82f6)' }}>
                {promoPrice}
              </span>
            </div>
          ) : price ? (
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#000' }}>
              {price}
            </span>
          ) : null}

          {priceBadges.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {priceBadges.map((b, idx) => (
                <span
                  key={idx}
                  style={{
                    background: b.color ? `${b.color}${Math.round((b.opacity ?? 100) * 2.55).toString(16).padStart(2, '0')}` : '#3b82f6',
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
        {transferPrice !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
              {formatPrice(transferPrice)}
            </span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {transferPresentation.mode === 'badge' && transferBadges.map((b, idx) => {
                const opacity = b.opacity ?? 100
                const bgColor = b.color || '#10b981'
                const hex = bgColor.replace('#', '')
                const r = parseInt(hex.substring(0, 2), 16)
                const g = parseInt(hex.substring(2, 4), 16)
                const bVal = parseInt(hex.substring(4, 6), 16)
                return (
                  <span key={idx} style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: hex.length === 6 ? `rgba(${r}, ${g}, ${bVal}, ${opacity / 100})` : bgColor,
                    color: b.textColor || '#fff',
                    whiteSpace: 'nowrap',
                  }}>
                    {b.text}
                  </span>
                )
              })}
              {transferPresentation.mode === 'compact_text' && transferPresentation.text && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                  {transferPresentation.text}
                </span>
              )}
            </div>
          </div>
        )}
        {transferPrice !== null && transferPresentation.mode === 'compact_text' && transferPresentation.explanation && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.35 }}>
            {transferPresentation.explanation}
          </div>
        )}
      </div>
    </div>
  )
}
