import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import stylesResp from '../styles/catalog-responsive.module.css'
import { useCart, useProducts, useCoupons } from '../hooks/useCatalog'
import { formatCurrency, getCurrentUser, createToast } from '../utils/catalogUtils'

export default function CartModal({ onClose }) {
  const router = useRouter()
  const { cart, updateQuantity, removeItem, clearCart, totalItems, subtotal } = useCart()
  const { products } = useProducts()
  const { activeCoupon, applyCoupon, calculateDiscount } = useCoupons()

  const [couponInput, setCouponInput] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    try {
      const u = getCurrentUser()
      setCurrentUser(u)
    } catch (e) {
      setCurrentUser(null)
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleApplyCoupon = () => {
    if (!couponInput) return
    try {
      const result = applyCoupon(couponInput, cart, subtotal)
      createToast(result.message, result.success ? 'success' : 'error')
      if (result.success) setCouponInput('')
    } catch (e) {
      createToast('Error al aplicar cupón', 'error')
    }
  }

  const discount = calculateDiscount(subtotal)
  const total = Math.max(0, subtotal - discount)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={stylesResp.cartModalDialog} style={{ background: 'var(--bg-card)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
        {/* Left column: header + items */}
        <div className={stylesResp.modalLeft}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🛒 Tu carrito</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {currentUser ? (
                <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(currentUser.nombre || '') + (currentUser.apellido ? ' ' + currentUser.apellido : '')}</div>
                  <div>{currentUser.telefono || ''} {currentUser.email ? '• ' + currentUser.email : ''}</div>
                </div>
              ) : null}
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>

           {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 8px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧾</div>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Tu carrito está vacío</div>
              <div style={{ color: 'var(--text-secondary)' }}>Agrega productos desde el catálogo</div>
            </div>
           ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div className={stylesResp.cartItemImage}>
                    {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No foto</div>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.measures}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {(() => {
                          const prod = products.find(p => String(p.id) === String(item.productId || item.idProducto))
                          const original = (item.originalPrice !== undefined && item.originalPrice !== null) ? item.originalPrice : (prod ? (prod.precioUnitario || prod.precio) : item.price)
                          const unitPrice = item.price !== undefined ? item.price : (prod ? (prod.precioPromocional || prod.precioUnitario || prod.precio) : 0)
                          const totalLine = unitPrice * item.quantity

                          if (original > unitPrice) {
                            const savings = (original - unitPrice) * item.quantity
                            const percent = Math.round(((original - unitPrice) / original) * 100)
                            return (
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(totalLine)}</div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'line-through' }}>{formatCurrency(original)}</div>
                                  <div style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 700, padding: '2px 6px', borderRadius: 8, fontSize: '0.8rem' }}>-{percent}%</div>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatCurrency(unitPrice)} × {item.quantity} <span style={{ color: '#059669', marginLeft: 8 }}>Ahorras {formatCurrency(savings)}</span></div>
                              </div>
                            )
                          }

                          return (
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(unitPrice * item.quantity)}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatCurrency(unitPrice)} × {item.quantity}</div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 10, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 6px' }}>
                        <button aria-label="Disminuir" onClick={() => updateQuantity(idx, 'decrease')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}>−</button>
                        <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</div>
                        <button aria-label="Aumentar" onClick={() => updateQuantity(idx, 'increase')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}>+</button>
                      </div>

                      <button onClick={() => removeItem(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>Eliminar</button>
                    </div>
                  </div>
                </div>
               ))}

               <div style={{ marginTop: 6, padding: 12, borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Código de cupón" style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} />
                <button onClick={handleApplyCoupon} style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer' }}>Aplicar</button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: summary/actions */}
        <div className={stylesResp.modalRight}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ color: 'var(--text-secondary)' }}>Resumen</div>
            <div style={{ fontWeight: 700 }}>{cart.length} items</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ color: 'var(--text-secondary)' }}>Subtotal</div>
            <div>{formatCurrency(subtotal)}</div>
          </div>

          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: 'var(--text-secondary)' }}>Descuento</div>
              <div style={{ color: 'var(--accent-secondary)' }}>- {formatCurrency(discount)}</div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>
            <div>Total</div>
            <div>{formatCurrency(total)}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => router.push('/catalog/mi-carrito/finalizar-compra')} disabled={cart.length === 0} style={{ padding: '12px 10px', borderRadius: 8, background: 'var(--accent-secondary)', color: 'white', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700 }}>Proceder al pago</button>

            <button onClick={onClose} style={{ padding: '10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>Seguir comprando</button>
          </div>

          <div style={{ marginTop: 18, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Aceptamos pago por transferencia y coordinamos por WhatsApp.</div>
        </div>
      </div>
    </div>
  )
}
