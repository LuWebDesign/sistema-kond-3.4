import PublicLayout from '../components/PublicLayout'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import { useProducts, useCart, useCoupons, useOrders } from '../hooks/useCatalog'
import { 
  formatCurrency, 
  generateWhatsAppMessage, 
  validateCheckoutForm, 
  getCurrentUser,
  createToast,
  compressImage
} from '../utils/catalogUtils'
import { useState, useEffect } from 'react'
import stylesResp from '../styles/catalog-responsive.module.css'

export default function Catalog() {
  const { products, categories } = useProducts()
  const { cart, addToCart, updateQuantity, removeItem, clearCart, totalItems, subtotal } = useCart()
  const { activeCoupon, applyCoupon, calculateDiscount } = useCoupons()
  const { saveOrder } = useOrders()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState('order') // 'order' | 'edit'
  const [currentUserState, setCurrentUserState] = useState(getCurrentUser())
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(null)

  // Efecto de prueba para verificar que createToast funciona
  useEffect(() => {
    console.log('🚀 Componente Catalog montado')
    console.log('📦 createToast disponible:', typeof createToast)
    
    // Test de notificación al cargar
    const timer = setTimeout(() => {
      console.log('🔔 Intentando mostrar toast de bienvenida...')
      createToast('¡Bienvenido al catálogo!', 'info', 2000)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  // Handle profile updates from checkout editor
  const handleProfileUpdated = (updated) => {
    try {
      if (!updated) return
      localStorage.setItem('currentUser', JSON.stringify(updated))
      setCurrentUserState(updated)
      // inform other parts if there's a global hook
      if (window.KONDAuth && typeof window.KONDAuth.updateProfile === 'function') {
        try { window.KONDAuth.updateProfile(updated) } catch (e) { /* ignore */ }
      }
      createToast('Datos guardados en Mi Cuenta', 'success')
    } catch (e) {
      console.error('Error guardando perfil:', e)
      createToast('No se pudo guardar los datos', 'error')
    }
  }

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.medidas && product.medidas.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.categoria && product.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || product.categoria === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const discount = calculateDiscount(subtotal)
  const total = subtotal - discount

  // Función para obtener estilos de categoría
  const getCategoryStyle = (categoria) => {
    const categoryStyles = {
      'Carteles': {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        icon: '📋',
        color: 'white'
      },
      'Vinilos': {
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        icon: '🎨',
        color: 'white'
      },
      'Lonas': {
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        icon: '🏞️',
        color: 'white'
      },
      'Impresiones': {
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        icon: '🖨️',
        color: 'white'
      },
      'Stickers': {
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        icon: '⭐',
        color: 'white'
      },
      'Banners': {
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        icon: '🚩',
        color: '#333'
      },
      'default': {
        background: 'linear-gradient(135deg, var(--accent-blue) 0%, #5dade2 100%)',
        icon: '🏷️',
        color: 'white'
      }
    }
    
    return categoryStyles[categoria] || categoryStyles.default
  }

  return (
    <PublicLayout title="Catálogo - KOND">
      <div className="catalog-container" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '20px' 
      }}>
        {/* Header del catálogo */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              margin: 0
            }}>
              🛒 Nuestros Productos
            </h1>
            
            {/* Botones de navegación */}
            <div style={{
              display: 'flex',
              gap: '8px',
              background: 'var(--bg-section)',
              padding: '4px',
              borderRadius: '8px'
            }}>
              <button
                style={{
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Catálogo
              </button>
              <button
                onClick={() => window.location.href = '/mis-pedidos'}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Mis Pedidos
              </button>
            </div>
          </div>
          
          {/* Botón del carrito */}
          <button
            onClick={() => setShowCart(true)}
            style={{
              position: 'relative',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🛒 Carrito
            {totalItems > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Filtros */}
        <div className="filters-row" style={{
          gap: '16px',
          marginBottom: '24px',
          padding: '20px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
            className="search-input"
          />
          
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid var(--border-color)',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: '500',
                minWidth: '200px',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns%3d%27http%3a//www.w3.org/2000/svg%27 width%3d%2712%27 height%3d%2712%27 viewBox%3d%270 0 12 12%27%3e%3cpath fill%3d%27%23666%27 d%3d%27M6 8L2 4h8z%27/%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '12px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              className="category-select"
              onMouseEnter={(e) => {
                e.target.style.borderColor = 'var(--accent-blue)'
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'var(--border-color)'
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                🏷️ Todas las categorías
              </option>
              {categories.map(category => {
                const categoryStyle = getCategoryStyle(category)
                return (
                  <option 
                    key={category} 
                    value={category}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  >
                    {categoryStyle.icon} {category}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Grid de productos */}
        <div className="products-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              getCategoryStyle={getCategoryStyle}
              onAddToCart={(productId, quantity) => {
                const productToAdd = products.find(p => p.id === productId)
                if (productToAdd) {
                  addToCart(productToAdd, quantity)
                  createToast(`${productToAdd.nombre} agregado al carrito`, 'success')
                }
              }}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            No se encontraron productos
          </div>
        )}

        {/* Modal del carrito */}
        {showCart && (
          <CartModal
            cart={cart}
            onClose={() => setShowCart(false)}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onApplyCoupon={(couponCode) => {
              const result = applyCoupon(couponCode, cart, subtotal)
              createToast(result.message, result.success ? 'success' : 'error')
              return result.success
            }}
            onProceedToCheckout={() => {
              setShowCart(false)
              setCheckoutMode('order')
              setShowCheckout(true)
            }}
            subtotal={subtotal}
            discount={discount}
            total={total}
            activeCoupon={activeCoupon}
            currentUser={currentUserState}
            onEditProfile={() => { setCheckoutMode('edit'); setShowCart(false); setShowCheckout(true); }}
          />
        )}

        {/* Modal de checkout */}
        {showCheckout && (
          <CheckoutModal
            cart={cart}
            onClose={() => setShowCheckout(false)}
            total={total}
            subtotal={subtotal}
            discount={discount}
            selectedDeliveryDate={selectedDeliveryDate}
            onDateSelect={setSelectedDeliveryDate}
            onOrderComplete={() => {
              clearCart()
              setShowCheckout(false)
              createToast('¡Pedido enviado exitosamente!', 'success')
            }}
            saveOrder={saveOrder}
            mode={checkoutMode}
            onProfileUpdate={handleProfileUpdated}
          />
        )}
      </div>
    </PublicLayout>
  )
}

// Componente de tarjeta de producto
function ProductCard({ product, onAddToCart, getCategoryStyle }) {
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity)
    setQuantity(1)
  }

  return (
    <div className="product-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}
    >
      {/* Imagen del producto */}
      <div style={{
        position: 'relative',
        paddingTop: '60%',
        background: 'var(--bg-tertiary)'
      }}>
        {product.imagen ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            Sin imagen
          </div>
        )}
      </div>

      {/* Info del producto */}
      <div style={{ padding: '20px' }}>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          lineHeight: 1.4
        }}>
          {product.nombre}
        </h3>

        {product.medidas && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: '8px'
          }}>
            📏 {product.medidas}
          </p>
        )}

        {product.categoria && (() => {
          const categoryStyle = getCategoryStyle(product.categoria)
          return (
            <div 
              className="category-badge"
              style={{
                background: categoryStyle.background,
                color: categoryStyle.color,
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span>{categoryStyle.icon}</span>
              <span>{product.categoria}</span>
            </div>
          )
        })()}

        <div style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--accent-blue)',
          marginBottom: '16px'
        }}>
          {/* Mostrar precio con promoción si corresponde */}
          {product && product.hasPromotion && product.precioPromocional !== undefined && product.precioPromocional !== product.precioUnitario ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(product.precioPromocional)}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>{formatCurrency(product.precioUnitario || 0)}</div>
            </div>
          ) : (
            <div>{formatCurrency(product.precioUnitario || 0)}</div>
          )}
        </div>

        {/* Controles de cantidad y botón */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                background: 'var(--bg-hover)',
                border: 'none',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                width: '50px',
                textAlign: 'center',
                padding: '8px 4px'
              }}
              min="1"
              max="999"
            />
            <button
              onClick={() => setQuantity(Math.min(999, quantity + 1))}
              style={{
                background: 'var(--bg-hover)',
                border: 'none',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            style={{
              flex: 1,
              background: 'var(--accent-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🛒 Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal del carrito
function CartModal({ 
  cart, 
  onClose, 
  onUpdateQuantity, 
  onRemoveItem, 
  onApplyCoupon,
  onProceedToCheckout,
  subtotal,
  discount,
  total,
  activeCoupon
}) {
  const [couponInput, setCouponInput] = useState('')

  const handleApplyCoupon = () => {
    if (!couponInput) return
    if (onApplyCoupon(couponInput)) setCouponInput('')
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={stylesResp.cartModalDialog}
        style={{
          width: '100%',
          maxWidth: '900px',
          height: '80vh',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
        }}
      >
        {/* Left: items list */}
  <div className={stylesResp.modalLeft}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🛒 Tu carrito</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {typeof currentUser !== 'undefined' && currentUser ? (
                <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(currentUser.nombre || '') + (currentUser.apellido ? ' ' + currentUser.apellido : '')}</div>
                  <div>{currentUser.telefono || ''} {currentUser.email ? '• ' + currentUser.email : ''}</div>
                </div>
              ) : null}
              {typeof onEditProfile === 'function' ? <button onClick={onEditProfile} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}>Editar</button> : null}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f6f7f9' }}>
                    {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No foto</div>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.measures}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(item.price * item.quantity)}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatCurrency(item.price)} × {item.quantity}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 10, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 6px' }}>
                        <button aria-label="Disminuir" onClick={() => onUpdateQuantity(idx, 'decrease')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}>−</button>
                        <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</div>
                        <button aria-label="Aumentar" onClick={() => onUpdateQuantity(idx, 'increase')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}>+</button>
                      </div>

                      <button onClick={() => onRemoveItem(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Cupón */}
              <div style={{ marginTop: 6, padding: 12, borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Código de cupón" style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} />
                <button onClick={handleApplyCoupon} style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer' }}>Aplicar</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: resumen y acciones */}
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
            <button onClick={onProceedToCheckout} disabled={cart.length === 0} style={{ padding: '12px 10px', borderRadius: 8, background: 'var(--accent-secondary)', color: 'white', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700 }}>Proceder al pago</button>

            <button onClick={onClose} style={{ 
              padding: '10px', 
              borderRadius: 8, 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--accent-blue)';
              e.target.style.color = 'white';
              e.target.style.borderColor = 'var(--accent-blue)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--text-primary)';
              e.target.style.borderColor = 'var(--border-color)';
            }}
            >Seguir comprando</button>
          </div>

          <div style={{ marginTop: 18, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Aceptamos pago por transferencia y coordinamos por WhatsApp.</div>
        </div>
      </div>
    </div>
  )
}

// Modal de checkout completo
function CheckoutModal({ 
  cart, 
  onClose, 
  total,
  subtotal,
  discount,
  selectedDeliveryDate, 
  onDateSelect,
  onOrderComplete,
  saveOrder,
  mode = 'order', // 'order' or 'edit'
  onProfileUpdate
}) {
  const [paymentMethod, setPaymentMethod] = useState('whatsapp')
  const [customerData, setCustomerData] = useState({ name: '', apellido: '', phone: '', email: '', address: '' })
  const [comprobante, setComprobante] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Prefill datos del usuario si está logueado
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCustomerData(prev => ({
        ...prev,
        name: user.nombre || user.email || '',
        apellido: user.apellido || '',
        phone: user.telefono || '',
        email: user.email || '',
        address: [user.direccion, user.localidad, user.cp, user.provincia].filter(Boolean).join(', ')
      }))
    }
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const blob = await compressImage(file, 900, 0.75)
      const toRead = blob && blob.size > 0 ? blob : file
      if (toRead.size > 5 * 1024 * 1024) return createToast('El archivo debe ser menor a 5MB', 'error')
      const reader = new FileReader()
      reader.onload = (ev) => setComprobante(ev.target.result)
      reader.readAsDataURL(toRead)
    } catch (err) {
      console.warn('Fallo compresión, usando original', err)
      const reader = new FileReader()
      reader.onload = (ev) => setComprobante(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitOrder = async () => {
    if (mode === 'edit') return
    if (isSubmitting) return
    const validationErrors = validateCheckoutForm(customerData, paymentMethod)
    if (validationErrors.length > 0) return createToast(validationErrors[0], 'error')
    if (paymentMethod === 'transferencia' && !selectedDeliveryDate) return createToast('Selecciona una fecha de entrega para transferencia', 'error')
    if (paymentMethod === 'transferencia' && !comprobante) return createToast('Sube el comprobante de transferencia', 'error')

    setIsSubmitting(true)
    try {
      const orderData = {
        cliente: {
          nombre: customerData.name,
          apellido: customerData.apellido,
          telefono: customerData.phone,
          email: customerData.email,
          direccion: customerData.address
        },
        items: cart.map(item => ({
          idProducto: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          measures: item.measures,
          tiempoUnitario: item.tiempoUnitario || '00:00:00',
          precioPorMinuto: item.precioPorMinuto || 0,
          imagen: item.image || null
        })),
        metodoPago: paymentMethod,
        estadoPago: paymentMethod === 'transferencia' ? 'seña_pagada' : 'sin_seña',
        fechaSolicitudEntrega: selectedDeliveryDate,
        total: total,
        subtotal: subtotal,
        descuento: discount,
        comprobante: paymentMethod === 'transferencia' ? comprobante : null
      }
      if (paymentMethod === 'transferencia') orderData.montoRecibido = Number((total || 0) * 0.5)

      const result = saveOrder(orderData)
      if (!result.success) throw new Error(result.error?.message || 'Error al guardar el pedido')

      if (result.order._comprobanteOmitted) {
        createToast('Pedido guardado, pero el comprobante no pudo almacenarse debido a limitaciones de espacio. El administrador revisará el pedido.', 'warning')
      } else {
        createToast('Pedido procesado exitosamente.', 'success')
      }

      if (paymentMethod === 'whatsapp') {
        const message = generateWhatsAppMessage(cart, total, customerData, formatCurrency)
        const whatsappUrl = `https://api.whatsapp.com/send?phone=541136231857&text=${encodeURIComponent(message)}`
        const link = document.createElement('a')
        link.href = whatsappUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        createToast('Abriendo WhatsApp...', 'success')
      }

      onOrderComplete()
    } catch (error) {
      console.error('Error submitting order:', error)
      if (error.name === 'QuotaExceededError' || (error.message && error.message.includes('exceeded the quota'))) {
        createToast('Espacio insuficiente en el navegador. El pedido no pudo guardarse completamente. Contacta al administrador para procesar tu pedido.', 'error')
      } else {
        createToast('Error al procesar el pedido. Intenta nuevamente.', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveProfile = () => {
    // Build updated user object
    const updated = {
      nombre: customerData.name || '',
      apellido: customerData.apellido || '',
      telefono: customerData.phone || '',
      email: customerData.email || '',
      direccion: customerData.address || ''
    }
    try {
      if (typeof onProfileUpdate === 'function') onProfileUpdate(updated)
      createToast('Perfil actualizado', 'success')
      onClose()
    } catch (e) {
      console.error('Error guardando perfil:', e)
      createToast('No se pudo actualizar el perfil', 'error')
    }
  }

  // UI limpio y dividido: formulario a la izquierda, resumen/acciones a la derecha
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={stylesResp.checkoutModalDialog} style={{ width: '100%', maxWidth: 960, background: 'var(--bg-card)', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>

        {/* Left: form */}
        <div className={stylesResp.modalLeft}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>💳 Finalizar compra</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Nombre *</label>
              <input value={customerData.name} onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="given-name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Apellido</label>
              <input value={customerData.apellido} onChange={(e) => setCustomerData(prev => ({ ...prev, apellido: e.target.value }))} placeholder="Apellido" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="family-name" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Teléfono *</label>
              <input value={customerData.phone} onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Teléfono" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="tel" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
              <input value={customerData.email} onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))} placeholder="Email (opcional)" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="email" />
            </div>
          </div>

          <section style={{ marginTop: 12, marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Dirección</label>
            <input value={customerData.address} onChange={(e) => setCustomerData(prev => ({ ...prev, address: e.target.value }))} placeholder="Dirección" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="street-address" />
          </section>

          <section style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>💰 Elegir método de pago</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setPaymentMethod('whatsapp')} style={{ padding: '10px 12px', borderRadius: 8, border: paymentMethod === 'whatsapp' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: paymentMethod === 'whatsapp' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>💬 WhatsApp</button>
              <button onClick={() => setPaymentMethod('transferencia')} style={{ padding: '10px 12px', borderRadius: 8, border: paymentMethod === 'transferencia' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: paymentMethod === 'transferencia' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>🏦 Transferencia (Seña 50%)</button>
              <button onClick={() => setPaymentMethod('retiro')} style={{ padding: '10px 12px', borderRadius: 8, border: paymentMethod === 'retiro' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: paymentMethod === 'retiro' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>🏪 Retiro</button>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{paymentMethod === 'transferencia' ? `Seña: ${formatCurrency(total * 0.5)} — Total: ${formatCurrency(total)}` : ''}</div>
          </section>

          {paymentMethod === 'transferencia' && (
            <section style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fecha de entrega solicitada</label>
                  <AvailabilityCalendar cart={cart} selectedDate={selectedDeliveryDate} onDateSelect={onDateSelect} />
                </div>
                <div style={{ width: 160 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Subir comprobante</label>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ width: '100%' }} />
                  {comprobante && <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: 'var(--accent-secondary)', color: '#fff', fontSize: 12 }}>✓ Comprobante cargado</div>}
                </div>
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-card)', fontFamily: 'monospace', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div><strong>CBU:</strong> 0000003100010123456789</div>
                  <div>
                    <button onClick={() => { navigator.clipboard?.writeText('0000003100010123456789'); createToast('CBU copiado', 'success') }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}>Copiar</button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                  <div><strong>Alias:</strong> KOND.LASER.MP</div>
                  <div>
                    <button onClick={() => { navigator.clipboard?.writeText('KOND.LASER.MP'); createToast('Alias copiado', 'success') }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}>Copiar</button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div><strong>Titular:</strong> Sistema KOND</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div><strong>Seña (50%):</strong> {formatCurrency(total * 0.5)}</div>
                </div>
              </div>
            </section>
          )}
        </div>

  {/* Right: resumen y confirmación */}
  <aside className={stylesResp.modalRight}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ color: 'var(--text-secondary)' }}>Resumen</div>
            <div style={{ fontWeight: 700 }}>{cart.length} items</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 14 }}>
                <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name} × {item.quantity}</div>
                <div style={{ marginLeft: 8, fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <div>Subtotal</div>
            <div>{formatCurrency(subtotal)}</div>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-secondary)' }}>
              <div>Descuento</div>
              <div>-{formatCurrency(discount)}</div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', marginBottom: 12 }}>
            <div>Total</div>
            <div>{formatCurrency(total)}</div>
          </div>

          {mode === 'edit' ? (
            <>
              <button onClick={handleSaveProfile} style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: 8 }}>Guardar cambios</button>
              <button onClick={onClose} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancelar</button>
            </>
          ) : (
            <>
              <button onClick={handleSubmitOrder} disabled={isSubmitting} style={{ width: '100%', padding: 12, borderRadius: 8, background: isSubmitting ? 'var(--text-muted)' : 'var(--accent-secondary)', color: 'white', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, marginBottom: 8 }}>{isSubmitting ? '⏳ Procesando...' : paymentMethod === 'whatsapp' ? '💬 Enviar por WhatsApp' : '🚀 Confirmar Pedido'}</button>

              <button onClick={onClose} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Volver al carrito</button>
            </>
          )}

          <div style={{ marginTop: 14, color: 'var(--text-secondary)', fontSize: 13 }}>Los envíos y tiempos se coordinan luego de la confirmación. Para transferencias, la seña es del 50%.</div>
        </aside>
      </div>
      </div>
    )
  }

// Modal de detalles del pedido (para usuarios)
function OrderDetailModal({ order, onClose }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No especificada'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getStatusInfo = (estado) => {
    const statusMap = {
      'pendiente': { emoji: '⏳', label: 'Pendiente de Confirmación', color: '#f59e0b', description: 'Tu pedido está siendo revisado por nuestro equipo' },
      'confirmado': { emoji: '✅', label: 'Confirmado', color: '#3b82f6', description: 'Tu pedido fue confirmado y será procesado pronto' },
      'en_preparacion': { emoji: '🔨', label: 'En Preparación', color: '#8b5cf6', description: 'Estamos trabajando en tu pedido' },
      'listo': { emoji: '📦', label: 'Listo para Entrega', color: '#10b981', description: 'Tu pedido está listo para ser entregado o retirado' },
      'entregado': { emoji: '🎉', label: 'Entregado', color: '#059669', description: '¡Tu pedido fue entregado exitosamente!' },
      'cancelado': { emoji: '❌', label: 'Cancelado', color: '#ef4444', description: 'Este pedido fue cancelado' }
    }
    return statusMap[estado] || statusMap['pendiente']
  }

  const statusInfo = getStatusInfo(order.estado)
  const seña = order.estadoPago === 'seña_pagada' ? (order.montoRecibido || order.total * 0.5) : 0
  const restante = order.total - seña

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          background: statusInfo.color,
          color: 'white',
          padding: '24px',
          borderRadius: '16px 16px 0 0',
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              Pedido #{order.id}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {statusInfo.emoji} {statusInfo.label}
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '4px' }}>
            {statusInfo.description}
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px' }}>
          {/* Información del pedido */}
          <div style={{
            background: 'var(--bg-section)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              📋 Información del Pedido
            </h3>
            <div style={{
              display: 'grid',
              gap: '8px',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Fecha de Creación:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDate(order.fechaCreacion)}</strong>
              </div>
              {order.fechaSolicitudEntrega && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Fecha de Entrega:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatDate(order.fechaSolicitudEntrega)}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Método de Pago:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {order.metodoPago === 'transferencia' ? '🏦 Transferencia' :
                   order.metodoPago === 'whatsapp' ? '💬 WhatsApp' :
                   order.metodoPago === 'retiro' ? '🏪 Retiro en Local' :
                   order.metodoPago}
                </strong>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div style={{
            background: 'var(--bg-section)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              📦 Productos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.productos.map((prod, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}
                >
                  {prod.imagen && (
                    <img
                      src={prod.imagen}
                      alt={prod.nombre}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '2px solid var(--border-color)'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px'
                    }}>
                      {prod.nombre}
                    </div>
                    {prod.medidas && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                      }}>
                        📐 {prod.medidas}
                      </div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)'
                    }}>
                      x{prod.cantidad}
                    </div>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--accent-color)'
                    }}>
                      {formatCurrency(prod.precioUnitario * prod.cantidad)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Pago */}
          <div style={{
            background: 'var(--bg-section)',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              💰 Resumen de Pago
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {order.estadoPago === 'seña_pagada' && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.95rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>💵 Seña Pagada:</span>
                    <strong style={{ color: '#10b981' }}>{formatCurrency(seña)}</strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.95rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>💰 Saldo Restante:</span>
                    <strong style={{ color: '#f59e0b' }}>{formatCurrency(restante)}</strong>
                  </div>
                  <div style={{
                    height: '1px',
                    background: 'var(--border-color)',
                    margin: '8px 0'
                  }}></div>
                </>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.2rem'
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>TOTAL:</span>
                <strong style={{ color: 'var(--accent-color)', fontSize: '1.3rem' }}>
                  {formatCurrency(order.total)}
                </strong>
              </div>
              
              {/* Estado del pago */}
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: order.estadoPago === 'pagado' ? '#10b98120' : 
                           order.estadoPago === 'seña_pagada' ? '#f59e0b20' : '#ef444420',
                borderRadius: '6px',
                textAlign: 'center',
                fontWeight: 600,
                color: order.estadoPago === 'pagado' ? '#10b981' :
                       order.estadoPago === 'seña_pagada' ? '#f59e0b' : '#ef4444'
              }}>
                {order.estadoPago === 'pagado' ? '✅ Pagado Completamente' :
                 order.estadoPago === 'seña_pagada' ? '⚠️ Seña Pagada - Saldo Pendiente' :
                 '❌ Sin Seña'}
              </div>
            </div>
          </div>

          {/* Botón de cerrar */}
          <button
            onClick={onClose}
            style={{
              width: '100%',
              marginTop: '20px',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

