import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import PublicLayout from '../../components/PublicLayout'
import stylesResp from '../../styles/catalog-responsive.module.css'
import { useCart, useProducts, useCoupons } from '../../hooks/useCatalog'
import { formatCurrency, getCurrentUser, createToast } from '../../utils/catalogUtils'

export default function CartPage() {
  const router = useRouter()
  const { cart, updateQuantity, removeItem, clearCart, totalItems, subtotal } = useCart()
  const { products } = useProducts()
  const { applyCoupon, calculateDiscount } = useCoupons()

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
    <PublicLayout title="Mi Carrito - KOND">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <button
            onClick={() => router.push('/catalog')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', padding: 0, fontSize: '0.9rem' }}
          >
            Catálogo
          </button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Mi carrito</span>
        </div>

        <h2 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
          Tu carrito {totalItems > 0 && <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>}
        </h2>

        <div className={stylesResp.cartPageLayout}>
          {/* Columna izquierda: items */}
          <div className={stylesResp.pageColumn}>
            {/* Info del usuario */}
            {currentUser && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {(currentUser.nombre || '') + (currentUser.apellido ? ' ' + currentUser.apellido : '')}
                  </span>
                  {currentUser.telefono && <span> • {currentUser.telefono}</span>}
                  {currentUser.email && <span> • {currentUser.email}</span>}
                </div>
              </div>
            )}

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧾</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>Tu carrito está vacío</div>
                <div style={{ marginBottom: 20 }}>Agrega productos desde el catálogo</div>
                <button
                  onClick={() => router.push('/catalog')}
                  style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Ver catálogo
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cart.map((item, idx) => {
                    const prod = products.find(p => String(p.id) === String(item.productId || item.idProducto))
                    const original = (item.originalPrice !== undefined && item.originalPrice !== null)
                      ? item.originalPrice
                      : (prod ? (prod.precioUnitario || prod.precio) : item.price)
                    const unitPrice = item.price !== undefined
                      ? item.price
                      : (prod ? (prod.precioPromocional || prod.precioUnitario || prod.precio) : 0)
                    const totalLine = unitPrice * item.quantity

                    return (
                      <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        <div className={stylesResp.cartItemImage}>
                          {item.image
                            ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sin foto</div>
                          }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.measures}</div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              {original > unitPrice ? (
                                <>
                                  <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(totalLine)}</div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'line-through' }}>{formatCurrency(original)}</div>
                                    <div style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 700, padding: '2px 6px', borderRadius: 8, fontSize: '0.8rem' }}>
                                      -{Math.round(((original - unitPrice) / original) * 100)}%
                                    </div>
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {formatCurrency(unitPrice)} × {item.quantity}
                                    <span style={{ color: '#059669', marginLeft: 6 }}>Ahorras {formatCurrency((original - unitPrice) * item.quantity)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(totalLine)}</div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatCurrency(unitPrice)} × {item.quantity}</div>
                                </>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 6px' }}>
                              <button aria-label="Disminuir" onClick={() => updateQuantity(idx, 'decrease')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem', color: 'var(--text-primary)' }}>−</button>
                              <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>{item.quantity}</div>
                              <button aria-label="Aumentar" onClick={() => updateQuantity(idx, 'increase')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem', color: 'var(--text-primary)' }}>+</button>
                            </div>
                            <button onClick={() => removeItem(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>Eliminar</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Cupón */}
                <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="Código de cupón"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    style={{ padding: '8px 14px', borderRadius: 6, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Aplicar
                  </button>
                </div>

                {/* Vaciar carrito */}
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button
                    onClick={() => { if (typeof window !== 'undefined' && window.confirm('¿Vaciar el carrito?')) clearCart() }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                  >
                    Vaciar carrito
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Columna derecha: resumen y acciones */}
          <div className={stylesResp.pageColumnRight}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12, fontSize: '1rem' }}>Resumen del pedido</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ color: 'var(--text-secondary)' }}>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</div>
                <div style={{ color: 'var(--text-primary)' }}>{formatCurrency(subtotal)}</div>
              </div>

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Descuento</div>
                  <div style={{ color: 'var(--accent-secondary)' }}>-{formatCurrency(discount)}</div>
                </div>
              )}

              <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>
                <div style={{ color: 'var(--text-primary)' }}>Total</div>
                <div style={{ color: 'var(--text-primary)' }}>{formatCurrency(total)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => router.push('/mi-carrito/finalizar-compra')}
                disabled={cart.length === 0}
                style={{
                  padding: '14px 10px',
                  borderRadius: 8,
                  background: cart.length === 0 ? 'var(--text-muted)' : 'var(--accent-secondary)',
                  color: 'white',
                  border: 'none',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}
              >
                Proceder al pago
              </button>

              <button
                onClick={() => router.push('/catalog')}
                style={{
                  padding: '10px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}
              >
                Seguir comprando
              </button>
            </div>

            <div style={{ marginTop: 18, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Aceptamos pago por transferencia y coordinamos por WhatsApp.
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
