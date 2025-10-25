// Hooks personalizados para el catálogo

import { useState, useEffect } from 'react'
import { applyPromotionsToProduct } from '../utils/promoEngine'

// Hook para gestionar productos
export function useProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = () => {
    if (typeof window === 'undefined') return
    
    const productosBase = JSON.parse(localStorage.getItem('productosBase')) || []
    const validProducts = productosBase.filter(p => 
      p.active && p.publicado && (p.tipo === 'Venta' || p.tipo === 'Stock')
    )
    
    // Enriquecer productos con información de promociones (si las hay)
    const enriched = validProducts.map(p => {
      try {
        const promo = applyPromotionsToProduct(p)
        return {
          ...p,
          promoResult: promo,
          precioPromocional: promo && promo.hasPromotion ? promo.discountedPrice : p.precioUnitario,
          hasPromotion: !!(promo && promo.hasPromotion),
          promotionBadges: promo && promo.badges ? promo.badges : []
        }
      } catch (e) {
        // Si algo falla con el motor de promociones, devolver el producto original
        console.warn('Error aplicando promociones al producto', p.id, e)
        return p
      }
    })

    setProducts(enriched)
    
    // Extraer categorías únicas
    const uniqueCategories = [...new Set(validProducts
      .map(p => p.categoria)
      .filter(cat => cat && cat.trim() !== ''))]
    
    setCategories(uniqueCategories)
  }

  return { products, categories, loadProducts }
}

