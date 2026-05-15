// next-app/components/home/CategoryTiles.js
// Horizontal scrolling carousel of vertical rectangle cards.
// Each card has a background image, gradient overlay, and category name.
// Shows 2 cards on mobile and 6 cards on desktop; prev/next arrow buttons.

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CategoryTiles({ categories = [], byCategory = {} }) {
  const router = useRouter()
  const carouselRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = carouselRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = carouselRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [categories])

  const scroll = (dir) => {
    const el = carouselRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  if (!categories.length) return null

  return (
    <section style={{ padding: '32px 0', maxWidth: '100%', position: 'relative' }}>
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
        .cat-wrapper {
          position: relative;
        }
        .cat-carousel {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 4px 24px 16px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .cat-carousel::-webkit-scrollbar {
          display: none;
        }
        .cat-card {
          position: relative;
          flex-shrink: 0;
          /* 2 visible on mobile: (100vw - 2*24px padding - 14px gap) / 2 */
          width: calc((100vw - 62px) / 2);
          height: 210px;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        @media (min-width: 640px) {
          .cat-card {
            /* 6 visible on desktop: (100vw - 2*24px padding - 5*14px gaps) / 6 */
            width: calc((100vw - 118px) / 6);
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
        /* Arrow buttons */
        .cat-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.92);
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
          transition: background 0.15s, transform 0.15s;
          color: #1e293b;
        }
        .cat-arrow:hover {
          background: #fff;
          transform: translateY(-50%) scale(1.08);
        }
        .cat-arrow-prev { left: 6px; }
        .cat-arrow-next { right: 6px; }
        .cat-arrow svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
      `}</style>

      <div className="cat-wrapper">
        {/* Prev arrow */}
        {canScrollLeft && (
          <button className="cat-arrow cat-arrow-prev" onClick={() => scroll('prev')} aria-label="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="cat-carousel" ref={carouselRef}>
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

        {/* Next arrow */}
        {canScrollRight && (
          <button className="cat-arrow cat-arrow-next" onClick={() => scroll('next')} aria-label="Siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}
