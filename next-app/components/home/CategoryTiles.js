// next-app/components/home/CategoryTiles.js
// Horizontal scrolling carousel of vertical rectangle cards.
// Each card has a background image, gradient overlay, and category name.

import { useRouter } from 'next/router'

export default function CategoryTiles({ categories = [], byCategory = {} }) {
  const router = useRouter()

  if (!categories.length) return null

  return (
    <section style={{ padding: '32px 0', maxWidth: '100%' }}>
      <h2 style={{
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--text-primary, #f1f5f9)',
        marginBottom: '20px',
        letterSpacing: '-0.3px',
        paddingLeft: '24px',
      }}>
        Categorías
      </h2>

      <style jsx>{`
        .cat-carousel {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 4px 24px 16px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .cat-carousel::-webkit-scrollbar {
          height: 4px;
        }
        .cat-carousel::-webkit-scrollbar-track {
          background: transparent;
        }
        .cat-carousel::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .cat-carousel::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        .cat-card {
          position: relative;
          flex-shrink: 0;
          width: 150px;
          height: 210px;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        @media (min-width: 640px) {
          .cat-card {
            width: 170px;
            height: 240px;
          }
        }
        .cat-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 36px rgba(0,0,0,0.35);
        }
        .cat-card-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: transform 0.35s ease;
        }
        .cat-card:hover .cat-card-bg {
          transform: scale(1.07);
        }
        .cat-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0,0,0,0.82) 0%,
            rgba(0,0,0,0.3) 50%,
            rgba(0,0,0,0.05) 100%
          );
        }
        .cat-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 14px 14px;
          color: #fff;
        }
        .cat-card-name {
          margin: 0 0 6px;
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.1px;
        }
        .cat-card-cta {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.15);
          padding: 3px 9px;
          border-radius: 100px;
          letter-spacing: 0.2px;
        }
      `}</style>

      <div className="cat-carousel">
        {categories.map((cat) => {
          const products = byCategory[cat.id] || []
          const bgImage = products[0]?.imagenes_urls?.[0] || null

          return (
            <div
              key={cat.id}
              className="cat-card"
              onClick={() => router.push(`/catalog/${cat.slug}`)}
            >
              <div
                className="cat-card-bg"
                style={bgImage
                  ? { backgroundImage: `url(${bgImage})` }
                  : { background: 'linear-gradient(160deg, #1a6b3c 0%, #0d3d22 100%)' }
                }
              />
              <div className="cat-card-overlay" />
              <div className="cat-card-content">
                <h3 className="cat-card-name">{cat.nombre}</h3>
                <span className="cat-card-cta">Ver más →</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
