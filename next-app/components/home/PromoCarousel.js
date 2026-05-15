// next-app/components/home/PromoCarousel.js
// Horizontal scroll-snap carousel for promo products.
// Shows products with static_promo_price, links to their category in /catalog.

import { useRouter } from 'next/router'
import ProductCard from './ProductCard'

export default function PromoCarousel({ products = [], label = 'En Promoción', categorySlugMap = {} }) {
  const router = useRouter()

  if (!products.length) return null

  return (
    <section style={{ padding: '24px 24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--text-primary, #f1f5f9)',
        }}>
          {label}
        </h3>
        <button
          onClick={() => router.push('/catalog')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#1a6b3c',
            padding: 0,
          }}
        >
          Ver todo →
        </button>
      </div>

      {/* Scroll track */}
      <style jsx>{`
        .promo-carousel-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px;
        }
        .promo-carousel-track::-webkit-scrollbar { display: none; }
        .promo-carousel-track { -ms-overflow-style: none; scrollbar-width: none; }
        .promo-carousel-item {
          scroll-snap-align: start;
          flex: 0 0 calc((100% - 3 * 14px) / 4);
          min-width: 0;
        }
        @media (max-width: 768px) {
          .promo-carousel-item { flex: 0 0 calc((100% - 14px) / 2); }
        }
        @media (max-width: 480px) {
          .promo-carousel-item { flex: 0 0 160px; }
        }
      `}</style>

      <div className="promo-carousel-track">
        {products.map((product) => {
          const slug = categorySlugMap[product.categoria_id] || ''
          return (
            <div key={product.id} className="promo-carousel-item">
              <ProductCard
                product={product}
                onClick={() => router.push(`/catalog${slug ? `/${slug}` : ''}`)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