// Hook para gestionar el carrito
export function useCart() {
  const [cart, setCart] = useState([])

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = () => {
    if (typeof window === 'undefined') return
    
    const savedCart = JSON.parse(localStorage.getItem('cart')) || []
    setCart(savedCart)
  }

  const saveCart = (newCart) => {
    if (typeof window === 'undefined') return
    
    localStorage.setItem('cart', JSON.stringify(newCart))
    setCart(newCart)
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
      newCart = [...cart, {
        productId: product.id,
        idProducto: product.id,
        name: product.nombre,
        price: product.precioUnitario || 0,
        originalPrice: product.precioUnitario || 0,
        measures: product.medidas || '',
        image: product.imagen,
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

// Hook para gestionar pedidos
export function useOrders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = () => {
    if (typeof window === 'undefined') return []
    
    try {
      const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      setOrders(pedidosCatalogo)
      return pedidosCatalogo
    } catch (error) {
      console.error('Error loading orders:', error)
      setOrders([])
      return []
    }
  }

  const saveOrder = (orderData) => {
    if (typeof window === 'undefined') return { success: false, error: 'No window object' }

    try {
      // Obtener usuario actual si está disponible
      let currentUser = null
      try {
        if (typeof getCurrentUser === 'function') {
          currentUser = getCurrentUser()
        } else if (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') {
          currentUser = window.KONDAuth.currentUser()
        }
      } catch (e) {
        console.warn('Error obteniendo usuario actual:', e)
      }

      // Crear estructura de pedido compatible con el sistema original
      const order = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        tipo: 'catalogo',
        cliente: orderData.cliente,
        // Información del usuario (si está disponible)
        userId: orderData.userId !== undefined ? orderData.userId : (currentUser ? currentUser.id : undefined),
        userEmail: orderData.userEmail !== undefined ? orderData.userEmail : (currentUser ? currentUser.email : undefined),
        // Productos en formato original
        productos: orderData.items ? orderData.items.map(item => ({
          productId: item.idProducto || item.productId,
          nombre: item.name,
          cantidad: item.quantity,
          precioUnitario: item.price,
          medidas: item.measures,
          tiempoUnitario: item.tiempoUnitario || '00:00:00',
          precioPorMinuto: item.precioPorMinuto || 0,
          imagen: item.imagen || null,
          subtotal: item.price * item.quantity
        })) : [],
        subtotal: orderData.subtotal,
        descuento: orderData.descuento || 0,
        descuentoCode: orderData.descuentoCode || null,
        total: orderData.total,
        metodoPago: orderData.metodoPago,
        estadoPago: orderData.estadoPago || 'sin_seña',
        comprobante: orderData.comprobante || null,
        estado: 'pendiente',
        fechaSolicitudEntrega: orderData.fechaSolicitudEntrega || null,
        fechaConfirmadaEntrega: null,
        fechaCreacion: new Date().toISOString(),
        notas: orderData.notas || '',
        tiempoTotalProduccion: orderData.tiempoTotalProduccion || 0
      }

      // Calcular monto recibido para señas
      if (orderData.montoRecibido !== undefined && orderData.montoRecibido !== null) {
        order.montoRecibido = Number(orderData.montoRecibido)
      } else if (orderData.estadoPago === 'seña_pagada') {
        // Convención: si se indica seña_pagada y no se pasa monto, asumimos 50%
        order.montoRecibido = Number((order.total || 0) * 0.5)
      }

      const existingOrders = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      
      // Limitar a los últimos 200 pedidos para evitar exceder la cuota
      if (existingOrders.length >= 200) {
        existingOrders.splice(0, existingOrders.length - 199)
      }
      
      // Intentar guardar con comprobante
      existingOrders.push(order)
      
      try {
        localStorage.setItem('pedidosCatalogo', JSON.stringify(existingOrders))
      } catch (err) {
        console.warn('localStorage.setItem failed for pedidosCatalogo', err)
        
        // Si falla por QuotaExceeded, intentar sin comprobante
        if (order.comprobante) {
          order._comprobanteOmitted = true
          order.comprobante = null
          
          try {
            localStorage.setItem('pedidosCatalogo', JSON.stringify(existingOrders))
            console.warn('Pedido guardado sin comprobante debido a limitaciones de espacio')
          } catch (err2) {
            console.error('Reintento de guardado sin comprobante falló', err2)
            // Remover el pedido del array para evitar inconsistencias
            existingOrders.pop()
            
            // Si aún falla, reducir a los últimos 50 pedidos
            if (existingOrders.length > 50) {
              existingOrders.splice(0, existingOrders.length - 49)
              try {
                existingOrders.push(order)
                localStorage.setItem('pedidosCatalogo', JSON.stringify(existingOrders))
                console.warn('Pedido guardado después de reducir a 50 pedidos')
              } catch (err3) {
                console.error('Falló incluso después de reducir a 50 pedidos', err3)
                throw err3
              }
            } else {
              throw err2
            }
          }
        } else {
          // Si no hay comprobante y aún falla, reducir pedidos antiguos
          existingOrders.pop()
          if (existingOrders.length > 50) {
            existingOrders.splice(0, existingOrders.length - 49)
            try {
              existingOrders.push(order)
              localStorage.setItem('pedidosCatalogo', JSON.stringify(existingOrders))
              console.warn('Pedido guardado después de reducir a 50 pedidos (sin comprobante)')
            } catch (err2) {
              console.error('Falló incluso después de reducir a 50 pedidos (sin comprobante)', err2)
              throw err2
            }
          } else {
            throw err
          }
        }
      }
      
      // Actualizar estado local
      setOrders(existingOrders)

      // Notificar a listeners (admin, finanzas, etc.)
      try {
        window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'create', order } }))
      } catch (e) {}
      
      return { success: true, order }
    } catch (error) {
      console.error('Error saving order:', error)
      return { success: false, error }
    }
  }

  const updateOrderStatus = (orderId, newStatus) => {
    if (typeof window === 'undefined') return false

    try {
      const existingOrders = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      const updatedOrders = existingOrders.map(order => 
        order.id === orderId ? { ...order, estado: newStatus } : order
      )
      
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedOrders))
      
      // Actualizar estado local
      setOrders(updatedOrders)

      // Notificar actualización
      try {
        window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'update-status', orderId, newStatus } }))
      } catch (e) {}
      
      return { success: true }
    } catch (error) {
      console.error('Error updating order status:', error)
      return { success: false, error }
    }
  }

  const updateOrderPaymentStatus = (orderId, newPaymentStatus) => {
    if (typeof window === 'undefined') return false

    try {
      const existingOrders = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      const updatedOrders = existingOrders.map(order => 
        order.id === orderId ? { ...order, estadoPago: newPaymentStatus } : order
      )
      
      localStorage.setItem('pedidosCatalogo', JSON.stringify(updatedOrders))
      
      // Actualizar estado local
      setOrders(updatedOrders)

      // Notificar actualización de pago
      try {
        window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'update-payment', orderId, newPaymentStatus } }))
      } catch (e) {}
      
      return { success: true }
    } catch (error) {
      console.error('Error updating payment status:', error)
      return { success: false, error }
    }
  }

  const deleteOrder = (orderId) => {
    if (typeof window === 'undefined') return false

    try {
      const existingOrders = JSON.parse(localStorage.getItem('pedidosCatalogo')) || []
      const filteredOrders = existingOrders.filter(order => order.id !== orderId)
      
      localStorage.setItem('pedidosCatalogo', JSON.stringify(filteredOrders))
      
      // Actualizar estado local
      setOrders(filteredOrders)

      // Notificar eliminación
      try {
        window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated', { detail: { type: 'delete', orderId } }))
      } catch (e) {}
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting order:', error)
      return { success: false, error }
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
    updateOrderPaymentStatus,
    deleteOrder,
    getOrders
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
      console.error('Error loading internal orders:', error)
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
      console.error('Error saving internal order:', error)
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
      console.error('Error updating internal order status:', error)
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
      console.error('Error deleting internal order:', error)
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
      console.warn('Error obteniendo usuario:', e)
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
      console.error('Error loading user orders:', error)
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