import { useEffect } from 'react'
import Link from 'next/link'
import PublicLayout from '../../../../components/PublicLayout'
import { useProducts } from '../../../../hooks/useCatalog'
import { slugifyPreserveCase } from '../../../../utils/slugify'
import { formatCurrency } from '../../../../utils/catalogUtils'

export default function ProductPage({ params }) {
  const { products } = useProducts()
  const { slug: categorySlug, product } = params || {}

  // find product by matching slugified category and product name
  const found = (products || []).find(p => {
    const catSlug = slugifyPreserveCase(p.categoria)
    const prodSlug = slugifyPreserveCase(p.nombre)
    return catSlug === categorySlug && prodSlug === product
  })

  useEffect(() => {
    // noop
  }, [found])

  if (!found) {
    return (
      <PublicLayout title="Producto - KOND">
        <div style={{ padding: 24 }}>
          <h2>Producto no encontrado</h2>
          <p>El producto solicitado no existe o fue movido. Volver al catálogo.</p>
          <Link href="/catalog">Volver al catálogo</Link>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout title={`${found.nombre} - KOND`}>
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
            {found.imagen ? (
              <img src={found.imagen} alt={found.nombre} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Sin imagen</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Block 1: Title only */}
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
              <h1 style={{ marginTop: 0, marginBottom: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>{found.nombre}</h1>
            </div>

            {/* Block 2: Price + Promo + Badges */}
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Precio
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {found.hasPromotion && found.precioPromocional !== undefined && found.precioPromocional !== found.precioUnitario ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                      {formatCurrency(found.precioUnitario || 0)}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      {formatCurrency(found.precioPromocional)}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {formatCurrency(found.precioUnitario || 0)}
                  </div>
                )}

                {/* Badges inline with price (dynamic from promo engine) */}
                {found.promotionBadges && found.promotionBadges.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {found.promotionBadges.map((badge, idx) => {
                      const opacity = badge.opacity ?? 100
                      const bgColor = badge.color || '#ef4444'
                      // Convertir hex a rgb para aplicar opacidad
                      const hex = bgColor.replace('#', '')
                      const r = parseInt(hex.substring(0, 2), 16)
                      const g = parseInt(hex.substring(2, 4), 16)
                      const b = parseInt(hex.substring(4, 6), 16)
                      return (
                        <span
                          key={idx}
                          style={{
                            background: `rgba(${r}, ${g}, ${b}, ${opacity / 100})`,
                            color: badge.textColor || '#ffffff',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {badge.text}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Static badge desde la columna promo_badge del producto (fallback) */}
                {found.promoBadge && (!found.promotionBadges || found.promotionBadges.length === 0) && (
                  <span style={{
                    background: '#3b82f6',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {found.promoBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Block 3: Description */}
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Descripción
              </div>
              <p style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                {found.description || 'Sin descripción disponible.'}
              </p>
            </div>

            {/* Block 4: Measures */}
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Medidas / Especificaciones
              </div>
              <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                {found.medidas || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}

export async function getServerSideProps(context) {
  return { props: { params: context.params } }
}
