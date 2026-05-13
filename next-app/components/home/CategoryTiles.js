// next-app/components/home/CategoryTiles.js
// 2-column category tile grid with background images from first product in each category.

import { useRouter } from 'next/router'

export default function CategoryTiles({ categories = [], byCategory = {} }) {
  const router = useRouter()

  if (!categories.length) return null

  return (
    <section style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--text-primary, #f1f5f9)',
        marginBottom: '20px',
        letterSpacing: '-0.3px',
      }}>
        Categorías
      </h2>

      <style jsx>{`
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 540px) {
          .cat-grid {
            grid-template-columns: 1fr;
          }
        }
        .cat-tile {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          min-height: 180px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cat-tile:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.3);
        }
        .cat-tile-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: transform 0.35s ease;
        }
        .cat-tile:hover .cat-tile-bg {
          transform: scale(1.05);
        }
        .cat-tile-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 60%, transparent 100%);
        }
        .cat-tile-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 20px 20px 18px;
          color: #fff;
        }
      `}</style>

      <div className="cat-grid">
        {categories.map((cat) => {
          const products = byCategory[cat.id] || []
          const bgImage = products[0]?.imagenes_urls?.[0] || null

          return (
            <div
              key={cat.id}
              className="cat-tile"
              onClick={() => router.push(`/catalog?categoria=${cat.slug}`)}
            >
              <div
                className="cat-tile-bg"
                style={bgImage
                  ? { backgroundImage: `url(${bgImage})` }
                  : { background: 'linear-gradient(135deg, #1a6b3c 0%, #0d4a28 100%)' }
                }
              />
              <div className="cat-tile-overlay" />
              <div className="cat-tile-content">
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
                  {cat.nombre}
                </h3>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.3px',
                }}>
                  Ver más →
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
