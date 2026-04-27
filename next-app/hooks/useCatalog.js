// Hooks personalizados para el catálogo

import { useState, useEffect, useCallback, useMemo } from 'react'
import { applyPromotionsToProduct } from '../utils/promoEngine'
import { useProductosPublicados, useMateriales, usePromocionesActivas } from './useSupabaseQuery'

// ---------------------------------------------------------------------------
// Helpers de mapeo (snake_case → camelCase) — usados por múltiples hooks
// ---------------------------------------------------------------------------

function mapPromo(p) {
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    valor: p.valor,
    aplicaA: p.aplica_a,
    categoria: p.categoria,
    productoId: p.producto_id,
    fechaInicio: p.fecha_inicio,
    fechaFin: p.fecha_fin,
    activo: p.activo,
    prioridad: p.prioridad,
    badgeTexto: p.badge_texto,
    badgeColor: p.badge_color,
    badgeTextColor: p.badge_text_color,
    descuentoPorcentaje: p.descuento_porcentaje,
    descuentoMonto: p.descuento_monto,
    precioEspecial: p.precio_especial,
    config: p.configuracion || p.config
  }
}

function mapProducto(p) {
  const unidadesPorPlaca = p.unidades_por_placa || 1
  const costoPlaca = p.costo_placa || 0
  const costoMaterialCalculado = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    tipo: p.tipo,
    medidas: p.medidas,
    tiempoUnitario: p.tiempo_unitario || '00:00:30',
    active: p.active !== undefined ? p.active : true,
    publicado: p.publicado !== undefined ? p.publicado : false,
    hiddenInProductos: p.hidden_in_productos || false,
    unidadesPorPlaca,
    usoPlacas: p.uso_placas || 0,
    costoPlaca,
    costoMaterial: parseFloat(costoMaterialCalculado.toFixed(2)),
    materialId: p.material_id || '',
    material: p.material || '',
    tipoMaterial: p.tipo_material || '',
    margenMaterial: p.margen_material || 0,
    precioUnitario: p.precio_unitario || 0,
    precioPromos: p.precio_promos || 0,
    stock: p.stock || 0,
    unidades: p.unidades || 1,
    ensamble: p.ensamble || 'Sin ensamble',
    imagen: (p.imagenes_urls && p.imagenes_urls.length > 0) ? p.imagenes_urls[0] : '',
    imagenes: p.imagenes_urls || [],
    description: p.description || '',
    fechaCreacion: p.created_at || new Date().toISOString()
  }
}

// Hook para gestionar productos
export function useProducts() {
  // React Query — data is cached and shared across hook instances (5 min staleTime)
  const { data: productosRaw, isLoading: loadingProductos } = useProductosPublicados()
  const { data: promosRaw, isLoading: loadingPromos } = usePromocionesActivas()
  const { data: materialesRaw, isLoading: loadingMateriales } = useMateriales()

  const isLoading = loadingProductos || loadingPromos || loadingMateriales

  const promociones = useMemo(() => {
    const data = Array.isArray(promosRaw) ? promosRaw : (promosRaw?.data || [])
    return data.map(mapPromo)
  }, [promosRaw])

  const materials = useMemo(() => {
    const data = Array.isArray(materialesRaw) ? materialesRaw : (materialesRaw?.data || [])
    return data.map(m => ({
      id: m.id,
      nombre: m.nombre,
      tipo: m.tipo,
      tamano: m.tamano,
      espesor: m.espesor,
      unidad: m.unidad,
      costoUnitario: m.costo_unitario,
      proveedor: m.proveedor,
      stock: m.stock,
      notas: m.notas
    }))
  }, [materialesRaw])

  const { products, categories } = useMemo(() => {
    const productosBase = Array.isArray(productosRaw) ? productosRaw : (productosRaw?.data || [])
    const mapped = productosBase.map(mapProducto)
    const valid = mapped.filter(p => p.active && p.publicado && (p.tipo === 'Corte Laser' || p.tipo === 'Grabado Laser' || p.tipo === 'Venta' || p.tipo === 'Stock'))
    const enriched = valid.map(p => {
      try {
        const promo = applyPromotionsToProduct(p, promociones)
        return {
          ...p,
          promoResult: promo,
          precioPromocional: promo && promo.hasPromotion ? promo.discountedPrice : p.precioUnitario,
          hasPromotion: !!(promo && promo.hasPromotion),
          promotionBadges: promo && promo.badges ? promo.badges : []
        }
      } catch (e) {
        return p
      }
    })
    const uniqueCategories = [...new Set(valid.map(p => p.categoria).filter(cat => cat && cat.trim() !== ''))]
    return { products: enriched, categories: uniqueCategories }
  }, [productosRaw, promociones])

  // reloadProducts is a no-op — React Query handles refetching via invalidateQueries
  const reloadProducts = useCallback(() => {}, [])

  return { products, categories, isLoading, reloadProducts, promociones, materials }
}

