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
import { getPaymentConfig } from '../utils/supabasePaymentConfig'
import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { useRouter } from 'next/router'
import stylesResp from '../styles/catalog-responsive.module.css'
import { slugifyPreserveCase } from '../utils/slugify'
import { useNotifications } from '../components/NotificationsProvider'

export default function Catalog() {
  const router = useRouter()
  const { products, categories, materials } = useProducts()
  const { cart, addToCart, updateQuantity, removeItem, clearCart, totalItems, subtotal } = useCart()
  const { activeCoupon, applyCoupon, calculateDiscount } = useCoupons()
  const { saveOrder } = useOrders()
  
  // Obtener addNotification de manera segura para evitar errores de SSR
  const notificationsContext = useNotifications()
  const addNotification = notificationsContext?.addNotification
  
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState('order') // 'order' | 'edit'
  const [currentUserState, setCurrentUserState] = useState(null)
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(null)
  // imageModal: { productId: Number, index: Number } or null
  const [imageModal, setImageModal] = useState(null)
  const [paymentConfig, setPaymentConfig] = useState(null)

  // Debounce para la búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Escuchar cambios en localStorage para actualizar el usuario logueado
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = getCurrentUser()
      setCurrentUserState(updatedUser)
    }

    // Verificar usuario al montar
    handleStorageChange()

    // Escuchar evento 'storage' para cambios desde otras pestañas/ventanas
    window.addEventListener('storage', handleStorageChange)

    // También verificar al montar/focus para cambios en la misma pestaña
    window.addEventListener('focus', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [])

  // Función para manejar la selección de categoría desde URLs
  const setCategoryHandler = (e) => {
    // Extraer slug y setear directamente sin reintentos - el useEffect de sincronización lo manejará
    const slug = e && e.detail && e.detail.slug ? e.detail.slug : ''
    if (!slug) {
      setSelectedCategory('')
      return
    }
    
    // Buscar la categoría si ya está cargada, sino el useEffect lo hará
    if (categories && categories.length > 0) {
      const foundCategory = categories.find(category => {
        if (!category) return false
        const categorySlug = slugifyPreserveCase(category)
        return categorySlug === slug
      })
      
      if (foundCategory) {
        setSelectedCategory(foundCategory)
      }
    }
    // Si categories no está listo, el useEffect de sincronización con router.asPath lo manejará
  }

  // Cerrar lightbox con Esc
  useEffect(() => {
    if (!imageModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') return setImageModal(null)
      if (!imageModal) return
      const pid = imageModal.productId
      const idx = Number.isFinite(imageModal.index) ? imageModal.index : 0
      const prod = (products || []).find(p => p.id === pid)
      const imgs = prod?.imagenes || []
      if (!imgs || imgs.length === 0) return
      if (e.key === 'ArrowLeft') setImageModal({ productId: pid, index: (idx - 1 + imgs.length) % imgs.length })
      if (e.key === 'ArrowRight') setImageModal({ productId: pid, index: (idx + 1) % imgs.length })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [imageModal, products])

  // Cargar configuración de métodos de pago desde Supabase
  useEffect(() => {
    const loadPaymentConfig = async () => {
      try {
        const config = await getPaymentConfig()
        if (config) {
          setPaymentConfig(config)
        }
      } catch (error) {
        console.error('Error al cargar configuración de pago:', error)
        // Fallback a localStorage si falla Supabase
        try {
          const localConfig = localStorage.getItem('paymentConfig')
          if (localConfig) {
            setPaymentConfig(JSON.parse(localConfig))
          }
        } catch (e) {
          console.error('Error al cargar configuración local:', e)
        }
      }
    }
    loadPaymentConfig()
  }, [])

  // Permitir abrir el carrito o el checkout desde otras rutas/links
  useEffect(() => {
    const openCartHandler = () => setShowCart(true)
    const openCheckoutHandler = (e) => {
      try {
        const mode = e && e.detail && e.detail.mode ? e.detail.mode : 'order'
        setCheckoutMode(mode)
      } catch (err) {
        setCheckoutMode('order')
      }
      setShowCheckout(true)
    }

    // Registrar todos los listeners en un solo lugar y devolver una única función de limpieza.
    if (typeof window !== 'undefined') {
      window.addEventListener('catalog:openCart', openCartHandler)
      window.addEventListener('catalog:openCheckout', openCheckoutHandler)
      window.addEventListener('catalog:setCategory', setCategoryHandler)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('catalog:openCart', openCartHandler)
        window.removeEventListener('catalog:openCheckout', openCheckoutHandler)
        window.removeEventListener('catalog:setCategory', setCategoryHandler)
      }
    }
  }, [categories])

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

  // Filtrar productos (memoizado para evitar recalcular en cada render)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           (product.medidas && product.medidas.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                           (product.categoria && product.categoria.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      
      const matchesCategory = !selectedCategory || 
        (product.categoria && product.categoria.trim() === selectedCategory.trim())
      
      return matchesSearch && matchesCategory
    }).sort((a, b) => {
      // Si estamos en "Todas las categorías" (sin categoría seleccionada),
      // mostrar productos con promoción primero
      if (!selectedCategory) {
        const aHasPromo = a.hasPromotion ? 1 : 0
        const bHasPromo = b.hasPromotion ? 1 : 0
        // Ordenar descendente: productos con promo (1) van antes que sin promo (0)
        return bHasPromo - aHasPromo
      }
      // Si hay categoría seleccionada, mantener orden original
      return 0
    })
  }, [products, debouncedSearchTerm, selectedCategory])

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

  // Sincronizar selectedCategory con la ruta actual para evitar que la selección
  // se pierda cuando se navega a /catalog/:slug y hay re-mounts o eventos asíncronos.
  // Esto toma la parte de la URL después de /catalog/ y busca la categoría correspondiente.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const path = router.asPath || ''
      // Extraer primer segmento después de /catalog/
      const match = path.match(/^\/catalog\/(?:categoria\/)?([^\/\?]+)/)
      const slug = match && match[1] ? match[1] : ''

      if (!slug) {
        // Si la URL es /catalog o no tiene slug, limpiar la selección
        setSelectedCategory('')
        return
      }

      // Buscar la categoría que corresponda al slug
      if (categories && categories.length) {
        const found = categories.find(c => slugifyPreserveCase(c) === slug)
        if (found) {
          setSelectedCategory(found)
        } else {
          // No limpiar la selección si la categoría aún no está cargada;
          // esto evita que la UI vuelva a 'Todas' en transiciones asíncronas.
          // Mantener el estado actual hasta que categories se actualice.
        }
      }
    } catch (e) {
      console.error('Error sincronizando categoría con ruta:', e)
    }
  }, [router.asPath, categories])

  // Memoizar handlers para evitar recrear funciones en cada render
  // ahora abrimos el modal indicando producto + índice de imagen
  const handleImageClick = useCallback((productId, index = 0) => {
    setImageModal({ productId, index })
  }, [])

  const handleAddToCart = useCallback((productId, quantity) => {
    const productToAdd = products.find(p => p.id === productId)
    if (productToAdd) {
      addToCart(productToAdd, quantity)
      createToast(`${productToAdd.nombre} agregado al carrito`, 'success')
    }
  }, [products, addToCart])

  // Using shared slugify helper from ../utils/slugify

  return (
    <PublicLayout title="Catálogo - KOND">
      <div className="catalog-container" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '20px' 
      }}>
        {/* Header del catálogo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>🛒 Nuestros Productos</h1>

            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-section)', padding: '4px', borderRadius: '8px', marginLeft: '12px' }}>
              <button style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Catálogo</button>
              <button onClick={() => router.push('/mis-pedidos')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Mis Pedidos</button>
            </div>
          </div>

          <button onClick={() => { router.push('/catalog/mi-carrito') }} style={{ position: 'relative', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Carrito
            {totalItems > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{totalItems}</span>
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
              value={slugifyPreserveCase(selectedCategory)}
              onChange={(e) => {
                const v = e.target.value
                // Actualizar el estado local inmediatamente para que el filtro aplique al instante
                const found = categories.find(c => slugifyPreserveCase(c) === v)
                setSelectedCategory(found || '')

                if (!v) {
                  // volver a listado general (SPA)
                  router.push('/catalog')
                } else {
                  // navegar a la URL de categoría usando slug (SPA)
                  router.push(`/catalog/${v}`)
                }
              }}
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
                const slug = slugifyPreserveCase(category)
                return (
                  <option 
                    key={category} 
                    value={slug}
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
              onImageClick={handleImageClick}
              onAddToCart={handleAddToCart}
              materials={materials}
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
              products={products}
              onClose={() => { setShowCart(false); router.push('/catalog') }}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onApplyCoupon={(couponCode) => {
                const result = applyCoupon(couponCode, cart, subtotal)
                createToast(result.message, result.success ? 'success' : 'error')
                return result.success
              }}
                      onProceedToCheckout={() => { router.push('/catalog/mi-carrito/finalizar-compra') }}
              subtotal={subtotal}
              discount={discount}
              total={total}
              activeCoupon={activeCoupon}
              currentUser={currentUserState}
              onEditProfile={() => { router.push('/catalog/mi-carrito/finalizar-compra?mode=edit') }}
            />
        )}

        {/* Modal de checkout */}
        {showCheckout && (
          <CheckoutModal
            cart={cart}
            products={products}
            onClose={() => { setShowCheckout(false); router.push('/catalog') }}
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
            addNotification={addNotification}
            mode={checkoutMode}
            currentUser={currentUserState}
            paymentConfig={paymentConfig}
            onProfileUpdate={handleProfileUpdated}
          />
        )}

        {/* Lightbox para imagen de producto (navegable) */}
        {imageModal && (() => {
          const pid = imageModal.productId
          const idx = Number.isFinite(imageModal.index) ? imageModal.index : 0
          const prod = (products || []).find(p => p.id === pid)
          const imgs = prod?.imagenes || []
          const src = imgs[idx] || null

          if (!prod || !src) return null

          return (
            <div onClick={() => setImageModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: '90vw', height: '90vh', maxWidth: '900px', maxHeight: '900px', position: 'relative', background: '#ffffff', borderRadius: 8, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button aria-label="Cerrar" onClick={() => setImageModal(null)} style={{ position: 'absolute', right: -8, top: -8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', zIndex: 2010 }}>✕</button>

                {/* Prev */}
                {imgs.length > 1 && (
                  <button aria-label="Anterior" onClick={() => setImageModal({ productId: pid, index: (idx - 1 + imgs.length) % imgs.length })} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: 6, width: 44, height: 44, cursor: 'pointer' }}>◀</button>
                )}

                <img src={src} alt={prod.nombre} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />

                {/* Next */}
                {imgs.length > 1 && (
                  <button aria-label="Siguiente" onClick={() => setImageModal({ productId: pid, index: (idx + 1) % imgs.length })} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: 6, width: 44, height: 44, cursor: 'pointer' }}>▶</button>
                )}

                {/* Dots */}
                {imgs.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                    {imgs.map((_, i) => (
                      <button key={i} onClick={() => setImageModal({ productId: pid, index: i })} style={{ width: i === idx ? 12 : 8, height: i === idx ? 12 : 8, borderRadius: '50%', background: i === idx ? 'var(--accent-color)' : 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer' }} aria-label={`Imagen ${i + 1}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </PublicLayout>
  )
}

// Componente de tarjeta de producto (memoizado para evitar re-renders innecesarios)
const ProductCard = memo(function ProductCard({ product, onAddToCart, getCategoryStyle, onImageClick, materials = [] }) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  // Log único para verificar datos (solo primer producto)
  useEffect(() => {
    if (product.id === 1) {
      console.log('🔍 ProductCard Debug:', {
        productId: product.id,
        productName: product.nombre,
        materialId: product.materialId,
        material: product.material,
        tipoMaterial: product.tipoMaterial,
        materialsCount: materials.length,
        materials: materials
      })
    }
  }, [product.id, materials])

  // ProductCard will use the shared slugify helper imported above

  // Detectar tema (dark vs light) para ajustar estilos de badge de categoría
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      
      // Función para detectar el tema actual desde data-theme del body
      const getTheme = () => {
        const theme = document.body.getAttribute('data-theme')
        return theme === 'dark'
      }
      
      setIsDarkTheme(getTheme())

      // Observar cambios en el atributo data-theme del body
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            setIsDarkTheme(getTheme())
          }
        })
      })

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme']
      })

      return () => observer.disconnect()
    } catch (e) {
      // ignore
    }
  }, [])

  // Obtener información del material
  const getMaterialInfo = () => {
    // Debug: verificar datos
    if (product.id === 1) {
      console.log('🔍 Debug Material Info:', {
        materials,
        materialsLength: materials.length,
        productMaterialId: product.materialId,
        productMaterial: product.material
      })
    }
    
    if (materials.length === 0) return null
    
    // Primero intentar por materialId
    if (product.materialId) {
      const material = materials.find(m => String(m.id) === String(product.materialId))
      if (material) {
        if (product.id === 1) console.log('✅ Material encontrado por ID:', material)
        return material
      }
    }
    
    // Si no hay materialId, intentar por nombre del material (para compatibilidad con productos antiguos)
    if (product.material) {
      const material = materials.find(m => m.nombre === product.material)
      if (material) {
        if (product.id === 1) console.log('✅ Material encontrado por nombre:', material)
        return material
      }
    }
    
    if (product.id === 1) console.log('❌ Material no encontrado')
    return null
  }

  const materialInfo = getMaterialInfo()

  // Índice actual de la imagen mostrada (para productos con múltiples imágenes)
  const [imageIndex, setImageIndex] = useState(0)

  // Resetear índice si cambian las imágenes del producto
  useEffect(() => {
    setImageIndex(0)
  }, [product.imagenes && product.imagenes.length])

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity)
    setQuantity(1)
  }

  return (
    <div className="product-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Título arriba de la imagen */}
      <div style={{ padding: '12px 20px 16px 20px' }}>
        <h3 style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: '12px',
          lineHeight: 1.2
        }}>
          <span
            onClick={() => {
              try {
                const catSlug = slugifyPreserveCase(product.categoria)
                const prodSlug = slugifyPreserveCase(product.nombre)
                // Navegar a la nueva ruta /catalog/{category}/{product}
                router.push(`/catalog/${catSlug}/${prodSlug}`)
              } catch (e) {
                // fallback a catálogo
                router.push('/catalog')
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {product.nombre}
          </span>
        </h3>
      </div>

      {/* Imagen del producto (ahora soporta varias imágenes con control prev/next) */}
      <div style={{
        position: 'relative',
        paddingTop: '100%',
        background: '#ffffff'
      }}>
        {product.imagenes && product.imagenes.length > 0 ? (
          <>
            <img
              src={product.imagenes[imageIndex]}
              alt={product.nombre}
              loading="lazy"
              onClick={() => onImageClick && onImageClick(product.id, imageIndex)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                cursor: 'zoom-in'
              }}
            />

            {/* Prev / Next buttons */}
            {product.imagenes.length > 1 && (
              <>
                <button
                  aria-label="Anterior"
                  onClick={(e) => { e.stopPropagation(); setImageIndex(i => (i - 1 + product.imagenes.length) % product.imagenes.length) }}
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.45)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    width: 34,
                    height: 34,
                    cursor: 'pointer'
                  }}
                >◀</button>

                <button
                  aria-label="Siguiente"
                  onClick={(e) => { e.stopPropagation(); setImageIndex(i => (i + 1) % product.imagenes.length) }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.45)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    width: 34,
                    height: 34,
                    cursor: 'pointer'
                  }}
                >▶</button>
              </>
            )}

            {/* Dots indicadores clicables */}
            {product.imagenes.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}>
                {product.imagenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setImageIndex(index) }}
                    aria-label={`Mostrar imagen ${index + 1}`}
                    style={{
                      width: index === imageIndex ? 10 : 8,
                      height: index === imageIndex ? 10 : 8,
                      borderRadius: '50%',
                      background: index === imageIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            )}
          </>
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
      <div style={{ padding: '16px 20px 20px 20px' }}>
          {(() => {
            const secondaryTextColor = isDarkTheme ? '#d1d5db' : 'var(--text-secondary)'
            const categoryStyle = getCategoryStyle(product.categoria)
            // Ajustar estilo según tema: en versión light usar fondo gris claro y texto gris oscuro
            const badgeBackground = isDarkTheme ? 'transparent' : '#f3f4f6' // gray-100
            // En dark: texto blanco con borde; en light: texto gris oscuro sobre fondo gris claro
            const badgeTextColor = isDarkTheme ? '#ffffff' : '#374151' // gray-700
            const badgeBorder = isDarkTheme ? `1px solid ${categoryStyle.color || 'rgba(0,0,0,0.12)'}` : 'none'
            
            // Debug: ver qué tema está detectando
            if (product.id === 1) console.log('🎨 Theme detected:', { isDarkTheme, badgeTextColor, badgeBackground })
            
            return (
              <>
                {product.categoria && (
                  <div
                    className="category-badge"
                    aria-hidden={false}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: badgeTextColor,
                      background: badgeBackground,
                      border: badgeBorder,
                      marginBottom: '10px',
                      cursor: 'default'
                    }}
                  >
                    <span style={{ color: badgeTextColor }}>{product.categoria}</span>
                  </div>
                )}
                
                {product.medidas && (
                  <p style={{
                    color: secondaryTextColor,
                    fontSize: '0.9rem',
                    marginBottom: '8px'
                  }}>
                    📏 {product.medidas}
                  </p>
                )}

                {materialInfo && (
                  <p style={{
                    color: secondaryTextColor,
                    fontSize: '0.9rem',
                    marginBottom: '8px'
                  }}>
                    Material: {materialInfo.nombre} • {materialInfo.tipo} • {materialInfo.espesor || 'N/A'}mm
                  </p>
                )}
                
                {!materialInfo && product.tipoMaterial && (
                  <p style={{
                    color: secondaryTextColor,
                    fontSize: '0.9rem',
                    marginBottom: '8px'
                  }}>
                    Material: {product.tipoMaterial}
                  </p>
                )}
              </>
            )
          })()}

        {/* category badge moved above title; duplicate removed */}

        <div style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--accent-blue)',
          marginBottom: '16px'
        }}>
          {/* Mostrar precio con promoción si corresponde */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {product && product.hasPromotion && product.precioPromocional !== undefined && product.precioPromocional !== product.precioUnitario ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>{formatCurrency(product.precioUnitario || 0)}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(product.precioPromocional)}</div>
              </div>
            ) : (
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(product.precioUnitario || 0)}</div>
            )}

            {/* Mostrar badges de promoción al lado del precio */}
            {product && product.promotionBadges && product.promotionBadges.length > 0 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                {product.promotionBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: badge.color || '#ef4444',
                      color: badge.textColor || '#ffffff',
                      padding: '3px 6px',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>
            )}

            {/* Indicador de stock al lado del precio */}
            {product.stock !== undefined && product.stock !== null && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: product.stock > 10 ? 'rgba(16, 185, 129, 0.1)' : product.stock > 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: product.stock > 10 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444',
                border: `1px solid ${product.stock > 10 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444'}`
              }}>
                <span>{product.stock > 0 ? '✓' : '✕'}</span>
                <span>Stock: {product.stock}</span>
              </div>
            )}
          </div>
        </div>

        {/* Controles de cantidad y botón */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px'
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
                padding: '6px 10px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.9rem'
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
                width: '40px',
                textAlign: 'center',
                padding: '6px 4px',
                fontSize: '0.9rem'
              }}
              min="1"
              max="999"
            />
            <button
              onClick={() => setQuantity(Math.min(999, quantity + 1))}
              style={{
                background: 'var(--bg-hover)',
                border: 'none',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            style={{
              flex: 'none',
              width: 'auto',
              minWidth: '120px',
              background: 'var(--accent-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span className="btn-icon" aria-hidden="true">🛒</span>
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
})

// Modal del carrito
function CartModal({ 
  cart, 
  products = [],
  onClose, 
  onUpdateQuantity, 
  onRemoveItem, 
  onApplyCoupon,
  onProceedToCheckout,
  subtotal,
  discount,
  total,
  activeCoupon,
  currentUser,
  onEditProfile
}) {
  const [couponInput, setCouponInput] = useState('')

  // Cerrar con Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
                        {/* Mostrar precio considerando posible descuento */}
                        {
                          (() => {
                            // Buscar producto original para referencia si falta originalPrice en el item
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
                          })()
                        }
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
  products = [],
  onClose, 
  total,
  subtotal,
  discount,
  selectedDeliveryDate, 
  onDateSelect,
  onOrderComplete,
  saveOrder,
  addNotification,
  mode = 'order', // 'order' or 'edit'
  currentUser,
  paymentConfig,
  onProfileUpdate
}) {
  const [paymentMethod, setPaymentMethod] = useState('whatsapp')
  const [customerData, setCustomerData] = useState(() => {
    const u = currentUser || getCurrentUser()
    if (!u) return { name: '', apellido: '', phone: '', email: '', address: '' }
    return {
      name: u.nombre || u.name || u.email || '',
      apellido: u.apellido || u.lastName || '',
      phone: u.telefono || u.phone || u.telefonoMovil || '',
      email: u.email || u.correo || '',
      address: [u.direccion || u.address || '', u.localidad || u.city || '', u.cp || u.zip || '', u.provincia || u.state || ''].filter(Boolean).join(', ')
    }
  })
  const [comprobante, setComprobante] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false)
  
  // Ref para la sección de método de pago
  const paymentSectionRef = useRef(null)

  // Cerrar con Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Callback memoizado para acciones después de guardar el pedido
  // NOTA: La notificación se crea automáticamente en el backend (API)
  const handleOrderSuccess = useCallback((pedido, items) => {
    // La notificación ya se creó en el backend vía /api/notifications/create-order
  }, [])
  
  // Auto-scroll a método de pago en mobile si el perfil está completo
  useEffect(() => {
    // Verificar si estamos en mobile (ancho < 768px)
    const isMobile = window.innerWidth < 768
    if (!isMobile) return
    
    // Verificar si el perfil está completo
    const isProfileComplete = customerData.name && customerData.phone
    
    if (isProfileComplete && paymentSectionRef.current) {
      // Esperar un tick para asegurar que el DOM esté renderizado
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
    }
  }, [customerData.name, customerData.phone])

  // Sincronizar datos cuando cambia currentUser prop
  useEffect(() => {
    if (currentUser) {
      setCustomerData({
        name: currentUser.nombre || currentUser.name || currentUser.email || '',
        apellido: currentUser.apellido || currentUser.lastName || '',
        phone: currentUser.telefono || currentUser.phone || currentUser.telefonoMovil || '',
        email: currentUser.email || currentUser.correo || '',
        address: [currentUser.direccion || currentUser.address || '', currentUser.localidad || currentUser.city || '', currentUser.cp || currentUser.zip || '', currentUser.provincia || currentUser.state || ''].filter(Boolean).join(', ')
      })
    }
  }, [currentUser])

  // Auto-colapsar formulario si los datos están completos (solo en carga inicial)
  useEffect(() => {
    const isProfileComplete = customerData.name && customerData.phone
    // Solo colapsar automáticamente si es la primera carga y el perfil está completo
    // No colapsar durante la edición del usuario
    if (isProfileComplete && !isProfileCollapsed) {
      setIsProfileCollapsed(true)
    }
  }, []) // Sin dependencias para que solo se ejecute una vez al montar

  // Prefill datos del usuario si está logueado
  useEffect(() => {
    const applyUser = (user) => {
      if (!user) return
      setCustomerData(prev => ({
        ...prev,
        name: user.nombre || user.name || user.email || '',
        apellido: user.apellido || user.lastName || '',
        phone: user.telefono || user.phone || '',
        email: user.email || user.correo || '',
        address: [user.direccion || user.address || '', user.localidad || user.city || '', user.cp || user.zip || '', user.provincia || user.state || ''].filter(Boolean).join(', ')
      }))
    }

    // Prefill on mount from localStorage (already done via useState), but also listen to updates
    const onUserUpdated = (e) => {
      try {
        const user = e && e.detail ? e.detail : getCurrentUser()
        if (user) applyUser(user)
      } catch (err) { /* noop */ }
    }

    const onStorage = (e) => {
      if (e.key === 'currentUser') {
        try {
          const user = e.newValue ? JSON.parse(e.newValue) : null
          if (user) applyUser(user)
        } catch (err) {}
      }
    }

    window.addEventListener('user:updated', onUserUpdated)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('user:updated', onUserUpdated)
      window.removeEventListener('storage', onStorage)
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

      const result = await saveOrder(orderData, handleOrderSuccess)
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
        // Mensaje más útil con instrucciones para liberar espacio en el navegador
        createToast('Espacio insuficiente en el navegador. No se pudo guardar el pedido por completo. Para liberar espacio: abre DevTools → Application → Clear storage, o borra la clave "pedidosCatalogo" en Local Storage. También podés intentarlo en otro navegador.', 'error')

        // Ofrecer al usuario limpiar datos locales automáticamente (confirm)
        try {
          if (typeof window !== 'undefined' && window.confirm && window.confirm('Se detectó falta de espacio en el almacenamiento local. ¿Querés que el sitio elimine datos locales temporales (pedidos antiguos y carrito) para intentar liberar espacio ahora?')) {
            try {
              localStorage.removeItem('pedidosCatalogo')
              localStorage.removeItem('cart')
              createToast('Datos locales eliminados. Intentá enviar el pedido nuevamente.', 'success')
            } catch (e) {
              console.error('Error clearing localStorage after QuotaExceededError', e)
              createToast('No se pudo eliminar datos locales automáticamente. Por favor, borralos manualmente desde DevTools > Application.', 'error')
            }
          }
        } catch (e) {
          // silenciar si el confirm no está disponible
        }
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

          {/* Sección colapsable de datos del usuario */}
          <div style={{ marginBottom: 18, border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
            <button 
              onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '14px 16px', 
                background: isProfileCollapsed ? 'var(--bg-secondary)' : 'var(--bg-hover)', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>👤</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Tus datos</div>
                  {isProfileCollapsed && customerData.name && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {customerData.name} {customerData.apellido} • {customerData.phone}
                    </div>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', transform: isProfileCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}>▼</span>
            </button>

            {!isProfileCollapsed && (
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Nombre *</label>
                    <input value={customerData.name} onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="given-name" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Apellido</label>
                    <input value={customerData.apellido} onChange={(e) => setCustomerData(prev => ({ ...prev, apellido: e.target.value }))} placeholder="Apellido" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="family-name" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Teléfono *</label>
                    <input value={customerData.phone} onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Teléfono" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="tel" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
                    <input value={customerData.email} onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))} placeholder="Email (opcional)" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="email" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Dirección</label>
                  <input value={customerData.address} onChange={(e) => setCustomerData(prev => ({ ...prev, address: e.target.value }))} placeholder="Dirección" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} readOnly={false} disabled={false} tabIndex={0} autoComplete="street-address" />
                </div>
              </div>
            )}
          </div>

          <section ref={paymentSectionRef} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>💰 Elegir método de pago</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setPaymentMethod('whatsapp')} style={{ padding: '10px 12px', borderRadius: 8, border: paymentMethod === 'whatsapp' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: paymentMethod === 'whatsapp' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>💬 WhatsApp</button>
              <button onClick={() => setPaymentMethod('transferencia')} style={{ padding: '10px 12px', borderRadius: 8, border: paymentMethod === 'transferencia' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: paymentMethod === 'transferencia' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>🏦 Transferencia (Seña 50%)</button>
              <button onClick={() => setPaymentMethod('retiro')} style={{ padding: '10px 12px', borderRadius: 8, border: paymentMethod === 'retiro' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: paymentMethod === 'retiro' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>🏪 Retiro</button>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{paymentMethod === 'transferencia' ? `Seña: ${formatCurrency(total * 0.5)} — Total: ${formatCurrency(total)}` : ''}</div>

            {/* Retiro info removed as requested */}

            {paymentMethod === 'whatsapp' && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>💬 Solicitar pedido por WhatsApp</div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {paymentConfig?.whatsapp?.mensaje || 'Podés enviar tu pedido por WhatsApp y coordinamos los detalles de pago y entrega.'}
                </div>
              </div>
            )}

            {paymentMethod === 'retiro' && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>📍 Retiro en local</div>
                {(paymentConfig?.retiro?.direccion || paymentConfig?.retiro?.horarios) && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    {paymentConfig.retiro.direccion && (
                      <div><strong>Dirección:</strong> {paymentConfig.retiro.direccion}</div>
                    )}
                    {paymentConfig.retiro.horarios && (
                      <div style={{ marginTop: 4 }}><strong>Horarios:</strong> {paymentConfig.retiro.horarios}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bloque independiente de información sobre Transferencia (solo visible si el usuario selecciona Transferencia) */}
            {(paymentMethod === 'transferencia' || paymentMethod === 'whatsapp') && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>ℹ️ Información sobre Transferencia</div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Nota: si elegís el método <strong>Transferencia</strong> y realizas una (seña 50%), podés seleccionar una fecha de entrega disponible en el calendario.
                </div>
              </div>
            )}

            {/* Bloque independiente de información sobre Retiro (visible solo si el usuario selecciona Retiro) */}
            {paymentMethod === 'retiro' && paymentConfig?.retiro?.direccion && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>🚚 Información de retiro</div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Si elegís retirar por local podés pasar a buscar tu pedido en nuestro punto de retiro. {paymentConfig.retiro.horarios && `Horario de retiro: ${paymentConfig.retiro.horarios}.`} Avisanos por WhatsApp si llegás fuera de ese horario.
                </div>
              </div>
            )}
          </section>

          {paymentMethod === 'transferencia' && (
            <section style={{ marginBottom: 18 }}>
              <div className="transfer-section" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fecha de entrega solicitada</label>
                  <AvailabilityCalendar className="checkout-calendar" cart={cart} selectedDate={selectedDeliveryDate} onDateSelect={onDateSelect} />
                </div>

                <div className="comprobante-upload" style={{ width: 220, minWidth: 0 }}>
                  {/* input escondido y botón visible para mejor UX en mobile */}
                  <div className="comprobante-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input id="comprobante-file" type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button type="button" onClick={() => { const el = document.getElementById('comprobante-file'); if (el) el.click() }} className="comprobante-btn" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #7dd3fc', background: 'var(--bg-hover)', cursor: 'pointer' }}>Subir comprobante</button>
                    {comprobante && (
                      <img src={comprobante} alt="comprobante" className="comprobante-thumb" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                    )}
                  </div>

                  {comprobante && <div className="comprobante-saved" style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: 'var(--accent-secondary)', color: '#fff', fontSize: 12 }}>✓ Comprobante cargado</div>}
                </div>
              </div>

              <div className="transfer-payment-info" style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-card)', fontFamily: 'monospace', fontSize: 13 }}>
                {paymentConfig?.transferencia?.cbu && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div><strong>CBU:</strong> {paymentConfig.transferencia.cbu}</div>
                    <div>
                      <button className="btn-copy" onClick={() => { navigator.clipboard?.writeText(paymentConfig.transferencia.cbu); createToast('CBU copiado', 'success') }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}>Copiar</button>
                    </div>
                  </div>
                )}

                {paymentConfig?.transferencia?.alias && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                    <div><strong>Alias:</strong> <span style={{ fontFamily: 'monospace', marginLeft: 8 }}>{paymentConfig.transferencia.alias}</span></div>
                    <div>
                      <button
                        className="btn-copy"
                        onClick={() => { navigator.clipboard?.writeText(paymentConfig.transferencia.alias); createToast('Alias copiado', 'success') }}
                        aria-label="Copiar alias"
                        title="Copiar alias"
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {/* clipboard icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {paymentConfig?.transferencia?.titular && (
                  <div style={{ marginTop: 8 }}>
                    <div><strong>Titular:</strong> {paymentConfig.transferencia.titular}</div>
                  </div>
                )}

                {paymentConfig?.transferencia?.banco && (
                  <div style={{ marginTop: 8 }}>
                    <div><strong>Banco:</strong> {paymentConfig.transferencia.banco}</div>
                  </div>
                )}

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
            {cart.map((item, idx) => {
              const prod = products.find(p => String(p.id) === String(item.productId || item.idProducto))
              const original = (item.originalPrice !== undefined && item.originalPrice !== null) ? item.originalPrice : (prod ? (prod.precioUnitario || prod.precio) : item.price)
              const unitPrice = item.price !== undefined ? item.price : (prod ? (prod.precioPromocional || prod.precioUnitario || prod.precio) : 0)
              const lineTotal = unitPrice * item.quantity
              const lineSavings = Math.max(0, (original - unitPrice) * item.quantity)

              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 14, alignItems: 'center' }}>
                  <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name} × {item.quantity}</div>
                    {original > unitPrice && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ textDecoration: 'line-through', marginRight: 8 }}>{formatCurrency(original)}</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{formatCurrency(unitPrice)}</span>
                        <span style={{ marginLeft: 8, color: '#059669' }}>Ahorras {formatCurrency(lineSavings)}</span>
                      </div>
                    )}
                    {original <= unitPrice && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatCurrency(unitPrice)} cada uno</div>
                    )}
                  </div>
                  <div style={{ marginLeft: 8, fontWeight: 700 }}>{formatCurrency(lineTotal)}</div>
                </div>
              )
            })}
          </div>

          {/* Mostrar total ahorrado por promociones */}
          {(() => {
            const totalSaved = cart.reduce((sum, item) => {
              const prod = products.find(p => String(p.id) === String(item.productId || item.idProducto))
              const original = (item.originalPrice !== undefined && item.originalPrice !== null) ? item.originalPrice : (prod ? (prod.precioUnitario || prod.precio) : item.price)
              const unitPrice = item.price !== undefined ? item.price : (prod ? (prod.precioPromocional || prod.precioUnitario || prod.precio) : 0)
              return sum + Math.max(0, (original - unitPrice) * item.quantity)
            }, 0)

            if (totalSaved > 0) {
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700, marginBottom: 8 }}>
                  <div>Has ahorrado</div>
                  <div>{formatCurrency(totalSaved)}</div>
                </div>
              )
            }
            return null
          })()}

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

              <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Volver al carrito</button>
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

