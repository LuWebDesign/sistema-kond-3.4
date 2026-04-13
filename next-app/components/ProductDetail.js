import React, { useState } from 'react'
import Link from 'next/link'
import PublicLayout from './PublicLayout'
import { useCart } from '../hooks/useCatalog'
import { formatCurrency, createToast } from '../utils/catalogUtils'

export default function ProductDetail({ product }) {
  const { addToCart } = useCart()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)

  if (!product) return null

  const images = product.imagenes && product.imagenes.length > 0 ? product.imagenes : []
  const hasPromo = product.hasPromotion && product.precioPromocional != null && product.precioPromocional !== product.precioUnitario
  const displayPrice = hasPromo ? product.precioPromocional : product.precioUnitario
  const hasStock = (product.stock || 0) > 0

  const handleAdd = () => {
    addToCart(product, qty)
    createToast(`${product.nombre} agregado al carrito`, 'success')
  }

  return (
    <PublicLayout title={`${product.nombre} - KOND`}>
      <div style={{ padding: '16px 20px', maxWidth: 1000, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <nav style={{
          marginBottom: 20,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap'
        }}>
          <Link href="/catalog" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
            Catálogo
          </Link>
          <span>›</span>
          {product.categoria && (
            <>
              <span>{product.categoria}</span>
              <span>›</span>
            </>
          )}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.nombre}</span>
        </nav>

        {/* Main Grid */}
        <div className="product-detail-grid">

          {/* Panel de imagen */}
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
            {images.length > 0 ? (
              <>
                <div style={{
                  aspectRatio: '1 / 1',
                  overflow: 'hidden',
                  borderRadius: 8,
                  background: 'var(--bg-section)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={images[activeImg]}
                    alt={product.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: 56,
                          height: 56,
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

          {/* Panel de información */}
          <div style={{
            background: 'var(--bg-card)',
            padding: 20,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>

            {/* Badge de categoría */}
            {product.categoria && (
              <div>
                <span className="category-badge" style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: 'var(--kond-badge-bg, var(--bg-section))',
                  color: 'var(--kond-badge-color, var(--text-secondary))',
                  border: '1px solid var(--border-color)'
                }}>
                  {product.categoria}
                </span>
              </div>
            )}

            {/* Nombre */}
            <h1 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.3
            }}>
              {product.nombre}
            </h1>

            {/* Precio */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
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

            {/* Badges de promoción */}
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

            {/* Medidas */}
            {product.medidas && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Medidas:</span>{' '}
                {product.medidas}
              </div>
            )}

            {/* Indicador de stock */}
            <div style={{ alignSelf: 'flex-start' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 600,
                background: hasStock ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: hasStock ? '#10b981' : '#ef4444'
              }}>
                {hasStock ? `Stock: ${product.stock}` : 'Sin stock'}
              </span>
            </div>

            {/* Descripción */}
            {product.descripcion && (
              <p style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.7
              }}>
                {product.descripcion}
              </p>
            )}

            {/* Cantidad + Botón agregar */}
            <div style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginTop: 'auto',
              paddingTop: 8,
              flexWrap: 'wrap'
            }}>
              {/* Selector de cantidad */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0
              }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-section)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1
                  }}
                >
                  −
                </button>
                <span style={{
                  padding: '8px 14px',
                  fontWeight: 600,
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  minWidth: 36,
                  textAlign: 'center',
                  fontSize: '0.95rem'
                }}>
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-section)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1
                  }}
                >
                  +
                </button>
              </div>

              {/* Botón agregar */}
              <button
                onClick={handleAdd}
                disabled={!hasStock}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: hasStock ? 'pointer' : 'not-allowed',
                  background: hasStock
                    ? 'var(--kond-btn-bg, var(--accent-blue))'
                    : 'var(--bg-section)',
                  color: hasStock
                    ? 'var(--kond-btn-color, #fff)'
                    : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'opacity 0.2s',
                  opacity: hasStock ? 1 : 0.6
                }}
              >
                {hasStock ? 'Agregar al carrito' : 'Sin stock'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .product-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 24px;
        }
        @media (max-width: 640px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </PublicLayout>
  )
}
