// next-app/components/home/CategoryCarousel.js
// Horizontal scroll-snap carousel for a single category's products.
// Does not render if products array is empty.

import { useRouter } from 'next/router'
import ProductCard from './ProductCard'

export default function CategoryCarousel({ category, products = [] }) {
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
          {category.nombre}
        </h3>
        <button
          onClick={() => router.push(`/catalog?categoria=${category.slug}`)}
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
        .carousel-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px;
        }
        .carousel-track::-webkit-scrollbar { display: none; }
        .carousel-track { -ms-overflow-style: none; scrollbar-width: none; }
        .carousel-item {
          scroll-snap-align: start;
          flex: 0 0 220px;
          min-width: 0;
        }
        @media (max-width: 480px) {
          .carousel-item { flex: 0 0 160px; }
        }
      `}</style>

      <div className="carousel-track">
        {products.map((product) => (
          <div key={product.id} className="carousel-item">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