// Hook para gestionar el carrito
// Price normalization reads from the React Query cache (shared with useProducts).
// No direct Supabase fetches — data is already cached by useProductosPublicados / usePromocionesActivas.
export function useCart() {
  const [cart, setCart] = useState([])

  // Pull from React Query cache — zero extra network requests when useProducts was already called
  const { data: productosRaw } = useProductosPublicados()
  const { data: promosRaw } = usePromocionesActivas()

  // Normalize cart prices using the cached data already in memory.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedCart = (() => {
      try { return JSON.parse(localStorage.getItem('cart')) || [] } catch { return [] }
    })()

    if (savedCart.length === 0) {
      setCart([])
      return
    }

    const cachedProductos = productosRaw?.data || null
    const cachedPromociones = promosRaw?.data ? promosRaw.data.map(mapPromo) : []

    // If cached data not yet available, show cart as-is; will re-run when data arrives
    if (!cachedProductos) {
      setCart(savedCart)
      return
    }

    const normalized = savedCart.map(item => {
      try {
        const prod = cachedProductos.find(p => String(p.id) === String(item.productId || item.idProducto))
        if (!prod) return item
        const productoMapeado = {
          id: prod.id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          tipo: prod.tipo,
          precioUnitario: prod.precio_unitario || 0,
          medidas: prod.medidas
        }
        const promo = applyPromotionsToProduct(productoMapeado, cachedPromociones)
        const promoPrice = promo && promo.hasPromotion ? promo.discountedPrice : productoMapeado.precioUnitario
        const unitPrice = promoPrice !== undefined && promoPrice !== null ? promoPrice : (productoMapeado.precioUnitario || item.price || 0)
        return {
          ...item,
          price: unitPrice,
          originalPrice: item.originalPrice !== undefined && item.originalPrice !== null ? item.originalPrice : (productoMapeado.precioUnitario || unitPrice)
        }
      } catch (e) {
        return item
      }
    })

    localStorage.setItem('cart', JSON.stringify(normalized))
    setCart(normalized)
  // Re-run when React Query cache delivers fresh data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosRaw, promosRaw])

  // Listen for cart updates triggered by other components in the same tab
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e) => {
      try {
        const newCart = e && e.detail ? e.detail : JSON.parse(localStorage.getItem('cart') || '[]')
        setCart(newCart)
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('cart:updated', handler)
    return () => window.removeEventListener('cart:updated', handler)
  }, [])

  const saveCart = (newCart) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('cart', JSON.stringify(newCart))
    setCart(newCart)

    // Broadcast the updated cart to other components in the same tab so
    // the header badge and other listeners update without needing a page reload
    try {
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: newCart }))
    } catch (e) {
      // ignore if CustomEvent not supported
    }
  }

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.productId === product.id)
    let newCart

    if (existingItem) {
      newCart = cart.map(item =>
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    } else {
      // Preferir precio promocional si el producto tiene una promoción aplicada
      const unitPrice = (product.precioPromocional !== undefined && product.precioPromocional !== null) ? product.precioPromocional : (product.precioUnitario || 0)
      newCart = [...cart, {
        productId: product.id,
        idProducto: product.id,
        name: product.nombre,
        // price: precio que se usa para cálculos (puede ser promocional)
        price: unitPrice,
        // originalPrice: precio base del producto (para mostrar ahorro si aplica)
        originalPrice: product.precioUnitario || unitPrice,
        measures: product.medidas || '',
        image: (product.imagenes && product.imagenes[0]) || product.imagen || '',
        quantity,
        tiempoUnitario: product.tiempoUnitario || '00:00:00',
        precioPorMinuto: product.precioPorMinuto || 0
      }]
    }

    saveCart(newCart)
  }

  const updateQuantity = (index, action) => {
    const newCart = [...cart]
    
    if (action === 'increase') {
      newCart[index].quantity++
    } else if (action === 'decrease') {
      if (newCart[index].quantity > 1) {
        newCart[index].quantity--
      } else {
        newCart.splice(index, 1)
      }
    }

    saveCart(newCart)
  }

  const removeItem = (index) => {
    const newCart = cart.filter((_, i) => i !== index)
    saveCart(newCart)
  }

  const clearCart = () => {
    localStorage.removeItem('cart')
    setCart([])
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return {
    cart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotal
  }
}

