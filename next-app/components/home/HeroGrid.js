// next-app/components/home/HeroGrid.js
// Featured products grid — 4 cols desktop, 2 cols tablet/mobile.
// Does not render if products array is empty.

import ProductCard from './ProductCard'

export default function HeroGrid({ products = [] }) {
  if (!products.length) return null

  return (
    <section style={{ padding: '48px 24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--text-primary, #f1f5f9)',
        marginBottom: '24px',
        letterSpacing: '-0.3px',
      }}>
        Productos Destacados
      </h2>

      <style jsx>{`
        .hero-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .hero-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>

      <div className="hero-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
