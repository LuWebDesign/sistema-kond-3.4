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

export default function Catalog() {
  const { products, categories } = useProducts()
  const { cart, addToCart, updateQuantity, removeItem, clearCart, totalItems, subtotal } = useCart()
  const { activeCoupon, applyCoupon, calculateDiscount } = useCoupons()
  const { saveOrder } = useOrders()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(null)

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

  return (
    <PublicLayout title="Catálogo - KOND">
      <div style={{ 
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
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--accent-blue)',
            margin: 0
          }}>
            �️ Nuestros Productos
          </h1>
          
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
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
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              minWidth: '200px'
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Grid de productos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
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
              setShowCheckout(true)
            }}
            subtotal={subtotal}
            discount={discount}
            total={total}
            activeCoupon={activeCoupon}
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
          />
        )}
      </div>
    </PublicLayout>
  )
}

// Componente de tarjeta de producto
function ProductCard({ product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity)
    setQuantity(1)
  }

  return (
    <div style={{
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

        {product.categoria && (
          <span style={{
            display: 'inline-block',
            padding: '4px 8px',
            background: 'var(--accent-blue)',
            color: 'white',
            borderRadius: '12px',
            fontSize: '0.8rem',
            marginBottom: '16px'
          }}>
            {product.categoria}
          </span>
        )}

        <div style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--accent-blue)',
          marginBottom: '16px'
        }}>
          {formatCurrency(product.precioUnitario || 0)}
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
    if (onApplyCoupon(couponInput)) {
      setCouponInput('')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
            🛒 Carrito ({cart.length} items)
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        {/* Items del carrito */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {cart.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-secondary)'
            }}>
              Tu carrito está vacío
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  {/* Imagen */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--bg-tertiary)',
                    flexShrink: 0
                  }}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem'
                      }}>
                        Sin img
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}>
                      {item.name}
                    </h4>
                    <p style={{
                      margin: '0 0 8px 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}>
                      📏 {item.measures}
                    </p>
                    <div style={{
                      color: 'var(--accent-blue)',
                      fontWeight: 600
                    }}>
                      {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>

                  {/* Controles */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}>
                      <button
                        onClick={() => onUpdateQuantity(index, 'decrease')}
                        style={{
                          background: 'var(--bg-hover)',
                          border: 'none',
                          padding: '4px 8px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        −
                      </button>
                      <span style={{
                        padding: '4px 12px',
                        color: 'var(--text-primary)'
                      }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(index, 'increase')}
                        style={{
                          background: 'var(--bg-hover)',
                          border: 'none',
                          padding: '4px 8px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(index)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {/* Sección de cupones */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  color: 'var(--text-primary)'
                }}>
                  💳 Cupón de descuento
                </h4>
                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <input
                    type="text"
                    placeholder="Código del cupón"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    style={{
                      background: 'var(--accent-blue)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    Aplicar
                  </button>
                </div>
                {activeCoupon && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'var(--accent-secondary)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    ✓ Cupón {activeCoupon.code} aplicado
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con resumen */}
        {cart.length > 0 && (
          <div style={{
            padding: '20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)'
              }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--accent-secondary)'
                }}>
                  <span>Descuento:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-color)'
              }}>
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              style={{
                width: '100%',
                background: 'var(--accent-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              💳 Proceder al Checkout
            </button>
          </div>
        )}
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
  saveOrder
}) {
  const [paymentMethod, setPaymentMethod] = useState('whatsapp')
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  const [comprobante, setComprobante] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Prefill datos del usuario si está logueado
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCustomerData(prev => ({
        ...prev,
        name: user.nombre || user.email || '',
        phone: user.telefono || '',
        email: user.email || '',
        address: [user.direccion, user.localidad, user.cp, user.provincia].filter(Boolean).join(', ')
      }))
    }
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      // Comprimir imagen para reducir uso de localStorage
      const blob = await compressImage(file, 900, 0.75)
      const toRead = blob && blob.size > 0 ? blob : file
      
      if (toRead.size > 5 * 1024 * 1024) { // 5MB límite pos-compresión
        createToast('El archivo debe ser menor a 5MB', 'error')
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        setComprobante(ev.target.result)
      }
      reader.readAsDataURL(toRead)
    } catch (err) {
      console.warn('Fallo compresión de imagen, usando archivo original', err)
      const reader = new FileReader()
      reader.onload = (ev) => setComprobante(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitOrder = async () => {
    if (isSubmitting) return

    // Validar formulario
    const validationErrors = validateCheckoutForm(customerData, paymentMethod)
    if (validationErrors.length > 0) {
      createToast(validationErrors[0], 'error')
      return
    }

    // Validar fecha para transferencia
    if (paymentMethod === 'transferencia' && !selectedDeliveryDate) {
      createToast('Selecciona una fecha de entrega para transferencia', 'error')
      return
    }

    // Validar comprobante para transferencia
    if (paymentMethod === 'transferencia' && !comprobante) {
      createToast('Sube el comprobante de transferencia', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      // Crear pedido
      const orderData = {
        cliente: {
          nombre: customerData.name,
          telefono: customerData.phone,
          email: customerData.email,
          direccion: customerData.address
        },
        items: cart.map(item => ({
          idProducto: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          measures: item.measures
        })),
        metodoPago: paymentMethod,
        estadoPago: paymentMethod === 'transferencia' ? 'seña_pagada' : 'sin_seña',
        fechaSolicitudEntrega: selectedDeliveryDate,
        total: total,
        subtotal: subtotal,
        descuento: discount,
        comprobante: paymentMethod === 'transferencia' ? comprobante : null
      }

      // Incluir montoRecibido explícito para coherencia con admins/finanzas
      if (paymentMethod === 'transferencia') {
        orderData.montoRecibido = Number((total || 0) * 0.5)
      }

      const result = saveOrder(orderData)
      
      if (result.success) {
        // Proceder según método de pago
        if (paymentMethod === 'whatsapp') {
          const message = generateWhatsAppMessage(cart, total, customerData, formatCurrency)
          const whatsappUrl = `https://wa.me/5491234567890?text=${encodeURIComponent(message)}`
          window.open(whatsappUrl, '_blank')
        }
        
        onOrderComplete()
      } else {
        throw new Error(result.error?.message || 'Error al guardar el pedido')
      }
    } catch (error) {
      console.error('Error submitting order:', error)
      createToast('Error al procesar el pedido. Intenta nuevamente.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
            💳 Checkout
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Datos del cliente */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
              📝 Datos del cliente
            </h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                type="text"
                placeholder="Nombre completo *"
                value={customerData.name}
                onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              />
              
              <input
                type="tel"
                placeholder="Teléfono *"
                value={customerData.phone}
                onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              />
              
              <input
                type="email"
                placeholder="Email"
                value={customerData.email}
                onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              />
              
              <input
                type="text"
                placeholder="Dirección"
                value={customerData.address}
                onChange={(e) => setCustomerData(prev => ({ ...prev, address: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Método de pago */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
              💰 Método de pago
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'whatsapp' ? 'var(--bg-hover)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="whatsapp"
                  checked={paymentMethod === 'whatsapp'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  💬 WhatsApp (Coordinar pago)
                </span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'transferencia' ? 'var(--bg-hover)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transferencia"
                  checked={paymentMethod === 'transferencia'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'var(--text-primary)' }}>
                    🏦 Transferencia (Seña 50%)
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Seña: {formatCurrency(total * 0.5)} - Total: {formatCurrency(total)}
                  </span>
                </div>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'retiro' ? 'var(--bg-hover)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="retiro"
                  checked={paymentMethod === 'retiro'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  🏪 Retiro en local
                </span>
              </label>
            </div>
          </div>

          {/* Calendario para transferencia */}
          {paymentMethod === 'transferencia' && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                📅 Fecha de entrega solicitada
              </h3>
              <AvailabilityCalendar 
                cart={cart}
                selectedDate={selectedDeliveryDate}
                onDateSelect={onDateSelect}
              />
            </div>
          )}

          {/* Upload de comprobante para transferencia */}
          {paymentMethod === 'transferencia' && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                📄 Comprobante de transferencia
              </h3>
              
              <div style={{
                padding: '16px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--bg-secondary)'
              }}>
                <p style={{
                  marginBottom: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}>
                  Datos para transferencia:
                </p>
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)'
                }}>
                  <div><strong>CBU:</strong> 0000003100010123456789</div>
                  <div><strong>Alias:</strong> KOND.LASER.MP</div>
                  <div><strong>Titular:</strong> Sistema KOND</div>
                  <div><strong>Monto seña:</strong> {formatCurrency(total * 0.5)}</div>
                </div>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)'
                  }}
                />
                
                {comprobante && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    background: 'var(--accent-secondary)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}>
                    ✓ Comprobante cargado correctamente
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumen del pedido */}
          <div style={{
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>
              📋 Resumen del pedido
            </h4>
            
            {cart.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                <span>{item.name} × {item.quantity}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            
            <div style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '8px',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Botón de confirmación */}
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: isSubmitting ? 'var(--text-muted)' : 'var(--accent-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? '⏳ Procesando...' : paymentMethod === 'whatsapp' ? '💬 Enviar por WhatsApp' : '🚀 Confirmar Pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