// Hook para gestionar cupones
export function useCoupons() {
  const [activeCoupon, setActiveCoupon] = useState(null)

  const coupons = {
    'LASER10': { type: 'percentage', value: 10, minAmount: 10000 },
    '5X1LLAVEROS': { type: 'fixed', value: 0, minQuantity: 5 }
  }

  const applyCoupon = (couponCode, cart, subtotal) => {
    const coupon = coupons[couponCode.toUpperCase()]
    if (!coupon) {
      return { success: false, message: 'Cupón inválido' }
    }

    if (coupon.minAmount && subtotal < coupon.minAmount) {
      return { 
        success: false, 
        message: `Compra mínima de $${coupon.minAmount.toLocaleString()} para este cupón` 
      }
    }

    if (couponCode === '5X1LLAVEROS') {
      const llaverosQty = cart.reduce((sum, item) => 
        sum + (item.name.toLowerCase().includes('llavero') ? item.quantity : 0), 0)
      
      if (llaverosQty < 5) {
        return { 
          success: false, 
          message: 'Necesitas al menos 5 llaveros para este cupón' 
        }
      }
    }

    setActiveCoupon({ code: couponCode.toUpperCase(), ...coupon })
    return { success: true, message: `Cupón ${couponCode.toUpperCase()} aplicado` }
  }

  const removeCoupon = () => {
    setActiveCoupon(null)
  }

  const calculateDiscount = (subtotal) => {
    if (!activeCoupon) return 0
    
    if (activeCoupon.type === 'percentage') {
      return subtotal * (activeCoupon.value / 100)
    }
    return activeCoupon.value
  }

  return {
    activeCoupon,
    applyCoupon,
    removeCoupon,
    calculateDiscount
  }
}

// Hook para gestionar pedidos internos
export function useInternalOrders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = () => {
    if (typeof window === 'undefined') return []
    
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidos')) || []
      setOrders(pedidos)
      return pedidos
    } catch (error) {
      setOrders([])
      return []
    }
  }

  const saveOrder = (order) => {
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidos')) || []
      const newOrder = {
        ...order,
        id: order.id || Date.now()
      }
      
      const existingIndex = pedidos.findIndex(p => p.id === newOrder.id)
      if (existingIndex >= 0) {
        pedidos[existingIndex] = newOrder
      } else {
        pedidos.push(newOrder)
      }
      
      localStorage.setItem('pedidos', JSON.stringify(pedidos))
      setOrders(pedidos)
      return newOrder
    } catch (error) {
      return null
    }
  }

  const updateOrderStatus = (orderId, newStatus) => {
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidos')) || []
      const updatedOrders = pedidos.map(order => 
        order.id === orderId ? { ...order, estado: newStatus } : order
      )
      
      localStorage.setItem('pedidos', JSON.stringify(updatedOrders))
      setOrders(updatedOrders)
      return true
    } catch (error) {
      return false
    }
  }

  const deleteOrder = (orderId) => {
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidos')) || []
      const filteredOrders = pedidos.filter(order => order.id !== orderId)
      
      localStorage.setItem('pedidos', JSON.stringify(filteredOrders))
      setOrders(filteredOrders)
      return true
    } catch (error) {
      return false
    }
  }

  const getOrders = () => {
    return orders
  }

  return {
    orders,
    loadOrders,
    saveOrder,
    updateOrderStatus,
    deleteOrder,
    getOrders
  }
}

