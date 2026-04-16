import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import PublicLayout from './PublicLayout'
import { useCart } from '../hooks/useCatalog'
import { formatCurrency, createToast } from '../utils/catalogUtils'
import { getCatalogStyles } from '../utils/supabaseCatalogStyles'
import { slugifyPreserveCase } from '../utils/slugify'
// SectionSelector is provided by PublicLayout for /catalog routes — avoid local duplication

const SPEC_FIELDS = [
  { key: 'medidas', label: 'Medidas' },
  { key: 'material', label: 'Material' },
  { key: 'tipoMaterial', label: 'Tipo de material' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'ensamble', label: 'Ensamble' },
  { key: 'unidades', label: 'Unidades' },
]

const OMIT_VALUES = new Set(['Sin ensamble', '', null, undefined])

export default function ProductDetail({ product, categories = [] }) {
  const { addToCart } = useCart()
  const router = useRouter()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [whatsappNumber, setWhatsappNumber] = useState('1136231857')

  useEffect(() => {
    getCatalogStyles()
      .then(s => { if (s && s.whatsappNumber) setWhatsappNumber(s.whatsappNumber) })
      .catch(() => {})
  }, [])

  if (!product) return null

  const images = product.imagenes && product.imagenes.length > 0 ? product.imagenes : []
  const hasPromo = product.hasPromotion &&
    product.precioPromocional != null &&
    product.precioPromocional !== product.precioUnitario
  const displayPrice = hasPromo ? product.precioPromocional : product.precioUnitario
  const hasStock = (product.stock || 0) > 0

  const specs = SPEC_FIELDS.filter(({ key }) => {
    const val = product[key]
    return val != null && !OMIT_VALUES.has(val) && val !== 0
  })

  const waText = encodeURIComponent(`Hola, consulto por el producto: ${product.nombre}`)
  const waLink = `https://wa.me/${whatsappNumber}?text=${waText}`

  const handleAdd = () => {
    addToCart(product, qty)
    createToast(`${product.nombre} agregado al carrito`, 'success')
  }

  const handleBuyNow = () => {
    addToCart(product, qty)
    router.push('/catalog/mi-carrito')
  }

  return (
    <PublicLayout title={`${product.nombre} - KOND`}>
      <div className="pd-layout">

        {/* ── Breadcrumb ────────────────────────────────── */}
        <nav className="pd-breadcrumb">
          <Link href="/catalog" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
            Catálogo
          </Link>
          <span className="pd-sep">›</span>
          {product.categoria && (
            <>
              <span>{product.categoria}</span>
              <span className="pd-sep">›</span>
            </>
          )}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.nombre}</span>
        </nav>

        {/* Section selector removed — PublicLayout renders it centered below the header for /catalog routes */}

        {/* ── Galería de imágenes ───────────────────────── */}
        <div className="pd-images">
          <div className="pd-card" style={{ height: 'auto' }}>
            {images.length > 0 ? (
              <>
                <div className="pd-main-img-wrap">
                  <img
                    src={images[activeImg]}
                    alt={product.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                {images.length > 1 && (
                  <div className="pd-thumbs">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: 60,
                          height: 60,
                          padding: 2,
                          borderRadius: 6,
                          border: i === activeImg
                            ? '2px solid var(--accent-blue)'
                            : '2px solid var(--border-color)',
                          background: 'var(--bg-section)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                      >
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                background: 'var(--bg-section)',
                borderRadius: 8,
                fontSize: '0.9rem'
              }}>
                Sin imagen
              </div>
            )}
          </div>
        </div>

        {/* ── Nombre, precio y badges ───────────────────── */}
        <div className="pd-info-name">
          <div className="pd-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {product.categoria && (
              <span className="category-badge" style={{
                display: 'inline-block',
                alignSelf: 'flex-start',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'var(--kond-badge-bg, var(--bg-section))',
                border: '1px solid var(--border-color)'
              }}>
                {product.categoria}
              </span>
            )}

            <h1 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.3
            }}>
              {product.nombre}
            </h1>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
               <span className="product-detail-price" style={{ fontSize: '1.7rem', fontWeight: 800 }}>
                 {formatCurrency(displayPrice)}
               </span>
              {hasPromo && (
                <span style={{
                  fontSize: '1rem',
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through'
                }}>
                  {formatCurrency(product.precioUnitario)}
                </span>
              )}
            </div>

            {product.promotionBadges && product.promotionBadges.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {product.promotionBadges.map((badge, i) => (
                  <span key={i} style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: badge.color || 'var(--accent-secondary)',
                    color: badge.textColor || '#fff'
                  }}>
                    {badge.texto}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Acciones: stock · cantidad · botones · envío ─ */}
        <div className="pd-actions">
          <div className="pd-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: hasStock ? '#10b981' : '#ef4444',
                display: 'inline-block',
                flexShrink: 0
              }} />
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: hasStock ? '#10b981' : '#ef4444'
              }}>
                {hasStock ? `Stock disponible: ${product.stock} unidades` : 'Sin stock'}
              </span>
            </div>

            {/* Selector de cantidad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Cantidad
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-section)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    minHeight: 36
                  }}
                >−</button>
                <span style={{
                  padding: '6px 12px',
                  fontWeight: 600,
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  minWidth: 44,
                  textAlign: 'center',
                  fontSize: '0.95rem'
                }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-section)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    minHeight: 36
                  }}
                >+</button>
              </div>
            </div>

            {/* Botones */}
            <div className="pd-btn-group">
              {/* Fila 1: Agregar al carrito + Comprar */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAdd}
                  disabled={!hasStock}
                  className="pd-btn-primary"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '2px solid var(--kond-btn-bg, var(--accent-blue))',
                    cursor: hasStock ? 'pointer' : 'not-allowed',
                    background: 'transparent',
                    color: hasStock ? 'var(--kond-btn-bg, var(--accent-blue))' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 40,
                    opacity: hasStock ? 1 : 0.6,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {hasStock ? 'Agregar al carrito' : 'Sin stock'}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={!hasStock}
                  className="pd-btn-buy"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: hasStock ? 'pointer' : 'not-allowed',
                    background: hasStock ? 'var(--kond-btn-bg, var(--accent-blue))' : 'var(--bg-section)',
                    color: hasStock ? 'var(--kond-btn-color, #fff)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 40,
                    opacity: hasStock ? 1 : 0.6,
                    transition: 'opacity 0.2s'
                  }}
                >
                  Comprar
                </button>
              </div>

              {/* Fila 2: WhatsApp */}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pd-btn-wa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: '#25d366',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minHeight: 40,
                  textDecoration: 'none',
                  transition: 'opacity 0.2s'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.121 1.524 5.855L.057 23.214a.75.75 0 0 0 .92.92l5.356-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.519-5.215-1.423l-.374-.224-3.878 1.061 1.06-3.88-.224-.374A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Consultar por WhatsApp
              </a>
            </div>

            {/* Card de envío */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-section)',
              borderRadius: 10,
              border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🚚</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Consultá opciones de envío al finalizar tu compra
              </span>
            </div>
          </div>
        </div>

        {/* ── Especificaciones ──────────────────────────── */}
        {specs.length > 0 && (
          <div className="pd-specs">
            <div className="pd-card">
              <h2 className="pd-section-title">Especificaciones</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {specs.map(({ key, label }) => (
                  <div key={key} style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-section)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <span style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 600
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {product[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Descripción ───────────────────────────────── */}
        {product.description && (
          <div className="pd-description">
            <div className="pd-card">
              <h2 className="pd-section-title">Descripción</h2>
              <p style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                lineHeight: 1.7
              }}>
                {product.description}
              </p>
            </div>
          </div>
        )}

        {/* ── Explorar categorías ───────────────────────── */}
        {categories.length > 0 && (
          <div className="pd-categories">
            <h2 className="pd-section-title">Explorar categorías</h2>
            <div className="pd-cat-scroll">
              {categories.map(cat => {
                const isActive = cat === product.categoria
                return (
                  <Link
                    key={cat}
                    href={`/catalog/${slugifyPreserveCase(cat)}`}
                    style={{
                      display: 'inline-block',
                      padding: '10px 18px',
                      borderRadius: 10,
                      border: isActive
                        ? '2px solid var(--accent-blue)'
                        : '1px solid var(--border-color)',
                      background: isActive ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: isActive ? '#fff' : 'var(--text-primary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        /* ── Layout general (mobile-first) ──────────── */
        .pd-layout {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 12px 16px 48px;
          box-sizing: border-box;
          display: grid;
          gap: 16px;
          grid-template-areas:
            "breadcrumb"
            "images"
            "info-name"
            "actions"
            "specs"
            "description"
            "categories";
          grid-template-columns: minmax(0, 1fr);
        }

        /* ── Desktop: 2 columnas ────────────────────── */
        @media (min-width: 641px) {
          .pd-layout {
            grid-template-areas:
              "breadcrumb  breadcrumb"
              "images      info-name"
              "images      actions"
              "specs       specs"
              "description description"
              "categories  categories";
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
        }

        /* ── Asignación de áreas ─────────────────────── */
        .pd-breadcrumb  { grid-area: breadcrumb; min-width: 0; }
        .pd-images      { grid-area: images;     min-width: 0; }
        .pd-info-name   { grid-area: info-name;  min-width: 0; }
        .pd-actions     { grid-area: actions;    min-width: 0; }
        .pd-specs       { grid-area: specs;      min-width: 0; }
        .pd-description { grid-area: description; min-width: 0; }
        .pd-categories  { grid-area: categories; min-width: 0; }

        /* ── Breadcrumb ─────────────────────────────── */
        .pd-breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .pd-sep { margin: 0 6px; }

        /* ── Card base ──────────────────────────────── */
        :global(.pd-card) {
          background: var(--bg-card);
          border-radius: 12px;
          padding: 16px;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        /* ── Títulos de sección ─────────────────────── */
        :global(.pd-section-title) {
          margin: 0 0 12px 0;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* ── Imagen principal (contenedor responsive) ─── */
        .pd-main-img-wrap {
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 8px;
          background: var(--bg-section);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        /* ── Thumbnails (scroll horizontal) ─────────── */
        .pd-thumbs {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }

        /* ── Botones de acción ──────────────────────── */
        .pd-btn-group {
          display: flex;
          flex-direction: column; /* keep column so WhatsApp stays below the action row */
          gap: 10px;
          flex-wrap: wrap; /* allow inner row to occupy full width */
        }

        /* Ensure the first row (buttons) spans full width and lays out its children side-by-side */
        .pd-btn-group > div {
          width: 100%;
          display: flex;
          gap: 8px;
        }

        .pd-btn-primary,
        .pd-btn-wa {
          width: 100%;
        }

        @media (min-width: 641px) {
          /* On desktop keep the same visual order: [Agregar | Comprar] on the first row
             and [Consultar por WhatsApp] full-width below. Buttons inside the first row
             will grow equally. */
          .pd-btn-group > div {
            width: 100%;
          }

          .pd-btn-primary,
          .pd-btn-wa {
            flex: 1;
            width: auto;
          }
        }

        /* ── Categorías (scroll horizontal en mobile) ─ */
        .pd-cat-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }

        /* Mobile tweaks: limitar padding de imagen card */
        @media (max-width: 640px) {
          .pd-layout {
            gap: 12px;
            padding: 12px 12px 48px;
          }
          .pd-images :global(.pd-card) {
            padding: 8px;
          }
          /* Imagen principal: sin aspect-ratio cuadrado en mobile, altura fija */
          .pd-main-img-wrap {
            aspect-ratio: unset;
            height: 260px;
          }
          /* Thumbnails más pequeños en mobile */
          .pd-thumbs :global(button) {
            width: 48px;
            height: 48px;
          }
          /* Forzar botones compactos en mobile (override inline if needed) */
          .pd-btn-group :global(.pd-btn-primary),
          .pd-btn-group :global(.pd-btn-wa) {
            padding: 10px 16px !important;
            font-size: 0.875rem !important;
            min-height: 40px !important;
          }
        }
        /* ── Botón Comprar — microanimación ────────── */
        .pd-btn-buy {
          transition: transform 0.15s ease, opacity 0.2s;
        }
        .pd-btn-buy:hover:not(:disabled) {
          transform: scale(1.03);
        }
        .pd-btn-buy:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>
    </PublicLayout>
  )
}
