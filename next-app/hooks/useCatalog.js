// Hooks personalizados para el catálogo

import { useState, useEffect, useCallback } from 'react'
import { applyPromotionsToProduct } from '../utils/promoEngine'
import { getProductosPublicados } from '../utils/supabaseProducts'
import { getPromocionesActivas } from '../utils/supabaseMarketing'
import { getAllMateriales } from '../utils/supabaseMateriales'
import supabase from '../utils/supabaseClient'

// Hook para gestionar productos
export function useProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [promociones, setPromociones] = useState([])
  const [materials, setMaterials] = useState([])
  
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    if (typeof window === 'undefined') return
    
    setIsLoading(true)
    try {
      // Cargar materiales desde Supabase
      const { data: materialesData, error: materialesError } = await getAllMateriales()
      if (materialesError) {
        console.error('Error loading materiales:', materialesError)
      } else {
        // Mapear de snake_case a camelCase
        const mappedMateriales = (materialesData || []).map(m => ({
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
        setMaterials(mappedMateriales)
      }
      
      // Cargar promociones activas desde Supabase
      const { data: promosData, error: promosError } = await getPromocionesActivas()
      if (promosError) {
        console.error('Error loading promociones:', promosError)
      }
      
      const promocionesActivas = (promosData || []).map(p => ({
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
        precioEspecial: p.precio_especial
      }))
      
      setPromociones(promocionesActivas)
      
      // Obtener productos publicados desde Supabase
      const { data: productosBase, error } = await getProductosPublicados()
      
      if (error) {
        console.error('Error loading published products:', error)
        setProducts([])
        setCategories([])
        setIsLoading(false)
        return
      }
      
      // Mapear campos de snake_case a camelCase
      const mappedProducts = (productosBase || []).map(p => {
        // Calcular costo material
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
          unidadesPorPlaca: unidadesPorPlaca,
          usoPlacas: p.uso_placas || 0,
          costoPlaca: costoPlaca,
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
          fechaCreacion: p.created_at || new Date().toISOString()
        }
      })
      
      const validProducts = mappedProducts.filter(p => 
        p.active && p.publicado && (p.tipo === 'Venta' || p.tipo === 'Stock')
      )
      
      // Enriquecer productos con información de promociones
      const enriched = validProducts.map(p => {
        try {
          const promo = applyPromotionsToProduct(p, promocionesActivas)
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
    } catch (error) {
      console.error('Error in loadProducts:', error)
      setProducts([])
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  return { products, categories, isLoading, reloadProducts: loadProducts }
}

// Hook para gestionar el carrito
export function useCart() {
  const [cart, setCart] = useState([])

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    if (typeof window === 'undefined') return
    
    try {
      const savedCart = JSON.parse(localStorage.getItem('cart')) || []
      
      // Cargar productos desde Supabase en lugar de localStorage
      const { data: productosBase, error: productosError } = await getProductosPublicados()
      
      if (productosError || !productosBase) {
        console.warn('Error cargando productos para normalizar el carrito:', productosError)
        // Fallback: usar los datos del carrito tal como están
        setCart(savedCart)
        return
      }

      // Cargar promociones activas desde Supabase para aplicarlas al carrito
      let promocionesActivas = []
      try {
        const { data: promosData, error: promosError } = await getPromocionesActivas()
        if (!promosError && promosData) {
          promocionesActivas = (promosData || []).map(p => ({
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
          }))
        }
      } catch (err) {
        console.warn('No se pudieron cargar promociones para normalizar el carrito:', err)
      }

      const normalized = savedCart.map(item => {
        try {
          // Buscar producto en la data de Supabase
          const prod = productosBase.find(p => String(p.id) === String(item.productId || item.idProducto))
          if (!prod) return item
          
          // Mapear producto a formato frontend
          const productoMapeado = {
            id: prod.id,
            nombre: prod.nombre,
            categoria: prod.categoria,
            tipo: prod.tipo,
            precioUnitario: prod.precio_unitario || 0,
            medidas: prod.medidas
          }
          
          // Aplicar motor de promociones al producto
          const promo = applyPromotionsToProduct(productoMapeado, promocionesActivas)
          const promoPrice = promo && promo.hasPromotion ? promo.discountedPrice : productoMapeado.precioUnitario
          const unitPrice = promoPrice !== undefined && promoPrice !== null ? promoPrice : (productoMapeado.precioUnitario || item.price || 0)
          
          return {
            ...item,
            price: unitPrice,
            originalPrice: item.originalPrice !== undefined && item.originalPrice !== null ? item.originalPrice : (productoMapeado.precioUnitario || unitPrice)
          }
        } catch (e) {
          console.warn('Error normalizando item del carrito:', e)
          return item
        }
      })

      // Persistir la versión normalizada para evitar discrepancias visuales
      localStorage.setItem('cart', JSON.stringify(normalized))
      setCart(normalized)
    } catch (err) {
      console.warn('Error loading/normalizing cart:', err)
      const fallback = JSON.parse(localStorage.getItem('cart') || '[]')
      setCart(fallback)
    }
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
        estadoPago: orderData.estadoPago || 'sin_seña',
        comprobante: orderData.comprobante || null,
        comprobanteOmitido: orderData._comprobanteOmitted || false,
        fechaSolicitudEntrega: orderData.fechaSolicitudEntrega || null,
        total: orderData.total
      }

      // Determinar si aplica envío gratis a todo el carrito
      try {
        const { applyPromotionsToCart } = await import('../utils/promoEngine')
        const { getPromocionesActivas } = await import('../utils/supabaseMarketing')
        const { data: promosData } = await getPromocionesActivas()
        const promoResult = applyPromotionsToCart(orderData.items || [], promosData || [])
        pedidoData.envioGratis = !!promoResult.freeShipping
      } catch (promoErr) {
        // No bloquear el checkout si el motor de promos falla
        console.warn('No se pudo calcular envío gratis para el pedido:', promoErr)
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
      // ============================================
      try {
        const supabase = (await import('../utils/supabaseClient')).default

        for (const item of items) {
          const { data: producto, error: fetchError } = await supabase
            .from('productos')
            .select('stock')
            .eq('id', item.idProducto)
            .single()

          if (fetchError) {
            console.warn(`Error obteniendo stock del producto ${item.idProducto}:`, fetchError)
            continue
          }

          const nuevoStock = Math.max(0, (producto.stock || 0) - item.quantity)

          const { error: updateError } = await supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', item.idProducto)

          if (updateError) {
            console.warn(`Error actualizando stock del producto ${item.idProducto}:`, updateError)
          }
        }
      } catch (stockError) {
        console.error('Error descontando stock:', stockError)
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
        console.error('Error creando notificación:', notificationError)
      }

      // Llamar al callback de éxito si existe
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(data.pedido, items)
      }

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
        console.warn('Error guardando en localStorage:', localStorageError)
      }

      return { success: true, orderId: data.pedido.id, order: { _comprobanteOmitted: false } }
    } catch (error) {
      console.error('Error guardando pedido:', error)
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