// Hook para gestionar pedidos del usuario autenticado
export function useUserOrders() {
  const [userOrders, setUserOrders] = useState({ activas: [], entregadas: [] })
  const [isLoading, setIsLoading] = useState(false)

  // Obtener usuario actual de forma segura
  const getCurrentUserSafe = () => {
    try {
      if (typeof getCurrentUser === 'function') {
        return getCurrentUser()
      }
      
      if (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') {
        return window.KONDAuth.currentUser()
      }

      // Fallback: localStorage session
      const sess = JSON.parse(localStorage.getItem('kond_session') || '{}')
      const users = JSON.parse(localStorage.getItem('kond_users') || '[]')
      if (sess && sess.userId) {
        const found = users.find(x => String(x.id) === String(sess.userId))
        if (found) return found
      }

      // Otros posibles keys
      const alt = JSON.parse(localStorage.getItem('user') || 'null')
      if (alt && alt.email) return alt
      
      if (window.currentUser && typeof window.currentUser === 'object') {
        return window.currentUser
      }
    } catch (e) {
      // no user
    }
    return null
  }

  const loadUserOrders = () => {
    if (typeof window === 'undefined') return

    setIsLoading(true)
    try {
      const user = getCurrentUserSafe()
      if (!user) {
        setUserOrders({ activas: [], entregadas: [] })
        return
      }

      let pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      
      // Filtrar por userId/email del usuario actual
      pedidosCatalogo = pedidosCatalogo.filter(p => 
        String(p.userId) === String(user.id) || 
        String(p.userEmail || '').toLowerCase() === String(user.email || '').toLowerCase()
      )
      
      // Ordenar por fecha desc
      pedidosCatalogo.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      
      // Separar pedidos activos de entregados
      const activas = pedidosCatalogo.filter(p => p.estado !== 'entregado')
      const entregadas = pedidosCatalogo.filter(p => p.estado === 'entregado')
      
      setUserOrders({ activas, entregadas })
    } catch (error) {
      setUserOrders({ activas: [], entregadas: [] })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUserOrders()
  }, [])

  return {
    userOrders,
    isLoading,
    loadUserOrders,
    getCurrentUser: getCurrentUserSafe
  }
}

