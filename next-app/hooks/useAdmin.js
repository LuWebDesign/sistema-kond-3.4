/**
 * Hook personalizado para operaciones admin con Supabase
 * Integra productos, pedidos, clientes y estadísticas desde Supabase
 */

import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../supabase/client'

// Hook principal para datos administrativos
export function useAdminData() {
  const [adminStats, setAdminStats] = useState({
    totalProductos: 0,
    totalPedidos: 0,
    totalClientes: 0,
    balanceTotal: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    loadAdminStats()
  }, [])

  const loadAdminStats = async () => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, falling back to localStorage')
      loadStatsFromLocalStorage()
      return
    }

    try {
      setAdminStats(prev => ({ ...prev, loading: true, error: null }))

      // Cargar estadísticas en paralelo
      const [productosResult, pedidosResult, pedidosCatalogoResult] = await Promise.all([
        supabase.from('productos').select('*', { count: 'exact' }),
        supabase.from('pedidos').select('*', { count: 'exact' }),
        supabase.from('pedidos_catalogo').select('cliente, total', { count: 'exact' })
      ])

      if (productosResult.error) throw productosResult.error
      if (pedidosResult.error) throw pedidosResult.error
      if (pedidosCatalogoResult.error) throw pedidosCatalogoResult.error

      // Calcular clientes únicos
      const clientesUnicos = new Set()
      pedidosCatalogoResult.data?.forEach(pedido => {
        if (pedido.cliente?.email) {
          clientesUnicos.add(pedido.cliente.email)
        }
      })

      // Calcular balance total
      const balanceTotal = pedidosCatalogoResult.data?.reduce((total, pedido) => {
        return total + (pedido.total || 0)
      }, 0) || 0

      setAdminStats({
        totalProductos: productosResult.count || 0,
        totalPedidos: (pedidosResult.count || 0) + (pedidosCatalogoResult.count || 0),
        totalClientes: clientesUnicos.size,
        balanceTotal: balanceTotal,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Error loading admin stats from Supabase:', error)
      setAdminStats(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
      
      // Fallback a localStorage si falla Supabase
      loadStatsFromLocalStorage()
    }
  }

  const loadStatsFromLocalStorage = () => {
    try {
      const productos = JSON.parse(localStorage.getItem('productosBase') || '[]')
      const pedidosInternos = JSON.parse(localStorage.getItem('pedidos') || '[]')
      const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      
      const clientesSet = new Set()
      pedidosCatalogo.forEach(pedido => {
        if (pedido.cliente?.email) {
          clientesSet.add(pedido.cliente.email)
        }
      })
      
      const balanceTotal = pedidosCatalogo.reduce((total, pedido) => {
        return total + (pedido.total || 0)
      }, 0)

      setAdminStats({
        totalProductos: productos.length,
        totalPedidos: pedidosInternos.length + pedidosCatalogo.length,
        totalClientes: clientesSet.size,
        balanceTotal: balanceTotal,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error loading stats from localStorage:', error)
      setAdminStats(prev => ({
        ...prev,
        loading: false,
        error: 'Error loading data'
      }))
    }
  }

  return { adminStats, refreshStats: loadAdminStats }
}

// Hook para productos admin
export function useAdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    if (!isSupabaseConfigured()) {
      loadProductsFromLocalStorage()
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) throw supabaseError

      setProducts(data || [])
    } catch (err) {
      console.error('Error loading products from Supabase:', err)
      setError(err.message)
      loadProductsFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  const loadProductsFromLocalStorage = () => {
    try {
      const productos = JSON.parse(localStorage.getItem('productosBase') || '[]')
      setProducts(productos)
      setError(null)
    } catch (err) {
      console.error('Error loading products from localStorage:', err)
      setError('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  const addProduct = async (productData) => {
    if (!isSupabaseConfigured()) {
      // Fallback localStorage
      const productos = JSON.parse(localStorage.getItem('productosBase') || '[]')
      const newProduct = {
        ...productData,
        id: Date.now(),
        created_at: new Date().toISOString()
      }
      productos.push(newProduct)
      localStorage.setItem('productosBase', JSON.stringify(productos))
      setProducts(productos)
      return newProduct
    }

    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([productData])
        .select()
        .single()

      if (error) throw error

      setProducts(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error adding product:', err)
      throw err
    }
  }

  const updateProduct = async (id, updates) => {
    if (!isSupabaseConfigured()) {
      // Fallback localStorage
      const productos = JSON.parse(localStorage.getItem('productosBase') || '[]')
      const index = productos.findIndex(p => p.id === id)
      if (index !== -1) {
        productos[index] = { ...productos[index], ...updates }
        localStorage.setItem('productosBase', JSON.stringify(productos))
        setProducts(productos)
        return productos[index]
      }
      throw new Error('Product not found')
    }

    try {
      const { data, error } = await supabase
        .from('productos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setProducts(prev => prev.map(p => p.id === id ? data : p))
      return data
    } catch (err) {
      console.error('Error updating product:', err)
      throw err
    }
  }

  const deleteProduct = async (id) => {
    if (!isSupabaseConfigured()) {
      // Fallback localStorage
      const productos = JSON.parse(localStorage.getItem('productosBase') || '[]')
      const filtered = productos.filter(p => p.id !== id)
      localStorage.setItem('productosBase', JSON.stringify(filtered))
      setProducts(filtered)
      return
    }

    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting product:', err)
      throw err
    }
  }

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts: loadProducts
  }
}

// Hook para pedidos de catálogo admin
export function useAdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    if (!isSupabaseConfigured()) {
      loadOrdersFromLocalStorage()
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('pedidos_catalogo')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (supabaseError) throw supabaseError

      setOrders(data || [])
    } catch (err) {
      console.error('Error loading orders from Supabase:', err)
      setError(err.message)
      loadOrdersFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  const loadOrdersFromLocalStorage = () => {
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      setOrders(pedidos)
      setError(null)
    } catch (err) {
      console.error('Error loading orders from localStorage:', err)
      setError('Error loading orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (id, updates) => {
    if (!isSupabaseConfigured()) {
      // Fallback localStorage
      const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      const index = pedidos.findIndex(p => p.id === id)
      if (index !== -1) {
        pedidos[index] = { ...pedidos[index], ...updates }
        localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidos))
        setOrders(pedidos)
        return pedidos[index]
      }
      throw new Error('Order not found')
    }

    try {
      const { data, error } = await supabase
        .from('pedidos_catalogo')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setOrders(prev => prev.map(o => o.id === id ? data : o))
      return data
    } catch (err) {
      console.error('Error updating order:', err)
      throw err
    }
  }

  // Función para generar signed URL de comprobante
  const getComprobanteSignedUrl = async (comprobantePath) => {
    if (!comprobantePath) return null

    try {
      const response = await fetch('/api/supabase/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'comprobantes',
          path: comprobantePath,
          expiresIn: 3600 // 1 hora
        })
      })

      if (!response.ok) throw new Error('Failed to get signed URL')
      
      const { signedUrl } = await response.json()
      return signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return null
    }
  }

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    getComprobanteSignedUrl,
    refreshOrders: loadOrders
  }
}