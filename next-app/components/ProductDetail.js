import React from 'react'
import PublicLayout from './PublicLayout'
import { formatCurrency } from '../utils/catalogUtils'

export default function ProductDetail({ product }) {
  if (!product) return null

  return (
    <PublicLayout title={`${product.nombre} - KOND`}>
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
            {product.imagen ? (
              <img src={product.imagen} alt={product.nombre} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Sin imagen</div>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
            <h1 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{product.nombre}</h1>
            {product.categoria && <div style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>{product.categoria}</div>}
            {product.medidas && <p style={{ color: 'var(--text-secondary)' }}>{product.medidas}</p>}
            <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
              {product.precioUnitario ? formatCurrency(product.precioUnitario) : ''}
            </p>
            <div style={{ marginTop: 12 }}>
              <p style={{ color: 'var(--text-secondary)' }}>{product.descripcion || 'Sin descripción disponible.'}</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
