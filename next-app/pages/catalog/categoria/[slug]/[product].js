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

                {/* Badges inline with price */}
                {found.promotionBadges && found.promotionBadges.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {found.promotionBadges.map((badge, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: badge.color ? `${badge.color}${Math.round((badge.opacity ?? 100) * 2.55).toString(16).padStart(2, '0')}` : '#ef4444',
                          color: badge.textColor || '#ffffff',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {badge.text}
                      </span>
                    ))}
                  </div>
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