// Hook para gestionar pedidos del catálogo
export function useOrders() {
  const [isSaving, setIsSaving] = useState(false)

  const saveOrder = useCallback(async (orderData, onSuccess) => {
    if (typeof window === 'undefined') return { success: false, error: { message: 'Not in browser environment' } }

    setIsSaving(true)
    try {
      // Usar la función createPedidoCatalogo existente
      const { createPedidoCatalogo } = await import('../utils/supabasePedidos')
      const { formatCurrency } = await import('../utils/catalogUtils')

      const pedidoData = {
        cliente: orderData.cliente,
        metodoPago: orderData.metodoPago,
        estadoPago: orderData.estadoPago || 'pagado_total',
        comprobante: orderData.comprobante || null,
        comprobanteOmitido: orderData._comprobanteOmitted || false,
        fechaSolicitudEntrega: orderData.fechaSolicitudEntrega || null,
        total: orderData.total,
        // Monto recibido: solo considerar el total automáticamente si el método
        // de pago confirma la transacción (por ejemplo, transferencia).
        montoRecibido: orderData.metodoPago === 'transferencia'
          ? Number(orderData.montoRecibido || orderData.total || 0)
          : Number(orderData.montoRecibido || 0)
      }

      // Determinar si aplica envío gratis a todo el carrito
      try {
        const { applyPromotionsToCart } = await import('../utils/promoEngine')
        // NOTE (React Query): getPromocionesActivas() is called here inside an async mutation path
        // (saveOrder). React Query hooks cannot be called inside async functions, so we keep
        // this direct fetch. Impact is low: it only fires when the user submits an order.
        // Future improvement: pass promociones as a parameter from the component that calls useOrders.
        const { getPromocionesActivas: fetchPromos } = await import('../utils/supabaseMarketing')
        const { data: promosData } = await fetchPromos()
        const promoResult = applyPromotionsToCart(orderData.items || [], promosData || [])
        pedidoData.envioGratis = !!promoResult.freeShipping
      } catch (promoErr) {
        pedidoData.envioGratis = false
      }

      // Convertir items al formato esperado
      const items = orderData.items.map(item => ({
        idProducto: item.idProducto,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        measures: item.measures,
        imagen: item.imagen || item.image
      }))

      const { data, error } = await createPedidoCatalogo(pedidoData, items)

      if (error) {
        console.error('Error creando pedido:', error)
        return { success: false, error: { message: error.message || 'Error al crear el pedido' } }
      }

      // ============================================
      // DESCONTAR STOCK DE PRODUCTOS
      // Solo se descuenta cuando la venta está confirmada (transferencia, pasarelas de pago).
      // WhatsApp es una consulta — el stock se descuenta cuando el admin confirma la venta
      // desde Pedidos Internos.
      // ============================================
      if (orderData.metodoPago !== 'whatsapp') {
        try {
          const supabase = (await import('../utils/supabaseClient')).default

          // NOTE (T2.2 — N+1 stock update): This loop issues one SELECT + one UPDATE per cart item.
          // Batching is not attempted here because Supabase does not support a single atomic
          // "decrement by variable amounts for different rows" RPC without a custom DB function.
          // Risk of introducing a race condition or off-by-one on partial failures outweighs the
          // egress savings (this path only executes once per checkout, not on every page mount).
          // Future improvement: create a Postgres function `decrement_stock(items jsonb)` callable
          // via supabase.rpc() to collapse this into a single round-trip.
          for (const item of items) {
            const { data: producto, error: fetchError } = await supabase
              .from('productos')
              .select('stock')
              .eq('id', item.idProducto)
              .single()

            if (fetchError) {
              continue
            }

            const nuevoStock = Math.max(0, (producto.stock || 0) - item.quantity)

            const { error: updateError } = await supabase
              .from('productos')
              .update({ stock: nuevoStock })
              .eq('id', item.idProducto)

            if (updateError) {
            }
          }
        } catch (stockError) {
        }
      }

      // ============================================
      // CREAR NOTIFICACIÓN EN TIEMPO REAL
      // ============================================
      try {
        await fetch('/api/notifications/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pedidoId: data.pedido.id,
            cliente: orderData.cliente,
            total: orderData.total,
            metodoPago: orderData.metodoPago,
            items: items,
            envioGratis: data.pedido.envio_gratis || pedidoData.envioGratis || false,
            formatCurrency: formatCurrency
          })
        })
      } catch (notificationError) {
        // No fallar el pedido si la notificación falla
      }

      // ============================================
      // REGISTRAR MOVIMIENTO FINANCIERO (seña/pago)
      // ============================================
      const montoRecibido = Number(orderData.montoRecibido || 0)
      if (montoRecibido > 0) {
        try {
          const { createMovimiento } = await import('../utils/supabaseFinanzas')
          const clienteNombre = `${(orderData.cliente?.nombre || '').trim()} ${(orderData.cliente?.apellido || '').trim()}`.trim()
          const hoy = new Date().toISOString().split('T')[0]
          const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
          const totalPedido = Number(orderData.total || 0)
          const esPagoTotal = totalPedido > 0 && montoRecibido >= totalPedido
          const metodo = orderData.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo'

          await createMovimiento({
            tipo: 'ingreso',
            monto: montoRecibido,
            fecha: hoy,
            hora: horaActual,
            categoria: esPagoTotal ? 'Pago Pedido' : 'Seña Pedido',
            descripcion: esPagoTotal
              ? `Pago total - Pedido #${data.pedido.id} - ${clienteNombre}`
              : `Seña recibida - Pedido #${data.pedido.id} - ${clienteNombre}`,
            metodoPago: metodo,
            pedidoCatalogoId: data.pedido.id
          })
          // movimiento registrado
        } catch (finError) {
        }
      }

      // Llamar al callback de éxito si existe
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(data.pedido, items)
      }

      // Notificar a mis-pedidos que hay un pedido nuevo
      window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'new', orderId: data.pedido.id } }))

      // Guardar también en localStorage como respaldo
      try {
        const existingOrders = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
        const orderForStorage = {
          ...orderData,
          id: data.pedido.id,
          envioGratis: data.pedido.envio_gratis || pedidoData.envioGratis || false,
          fechaCreacion: new Date().toISOString()
        }
        existingOrders.push(orderForStorage)
        localStorage.setItem('pedidosCatalogo', JSON.stringify(existingOrders))
      } catch (localStorageError) {
      }

      return { success: true, orderId: data.pedido.id, order: { _comprobanteOmitted: false } }
    } catch (error) {
      return { success: false, error: { message: error.message || 'Error desconocido al guardar el pedido' } }
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    saveOrder,
    isSaving
  }
}
