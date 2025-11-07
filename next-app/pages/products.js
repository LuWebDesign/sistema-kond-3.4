import Layout from '../components/Layout'
import withAdminAuth from '../components/withAdminAuth'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, timeToMinutes, minutesToTime, compressImage } from '../utils/catalogUtils'
import { 
  getAllProductos, 
  createProducto, 
  updateProducto, 
  deleteProducto, 
  toggleProductoPublicado,
  uploadProductoImagen 
} from '../utils/supabaseProducts'

function Products() {
  // Estados principales
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [expandedCards, setExpandedCards] = useState(new Set()) // Estado para tarjetas expandidas
  const [editingCards, setEditingCards] = useState(new Set()) // Estado para tarjetas en modo edición
  const [filters, setFilters] = useState({
    search: '',
    type: 'all'
  })

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    categoriaPersonalizada: '',
  tipo: 'Stock',
    medidas: '',
    tiempoUnitario: '00:00:30',
    unidades: 1,
    unidadesPorPlaca: 1,
    usoPlacas: 0,
    costoPlaca: 0,
    costoMaterial: 0,
    materialId: '',
    margenMaterial: 0,
    precioUnitario: 0,
    // Nuevo campo: precio que refleja el valor afectado por promociones/cupones
    precioPromos: 0,
    ensamble: 'Sin ensamble',
    imagen: ''
  })

  // Estados para manejo de imagen en el formulario de agregar
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  // Manejar cambio de imagen en el formulario de agregar
  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setImageFile(null)
      setImagePreview('')
    }
  }

  const fileToBase64 = async (file, maxWidth = 900, quality = 0.75) => {
    try {
      // Intentar comprimir la imagen antes de convertir a base64
      const blob = await compressImage(file, maxWidth, quality)
      const toRead = (blob && blob.size) ? blob : file
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(toRead)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    } catch (e) {
      // Fallback: leer el archivo original
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    }
  }

  // Estados para edición de materiales
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [materialForm, setMaterialForm] = useState({
    nombre: '',
    tipo: '',
    espesor: '',
    costoUnitario: ''
  })

  // Lista de materiales para el desplegable de costo de material
  const [materials, setMaterials] = useState([])

  // Estados para campos calculados
  const [calculatedFields, setCalculatedFields] = useState({
    tiempoTotal: '00:00:00',
    precioPorMinuto: 0,
    isUsoPlacasManual: false,
    isCostoMaterialManual: false,
    isPrecioUnitarioManual: false
  })

  // Métricas calculadas
  const [metrics, setMetrics] = useState({
    total: 0,
    totalValue: 0,
    totalTime: 0,
    averagePrice: 0,
    typeDistribution: { Venta: 0, Presupuesto: 0, Stock: 0 }
  })

  const pageSize = 10
  const categories = ['Decoración', 'Herramientas', 'Regalos', 'Llaveros', 'Arte', 'Personalizada']

  // Función para actualizar campos calculados
  const updateCalculatedFields = useCallback(() => {
    const { unidades, unidadesPorPlaca, costoPlaca, margenMaterial, tiempoUnitario, costoMaterial, precioUnitario } = formData
    const { isUsoPlacasManual, isCostoMaterialManual, isPrecioUnitarioManual } = calculatedFields

    let newFields = { ...calculatedFields }

    // Calcular uso de placas automáticamente si no es manual
    if (!isUsoPlacasManual) {
      const usoPlacas = unidadesPorPlaca > 0 ? Math.ceil(unidades / unidadesPorPlaca) : 0
      setFormData(prev => {
        if (Number(prev.usoPlacas) === Number(usoPlacas)) return prev
        return { ...prev, usoPlacas }
      })
    }

    // Calcular costo de material automáticamente si no es manual
    if (!isCostoMaterialManual) {
      const costoMaterialCalc = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
      const costoMaterialRounded = parseFloat(costoMaterialCalc.toFixed(2))
      setFormData(prev => {
        if (Number(prev.costoMaterial) === Number(costoMaterialRounded)) return prev
        return { ...prev, costoMaterial: costoMaterialRounded }
      })
    }

    // Calcular precio/margen según modo seleccionado
    if (!isPrecioUnitarioManual) {
      // Modo auto: derivar precio desde margen y costo material
      const precioUnitarioCalc = costoMaterial * (1 + margenMaterial / 100)
      const precioRounded = parseFloat(precioUnitarioCalc.toFixed(2))
      setFormData(prev => {
        if (Number(prev.precioUnitario) === Number(precioRounded)) return prev
        return { ...prev, precioUnitario: precioRounded }
      })
    } else {
      // Modo manual de precio: derivar margen desde precio y costo material
      const margenDesdePrecio = costoMaterial > 0 ? ((precioUnitario / costoMaterial) - 1) * 100 : 0
      const margenRedondeado = parseFloat(margenDesdePrecio.toFixed(1))
      setFormData(prev => {
        if (Number(prev.margenMaterial) === Number(margenRedondeado)) return prev
        return { ...prev, margenMaterial: margenRedondeado }
      })
    }

    // Calcular tiempo total
    const tiempoMinutos = timeToMinutes(tiempoUnitario || '00:00:30')
    const tiempoTotalMinutos = tiempoMinutos * unidades
    newFields.tiempoTotal = minutesToTime(tiempoTotalMinutos)

  // Calcular precio por minuto (siempre coherente con el precio actual)
  newFields.precioPorMinuto = tiempoMinutos > 0 ? precioUnitario / tiempoMinutos : 0

    setCalculatedFields(newFields)
  }, [formData, calculatedFields])

  // Efecto para actualizar costos cuando cambian los materiales
  useEffect(() => {
    if (formData.materialId && materials.length > 0) {
      const selectedMaterial = materials.find(m => String(m.id) === String(formData.materialId))
      if (selectedMaterial) {
        setFormData(prev => ({
          ...prev,
          costoMaterial: Number(selectedMaterial.costoUnitario || 0),
          costoPlaca: Number(selectedMaterial.costoUnitario || 0)
        }))
      }
    }
  }, [materials, formData.materialId])

  // Función para toggle de campos manuales/automáticos
  const toggleFieldMode = (fieldName) => {
    setCalculatedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  // Cargar datos desde Supabase
  const loadProducts = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    try {
      const { data: productList, error } = await getAllProductos()
      
      if (error) {
        console.error('Error loading products from Supabase:', error)
        setProducts([])
        return
      }
      
      // Mapear campos de snake_case a camelCase y inicializar valores
      const initializedProducts = (productList || []).map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        tipo: p.tipo,
        medidas: p.medidas,
        tiempoUnitario: p.tiempo_unitario || '00:00:30',
        active: p.active !== undefined ? p.active : true,
        publicado: p.publicado !== undefined ? p.publicado : false,
        hiddenInProductos: p.hidden_in_productos || false,
        unidadesPorPlaca: p.unidades_por_placa || 1,
        usoPlacas: p.uso_placas || 0,
        costoPlaca: p.costo_placa || 0,
        costoMaterial: p.costo_material || 0,
        materialId: p.material_id || '',
        material: p.material || '',
        margenMaterial: p.margen_material || 0,
        precioUnitario: p.precio_unitario || 0,
        precioPromos: p.precio_promos || 0,
        unidades: p.unidades || 1,
        ensamble: p.ensamble || 'Sin ensamble',
        imagen: p.imagen_url || '',
        fechaCreacion: p.created_at || new Date().toISOString()
      }))

      setProducts(initializedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    }
  }, [])

  // Función para verificar conexión con base de datos de materiales
  const checkMaterialsConnection = () => {
    try {
      const raw = localStorage.getItem('materiales')
      const list = raw ? JSON.parse(raw) : []
      console.log('Conexión con base de datos materiales:', list.length > 0 ? 'OK' : 'Sin materiales', 'Total materiales:', list.length)
      return list.length > 0
    } catch (e) {
      console.error('Error conectando con base de datos materiales:', e)
      return false
    }
  }

  // Funciones para editar materiales
  const startEditingMaterial = (materialId) => {
    const material = materials.find(m => String(m.id) === String(materialId))
    if (material) {
      setEditingMaterial(materialId)
      setMaterialForm({
        nombre: material.nombre || '',
        tipo: material.tipo || '',
        espesor: material.espesor || '',
        costoUnitario: material.costoUnitario || ''
      })
    }
  }

  const cancelEditingMaterial = () => {
    setEditingMaterial(null)
    setMaterialForm({
      nombre: '',
      tipo: '',
      espesor: '',
      costoUnitario: ''
    })
  }

  const saveMaterialChanges = () => {
    try {
      const updatedMaterials = materials.map(m => 
        String(m.id) === String(editingMaterial) 
          ? { ...m, ...materialForm }
          : m
      )
      
      // Guardar en localStorage
      localStorage.setItem('materiales', JSON.stringify(updatedMaterials))
      setMaterials(updatedMaterials)
      
      // Actualizar el formData del producto si el material editado está seleccionado
      if (formData.materialId === editingMaterial) {
        const updatedMaterial = updatedMaterials.find(m => String(m.id) === String(editingMaterial))
        if (updatedMaterial) {
          setFormData(prev => ({ 
            ...prev, 
            costoMaterial: Number(updatedMaterial.costoUnitario || 0), 
            costoPlaca: Number(updatedMaterial.costoUnitario || 0) 
          }))
        }
      }
      
      cancelEditingMaterial()
      
      // Mostrar notificación de éxito
      alert('Material actualizado correctamente')
    } catch (error) {
      console.error('Error al guardar material:', error)
      alert('Error al guardar el material')
    }
  }

  // Cargar materiales desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('materiales')
      const list = raw ? JSON.parse(raw) : []
      setMaterials(list)
      checkMaterialsConnection()
    } catch (e) { 
      console.error('Error cargando materiales:', e) 
    }
  }, [])

  // Guardar productos ya no necesita hacer nada (Supabase guarda automáticamente)
  // Mantenemos la función por compatibilidad pero vacía
  const saveProducts = useCallback((productList) => {
    // No-op: Supabase guarda automáticamente en cada operación
    console.log('saveProducts called (no-op with Supabase)')
  }, [])

  // Aplicar filtros
  const applyFilters = useCallback(() => {
    let filtered = [...products]

    // Filtro de búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.nombre?.toLowerCase().includes(searchTerm) ||
        p.categoria?.toLowerCase().includes(searchTerm) ||
        p.medidas?.toLowerCase().includes(searchTerm)
      )
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.tipo === filters.type)
    }

    // Solo productos activos
    filtered = filtered.filter(p => p.active !== false)

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [products, filters])

  // Calcular métricas
  const calculateMetrics = useCallback(() => {
    const activeProducts = filteredProducts.filter(p => p.active !== false)
    
  const total = activeProducts.length
  const totalValue = activeProducts.reduce((sum, p) => sum + (Number(p.precioUnitario) || 0) * (Number(p.unidades) || 0), 0)
    
    // Calcular tiempo total
    const totalMinutes = activeProducts.reduce((sum, p) => {
      const timeStr = p.tiempoUnitario || '00:00:30'
      const [hours, minutes, seconds] = timeStr.split(':').map(Number)
      const totalMin = (hours * 60) + minutes + (seconds / 60)
      return sum + totalMin * (p.unidades || 0)
    }, 0)

  // Prefer weighted average by unidades (precio promedio por unidad)
  const totalUnits = activeProducts.reduce((sum, p) => sum + (Number(p.unidades) || 0), 0)
  const averagePrice = totalUnits > 0 ? totalValue / totalUnits : (total > 0 ? activeProducts.reduce((sum, p) => sum + (Number(p.precioUnitario) || 0), 0) / total : 0)

    // Distribución por tipo
    const typeDistribution = { Venta: 0, Presupuesto: 0, Stock: 0 }
    activeProducts.forEach(p => {
      if (typeDistribution.hasOwnProperty(p.tipo)) {
        typeDistribution[p.tipo]++
      }
    })

    setMetrics({
      total,
      totalValue,
      totalTime: totalMinutes,
      averagePrice,
      typeDistribution
    })
  }, [filteredProducts])

  // Efectos
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    applyFilters()
  }, [products, filters, applyFilters])

  useEffect(() => {
    calculateMetrics()
  }, [filteredProducts, calculateMetrics])

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target

    // Campos que deben ser tratados como números
  const numericFields = new Set(['unidades', 'unidadesPorPlaca', 'usoPlacas', 'costoPlaca', 'costoMaterial', 'margenMaterial', 'precioUnitario', 'precioPromos'])

    let newValue = value
    if (numericFields.has(name)) {
      // permitir campo vacío (user clearing input) manteniendo string vacío
      if (value === '') {
        newValue = ''
      } else {
        // parsear como float; si es entero lógico, seguir siendo entero por validación del input
        const parsed = parseFloat(value)
        newValue = Number.isNaN(parsed) ? 0 : parsed
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))
  }

  // Ejecutar la actualización de campos calculados cuando cambien inputs relevantes
  useEffect(() => {
    // Llamamos a la función que actualiza campos calculados
    try {
      updateCalculatedFields()
    } catch (e) {
      console.error('Error al actualizar campos calculados:', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tiempoUnitario, formData.unidades, formData.unidadesPorPlaca, formData.costoPlaca, formData.costoMaterial, formData.margenMaterial, formData.precioUnitario, calculatedFields.isUsoPlacasManual, calculatedFields.isCostoMaterialManual, calculatedFields.isPrecioUnitarioManual])

  // Manejar Enter para pasar al siguiente campo
  const handleKeyDown = (e, nextFieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextFieldName) {
        const nextField = document.querySelector(`[name="${nextFieldName}"]`)
        if (nextField) {
          nextField.focus()
          if (nextField.select) nextField.select()
        }
      } else {
        // Si no hay siguiente campo, guardar el producto
        if (formData.nombre && formData.medidas) {
          handleAddProduct()
        }
      }
    }
  }

  // Agregar nuevo producto
  const handleAddProduct = async () => {
    try {
      // Determinar la categoría final (personalizada o seleccionada)
      const categoriaFinal = formData.categoriaPersonalizada?.trim() || formData.categoria
      
      let finalFormData = { ...formData }
      
      // Si hay materialId, buscar el nombre del material y guardarlo
      if (finalFormData.materialId && materials.length > 0) {
        const selectedMaterial = materials.find(m => String(m.id) === String(finalFormData.materialId))
        if (selectedMaterial) {
          finalFormData.material = selectedMaterial.nombre
        }
      } else {
        finalFormData.material = ''
      }
      
      // Preparar datos del nuevo producto
      const newProductData = {
        nombre: finalFormData.nombre,
        categoria: categoriaFinal,
        tipo: finalFormData.tipo,
        medidas: finalFormData.medidas,
        tiempoUnitario: finalFormData.tiempoUnitario,
        publicado: finalFormData.publicado || false,
        hiddenInProductos: false,
        unidadesPorPlaca: finalFormData.unidadesPorPlaca,
        usoPlacas: finalFormData.usoPlacas,
        costoPlaca: finalFormData.costoPlaca,
        costoMaterial: finalFormData.costoMaterial,
        materialId: finalFormData.materialId,
        margenMaterial: finalFormData.margenMaterial,
        precioUnitario: finalFormData.precioUnitario,
        precioPromos: finalFormData.precioPromos,
        unidades: finalFormData.unidades,
        ensamble: finalFormData.ensamble,
        imagen: '' // URL de imagen se asignará después si hay archivo
      }

      // Crear producto en Supabase
      const { data: createdProduct, error } = await createProducto(newProductData)
      
      if (error) {
        console.error('Error creating product:', error)
        alert('Error al crear el producto: ' + error)
        return
      }

      // Si hay imagen, subirla a Storage y actualizar el producto
      if (imageFile && createdProduct) {
        try {
          const { data: uploadData, error: uploadError } = await uploadProductoImagen(imageFile, createdProduct.id)
          
          if (!uploadError && uploadData) {
            // Actualizar producto con la URL de la imagen
            await updateProducto(createdProduct.id, { imagen: uploadData.url })
          }
        } catch (uploadErr) {
          console.warn('No se pudo subir la imagen:', uploadErr)
        }
      }

      // Recargar productos desde Supabase
      await loadProducts()
      
      // Resetear formulario
        setFormData({
        nombre: '',
        categoria: '',
        categoriaPersonalizada: '',
          tipo: 'Stock',
        medidas: '',
        tiempoUnitario: '00:00:30',
        unidades: 1,
        unidadesPorPlaca: 1,
        usoPlacas: 0,
        costoPlaca: 0,
        costoMaterial: 0,
        materialId: '',
        margenMaterial: 0,
        precioUnitario: 0,
        precioPromos: 0,
        ensamble: 'Sin ensamble',
        imagen: '',
        publicado: false
      })
      setImageFile(null)
      setImagePreview('')
      setShowAddForm(false)

      // Mostrar notificación
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.textContent = '✅ Producto agregado exitosamente'
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          background: #10b981; color: white; padding: 12px 20px;
          border-radius: 8px; font-weight: 600;
        `
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Error al agregar el producto')
    }
  }

  // Eliminar producto
  const handleDeleteProduct = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const { error } = await deleteProducto(id)
      
      if (error) {
        console.error('Error deleting product:', error)
        alert('Error al eliminar el producto')
        return
      }

      // Recargar productos
      await loadProducts()
    }
  }

  // Cambiar visibilidad del producto
  const toggleProductVisibility = async (id) => {
    const product = products.find(p => p.id === id)
    if (!product) return

    const { error } = await updateProducto(id, { active: !product.active })
    
    if (error) {
      console.error('Error toggling visibility:', error)
      return
    }

    // Recargar productos
    await loadProducts()
  }

  // Alternar publicación en catálogo
  const toggleProductPublication = async (id) => {
    const product = products.find(p => p.id === id)
    if (!product) return

    const { error } = await toggleProductoPublicado(id, !product.publicado)
    
    if (error) {
      console.error('Error toggling publication:', error)
      return
    }

    // Recargar productos
    await loadProducts()
  }

  // Alternar expansión de tarjeta
  const toggleCardExpansion = (id) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Alternar modo de edición de tarjeta
  const toggleCardEditing = (id) => {
    setEditingCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
        // Expandir automáticamente cuando se entra en modo edición
        setExpandedCards(prevExp => {
          const newExpSet = new Set(prevExp)
          newExpSet.add(id)
          return newExpSet
        })
      }
      return newSet
    })
  }

  // Guardar cambios de producto editado
  const saveProductChanges = async (id, newData) => {
    try {
      // Actualizar en Supabase
      const { error } = await updateProducto(id, newData)
      
      if (error) {
        console.error('Error al guardar producto:', error)
        alert('Error al guardar el producto')
        return
      }

      // Recargar productos desde Supabase
      await loadProducts()
      
      // Salir del modo edición
      setEditingCards(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })

      // Mostrar notificación de éxito
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.textContent = '✅ Producto actualizado'
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          background: #10b981; color: white; padding: 12px 20px;
          border-radius: 8px; font-weight: 600;
        `
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      }
    } catch (error) {
      console.error('Error al guardar producto:', error)
      if (typeof window !== 'undefined') {
        alert('Error al guardar el producto')
      }
    }
  }

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  // Formatear tiempo
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.floor((minutes % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Layout title="Productos - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '8px'
          }}>
            🏷️ Gestión de Productos
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Administra tu catálogo de productos, precios y configuraciones
          </p>
        </div>

        {/* Métricas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <MetricCard
            title="Total Productos"
            value={metrics.total}
            icon="📦"
            color="#3b82f6"
          />
          <MetricCard
            title="Valor Total"
            value={formatCurrency(metrics.totalValue)}
            icon="💰"
            color="#f59e0b"
            isAmount
          />
          <MetricCard
            title="Tiempo Total"
            value={formatTime(metrics.totalTime)}
            icon="⏱️"
            color="#8b5cf6"
          />
          <MetricCard
            title="Precio Promedio"
            value={formatCurrency(metrics.averagePrice)}
            icon="📊"
            color="#10b981"
            isAmount
          />
        </div>

        {/* Controles */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: showAddForm ? 'var(--text-secondary)' : 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              {showAddForm ? '∧ Ocultar Formulario' : '+ Agregar Producto'}
            </button>

            <Link href="/materiales" style={{
              marginLeft: '8px',
              background: '#e5e7eb',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block'
            }}>Ir a Materiales</Link>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos los tipos</option>
                <option value="Venta">Venta</option>
                <option value="Presupuesto">Presupuesto</option>
                <option value="Stock">Stock</option>
              </select>
            </div>
          </div>

          {/* Formulario Agregar Producto */}
          {showAddForm && (
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '16px'
            }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                Agregar Nuevo Producto
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                {/* Nombre */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'categoria')}
                    placeholder="Ej: Llavero Corazón"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Categoría
                  </label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={(e) => {
                      handleInputChange(e)
                      // Si selecciona "nueva", mostrar campo personalizado
                      if (e.target.value === '__nueva__') {
                        setFormData(prev => ({ ...prev, categoria: '', categoriaPersonalizada: '' }))
                        setTimeout(() => {
                          const input = document.querySelector('[name="categoriaPersonalizada"]')
                          if (input) input.focus()
                        }, 100)
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, formData.categoria === '' && formData.categoriaPersonalizada === '' ? 'categoriaPersonalizada' : 'tipo')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__nueva__">✏️ Crear nueva categoría...</option>
                  </select>
                  
                  {/* Campo para categoría personalizada */}
                  {(formData.categoria === '' && formData.categoriaPersonalizada !== undefined) && (
                    <input
                      type="text"
                      name="categoriaPersonalizada"
                      value={formData.categoriaPersonalizada}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'tipo')}
                      placeholder="Ingrese nueva categoría"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        marginTop: '8px'
                      }}
                    />
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Tipo *
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'medidas')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Venta">Venta</option>
                    <option value="Presupuesto">Presupuesto</option>
                    <option value="Stock">Stock</option>
                  </select>
                </div>

                {/* Medidas */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Medidas *
                  </label>
                  <input
                    type="text"
                    name="medidas"
                    value={formData.medidas}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'tiempoUnitario')}
                    placeholder="Ej: 5x3 cm"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Tiempo Unitario */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Tiempo Unitario (HH:MM:SS) *
                  </label>
                  <input
                    type="text"
                    name="tiempoUnitario"
                    value={formData.tiempoUnitario}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'unidades')}
                    placeholder="00:13:00"
                    pattern="^[0-9]{2}:[0-9]{2}:[0-9]{2}$"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Unidades */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Unidades a producir *
                  </label>
                  <input
                    type="number"
                    name="unidades"
                    value={formData.unidades}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'unidadesPorPlaca')}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Unidades por Placa */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Unidades por Placa
                  </label>
                  <input
                    type="number"
                    name="unidadesPorPlaca"
                    value={formData.unidadesPorPlaca}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'usoPlacas')}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Uso de Placas */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Uso de Placas
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      name="usoPlacas"
                      value={formData.usoPlacas}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'ensamble')}
                      readOnly={!calculatedFields.isUsoPlacasManual}
                      min="0"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: calculatedFields.isUsoPlacasManual ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        cursor: calculatedFields.isUsoPlacasManual ? 'text' : 'not-allowed'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleFieldMode('isUsoPlacasManual')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {calculatedFields.isUsoPlacasManual ? 'Auto' : 'Manual'}
                    </button>
                  </div>
                </div>

                {/* Ensamble */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Ensamble
                  </label>
                  <select
                    name="ensamble"
                    value={formData.ensamble}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'costoPlaca')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Sin ensamble">Sin ensamble</option>
                    <option value="Manual">Manual</option>
                    <option value="Automático">Automático</option>
                  </select>
                </div>

                {/* Costo Placa */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Costo Placa ($)
                  </label>
                  <input
                    type="number"
                    name="costoPlaca"
                    value={formData.costoPlaca}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'costoMaterial')}
                    min="0"
                    step="0.01"
                    readOnly
                    title="Este valor se extrae del material seleccionado"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Material (selección desde Materiales) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Material
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      name="materialId"
                      value={formData.materialId || ''}
                      onChange={(e) => {
                        const id = e.target.value
                        const sel = materials.find(x => String(x.id) === String(id))
                        if (sel) {
                          setFormData(prev => ({ ...prev, materialId: id, costoMaterial: Number(sel.costoUnitario || 0), costoPlaca: Number(sel.costoUnitario || 0) }))
                        } else {
                          setFormData(prev => ({ ...prev, materialId: '', costoMaterial: 0, costoPlaca: 0 }))
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, 'margenMaterial')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">-- Seleccionar material --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}{m.tipo ? ` — ${m.tipo}` : ''}{m.espesor ? ` — ${m.espesor}` : ''}
                        </option>
                      ))}
                    </select>
                    
                    {formData.materialId && (
                      <button
                        type="button"
                        onClick={() => startEditingMaterial(formData.materialId)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--accent-blue)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        ✏️ Editar
                      </button>
                    )}
                  </div>
                  
                  {/* Formulario de edición de material */}
                  {editingMaterial && (
                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
                        Editar Material
                      </h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={materialForm.nombre}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, nombre: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Tipo
                          </label>
                          <input
                            type="text"
                            value={materialForm.tipo}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, tipo: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Espesor
                          </label>
                          <input
                            type="text"
                            value={materialForm.espesor}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, espesor: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Costo Unitario
                          </label>
                          <input
                            type="number"
                            value={materialForm.costoUnitario}
                            onChange={(e) => setMaterialForm(prev => ({ ...prev, costoUnitario: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={cancelEditingMaterial}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveMaterialChanges}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            background: 'var(--accent-blue)',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Margen Material */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Margen Material (%)
                  </label>
                  <input
                    type="number"
                    name="margenMaterial"
                    value={formData.margenMaterial}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'precioUnitario')}
                    min="0"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Precio Unitario */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Precio Unitario *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: '#2563eb',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}>
                      {formatCurrency(formData.precioUnitario)}
                    </div>

                    {calculatedFields.isPrecioUnitarioManual && (
                      <input
                        type="number"
                        name="precioUnitario"
                        value={formData.precioUnitario}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, null)}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: '#2563eb',
                          fontSize: '1.05rem',
                          fontWeight: 700
                        }}
                      />
                    )}

                    {/* Precio Promos (opcional) */}
                    <div style={{ width: '100%', marginTop: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Precio Promos (opcional)</label>
                      <input
                        type="number"
                        name="precioPromos"
                        value={formData.precioPromos}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="Dejar vacío para usar precio unitario o precio promocional"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleFieldMode('isPrecioUnitarioManual')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {calculatedFields.isPrecioUnitarioManual ? 'Auto' : 'Manual'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Campos calculados */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Tiempo Total
                  </label>
                  <input
                    type="text"
                    value={calculatedFields.tiempoTotal}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Precio por Minuto
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(calculatedFields.precioPorMinuto)}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              {/* Imagen del producto */}
              <div style={{
                marginTop: '12px'
              }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Imagen (opcional)
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{
                      flex: 1
                    }}
                  />
                  {imagePreview && (
                    <div style={{ width: 72, height: 48, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Opciones adicionales */}
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '20px'
              }}>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '0.95rem', 
                  color: 'var(--text-secondary)',
                  fontWeight: 600 
                }}>
                  Opciones de Visibilidad
                </h4>
                
                <div style={{ padding: '8px', border: '1px solid #e6e6e6', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', maxWidth: '520px' }}>
                  <div>
                    <div className="vis-title">Publicar en catálogo público</div>
                    <div style={{ fontSize:'0.82rem', color:'#6b7280' }}>Visible para clientes en el catálogo público</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.publicado || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, publicado: e.target.checked }))}
                    aria-label="Publicar en catálogo público"
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>
                <style jsx>{`
                  .vis-title { font-weight:700; font-size:0.95rem; color: var(--text-primary); }
                  @media (prefers-color-scheme: dark) {
                    .vis-title { color: #374151; }
                  }
                `}</style>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleAddProduct}
                  disabled={!formData.nombre || !formData.medidas}
                  style={{
                    background: (formData.nombre && formData.medidas) ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: (formData.nombre && formData.medidas) ? 'pointer' : 'not-allowed',
                    fontWeight: '600'
                  }}
                >
                  ✅ Agregar Producto
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    // Limpiar formulario
                    setFormData({
                      nombre: '',
                      categoria: '',
                      categoriaPersonalizada: '',
                      tipo: 'Stock',
                      medidas: '',
                      tiempoUnitario: '00:00:30',
                      unidades: 1,
                      unidadesPorPlaca: 1,
                      usoPlacas: 0,
                      costoPlaca: 0,
                      costoMaterial: 0,
                      materialId: '',
                      margenMaterial: 0,
                      precioUnitario: 0,
                      precioPromos: 0,
                      ensamble: 'Sin ensamble',
                      imagen: '',
                      publicado: false
                    })
                    setCalculatedFields({
                      tiempoTotal: '00:00:00',
                      precioPorMinuto: 0,
                      isUsoPlacasManual: false,
                      isCostoMaterialManual: false,
                      isPrecioUnitarioManual: false
                    })
                  }}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Productos */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
            Productos ({filteredProducts.length})
          </h2>

          {currentProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  materials={materials}
                  categories={categories}
                  isExpanded={expandedCards.has(product.id)}
                  isEditing={editingCards.has(product.id)}
                  onDelete={handleDeleteProduct}
                  onToggleVisibility={toggleProductVisibility}
                  onTogglePublication={toggleProductPublication}
                  onToggleExpansion={toggleCardExpansion}
                  onToggleEditing={toggleCardEditing}
                  onSaveChanges={saveProductChanges}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '40px'
            }}>
              {filters.search || filters.type !== 'all' 
                ? 'No se encontraron productos con los filtros aplicados'
                : 'No hay productos. ¡Agrega tu primer producto!'
              }
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                  color: currentPage === 1 ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Anterior
              </button>
              
              <span style={{ color: 'var(--text-secondary)' }}>
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                  color: currentPage === totalPages ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

// Componente de tarjeta de métrica
function MetricCard({ title, value, icon, color, isAmount = false }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        fontSize: '1.5rem',
        background: `${color}20`,
        color: color,
        padding: '8px',
        borderRadius: '6px'
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px',
          fontWeight: 500
        }}>
          {title}
        </h4>
        <p style={{
          fontSize: isAmount ? '1.1rem' : '1.3rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0
        }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// Componente de tarjeta de producto
function ProductCard({ 
  product, 
  materials = [],
  categories = [],
  isExpanded, 
  isEditing, 
  onDelete, 
  onToggleVisibility, 
  onTogglePublication, 
  onToggleExpansion,
  onToggleEditing,
  onSaveChanges 
}) {
  const [editData, setEditData] = useState({
    nombre: product.nombre || '',
    categoria: product.categoria || '',
    medidas: product.medidas || '',
  tipo: product.tipo || 'Stock',
    tiempoUnitario: product.tiempoUnitario || '00:00:30',
    unidades: product.unidades || 1,
    unidadesPorPlaca: product.unidadesPorPlaca || 1,
    usoPlacas: product.usoPlacas || 0,
    costoPlaca: product.costoPlaca || 0,
    costoMaterial: product.costoMaterial || 0,
    materialId: product.materialId || '',
    margenMaterial: product.margenMaterial || 0,
    precioUnitario: product.precioUnitario || 0,
    ensamble: product.ensamble || 'Sin ensamble',
    imagen: product.imagen || ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(product.imagen || '')

  // Estados para controlar modos manuales en edición
  const [editCalculatedFields, setEditCalculatedFields] = useState({
    isCostoMaterialManual: false,
    isPrecioUnitarioManual: false
  })

  // Actualizar costo material cuando cambia el material
  useEffect(() => {
    if (editData.materialId && materials.length > 0 && !editCalculatedFields.isCostoMaterialManual) {
      const selectedMaterial = materials.find(m => String(m.id) === String(editData.materialId))
      if (selectedMaterial) {
        setEditData(prev => ({
          ...prev,
          costoMaterial: Number(selectedMaterial.costoUnitario || 0),
          costoPlaca: Number(selectedMaterial.costoUnitario || 0)
        }))
      }
    }
  }, [editData.materialId, materials, editCalculatedFields.isCostoMaterialManual])

  // Recalcular precio unitario cuando cambian costoMaterial o margenMaterial
  useEffect(() => {
    if (!editCalculatedFields.isPrecioUnitarioManual && editData.costoMaterial !== undefined && editData.margenMaterial !== undefined) {
      const precioUnitarioCalc = editData.costoMaterial * (1 + editData.margenMaterial / 100)
      setEditData(prev => ({
        ...prev,
        precioUnitario: parseFloat(precioUnitarioCalc.toFixed(2))
      }))
    }
  }, [editData.costoMaterial, editData.margenMaterial, editCalculatedFields.isPrecioUnitarioManual])

  // Recalcular margen cuando cambia precioUnitario en modo manual
  useEffect(() => {
    if (editCalculatedFields.isPrecioUnitarioManual && editData.costoMaterial > 0 && editData.precioUnitario !== undefined) {
      const margenDesdePrecio = ((editData.precioUnitario / editData.costoMaterial) - 1) * 100
      const margenRedondeado = parseFloat(margenDesdePrecio.toFixed(1))
      setEditData(prev => ({
        ...prev,
        margenMaterial: margenRedondeado
      }))
    }
  }, [editData.precioUnitario, editData.costoMaterial, editCalculatedFields.isPrecioUnitarioManual])

  // Actualizar datos de edición cuando cambia el producto
  useEffect(() => {
    if (!isEditing) {
      setEditData({
        nombre: product.nombre || '',
        categoria: product.categoria || '',
        medidas: product.medidas || '',
  tipo: product.tipo || 'Stock',
        tiempoUnitario: product.tiempoUnitario || '00:00:30',
        unidades: product.unidades || 1,
        unidadesPorPlaca: product.unidadesPorPlaca || 1,
        usoPlacas: product.usoPlacas || 0,
        costoPlaca: product.costoPlaca || 0,
        costoMaterial: product.costoMaterial || 0,
        materialId: product.materialId || '',
        margenMaterial: product.margenMaterial || 0,
        precioUnitario: product.precioUnitario || 0,
        ensamble: product.ensamble || 'Sin ensamble',
        imagen: product.imagen || ''
      })
      setImagePreview(product.imagen || '')
      setImageFile(null)
      // Resetear modos manuales
      setEditCalculatedFields({
        isCostoMaterialManual: false,
        isPrecioUnitarioManual: false
      })
    }
  }, [product, isEditing])

  const getTypeColor = (type) => {
    switch (type) {
      case 'Venta': return '#10b981'
      case 'Presupuesto': return '#f59e0b'  
      case 'Stock': return '#3b82f6'
      default: return 'var(--text-secondary)'
    }
  }

  // Función para toggle de campos manuales en edición
  const toggleEditFieldMode = (fieldName) => {
    setEditCalculatedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  // Manejar cambio de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Convertir archivo a base64 (intenta comprimir/resamplear antes)
  const fileToBase64 = async (file, maxWidth = 900, quality = 0.75) => {
    try {
      const blob = await compressImage(file, maxWidth, quality)
      const toRead = (blob && blob.size) ? blob : file
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(toRead)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    } catch (e) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    }
  }

  // Guardar cambios
  const handleSave = async () => {
    try {
      let finalData = { ...editData }
      
      // Si hay materialId, buscar el nombre del material y guardarlo
      if (finalData.materialId && materials.length > 0) {
        const selectedMaterial = materials.find(m => String(m.id) === String(finalData.materialId))
        if (selectedMaterial) {
          finalData.material = selectedMaterial.nombre
        }
      } else {
        finalData.material = ''
      }
      
      // Si hay una nueva imagen, convertirla a base64
      if (imageFile) {
        const imageData = await fileToBase64(imageFile)
        finalData.imagen = imageData
      }

      // Validaciones básicas
      if (!finalData.nombre.trim()) {
        alert('El nombre es requerido')
        return
      }
      if (!finalData.categoria.trim()) {
        alert('La categoría es requerida')
        return
      }
      if (finalData.unidades <= 0) {
        alert('Las unidades deben ser mayor a 0')
        return
      }
      if (finalData.precioUnitario <= 0) {
        alert('El precio debe ser mayor a 0')
        return
      }

      await onSaveChanges(product.id, finalData)
    } catch (error) {
      console.error('Error al guardar:', error)
      alert('Error al guardar los cambios')
    }
  }

  // Calcular valores para vista resumida y expandida
  const totalValue = (product.precioUnitario || 0) * (product.unidades || 0)
  const tiempoMinutos = product.tiempoUnitario ? timeToMinutes(product.tiempoUnitario) : 0
  const tiempoTotal = tiempoMinutos * (product.unidades || 0)
  const precioPorMinuto = tiempoMinutos > 0 ? (product.precioUnitario || 0) / tiempoMinutos : 0

  // Obtener datos del material
  const getMaterialData = () => {
    if (product.materialId && materials.length > 0) {
      const material = materials.find(m => String(m.id) === String(product.materialId))
      return material || null
    }
    return null
  }

  const materialData = getMaterialData()

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      opacity: product.active === false ? 0.6 : 1,
      transition: 'all 0.3s ease',
      borderColor: isEditing ? '#3b82f6' : 'var(--border-color)'
    }}>
      {/* Header con información resumida */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: isExpanded ? '16px' : '0'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              {product.nombre}
            </h3>
            <span style={{
              background: getTypeColor(product.tipo) + '20',
              color: getTypeColor(product.tipo),
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 500
            }}>
              {product.tipo}
            </span>
            {product.publicado && (
              <span style={{
                background: '#10b98120',
                color: '#10b981',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 500
              }}>
                Público
              </span>
            )}
            {isEditing && (
              <span style={{
                background: '#3b82f620',
                color: '#3b82f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 500
              }}>
                ✏️ Editando
              </span>
            )}
          </div>
          
          {/* Información resumida cuando está colapsada (versión compacta) */}
          {!isExpanded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              marginTop: '8px',
              flexWrap: 'wrap'
            }}>
              {/* Material, Tipo y Espesor */}
              <span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {materialData ? materialData.nombre : 'Sin material'}
                </strong> • {materialData ? (materialData.tipo || 'Sin tipo') : 'Sin tipo'} 
                {materialData && materialData.espesor && ` • ${materialData.espesor}`}
              </span>
              <span>•</span>
              {/* Precio por unidad */}
              <span>
                <strong style={{ color: 'var(--accent-blue)' }}>{formatCurrency(product.precioUnitario || 0)}</strong>/ud
              </span>
              <span>•</span>
              {/* Total */}
              <span>
                Total: <strong style={{ color: '#10b981' }}>{formatCurrency(totalValue)}</strong>
              </span>
              {precioPorMinuto > 0 && (
                <>
                  <span>•</span>
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(precioPorMinuto)}</strong>/min
                  </span>
                </>
              )}
            </div>
          )}
          
          {isExpanded && !isEditing && (
            <p style={{
              margin: '0 0 8px 0',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              ID: {product.id} • {product.categoria} • {product.medidas} • Creado: {product.fechaCreacion ? new Date(product.fechaCreacion).toLocaleDateString() : '—'}
              {product.publicado ? ' • Público' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}
                title="Guardar cambios"
              >
                💾 Guardar
              </button>
              <button
                onClick={() => onToggleEditing(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #6b7280',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '0.8rem'
                }}
                title="Cancelar edición"
              >
                ✕ Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onToggleEditing(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
                title="Editar producto"
              >
                ✏️
              </button>
              
              <button
                onClick={() => onTogglePublication(product.id)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${product.publicado ? '#10b981' : '#6b7280'}`,
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: product.publicado ? '#10b981' : '#6b7280'
                }}
                title={product.publicado ? 'Despublicar del catálogo' : 'Publicar en catálogo'}
              >
                {product.publicado ? '🌐' : '🔒'}
              </button>
              
              <button
                onClick={() => onDelete(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#ef4444'
                }}
                title="Eliminar producto"
              >
                🗑️
              </button>

              <button
                onClick={() => onToggleExpansion(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  minWidth: '28px'
                }}
                title={isExpanded ? 'Colapsar tarjeta' : 'Expandir tarjeta'}
              >
                {isExpanded ? '−' : '+'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contenido detallado cuando está expandida */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px'
        }}>
          {isEditing ? (
            // Modo edición
            <EditForm 
              editData={editData}
              setEditData={setEditData}
              imagePreview={imagePreview}
              onImageChange={handleImageChange}
              onSave={handleSave}
              materials={materials}
              categories={categories}
              currentMaterialId={product.materialId}
              editCalculatedFields={editCalculatedFields}
              toggleEditFieldMode={toggleEditFieldMode}
            />
          ) : (
            // Modo vista
            <ViewMode product={product} />
          )}
        </div>
      )}
    </div>
  )
}

// Componente para el modo de vista
function ViewMode({ product }) {
  const tiempoMinutos = product.tiempoUnitario ? timeToMinutes(product.tiempoUnitario) : 0
  const tiempoTotal = tiempoMinutos * (product.unidades || 0)
  const totalValue = (product.precioUnitario || 0) * (product.unidades || 0)
  const precioPorMinuto = tiempoMinutos > 0 ? (product.precioUnitario || 0) / tiempoMinutos : 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      fontSize: '0.9rem'
    }}>
      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Información Básica
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Categoría: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.categoria || 'Sin categoría'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Medidas: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.medidas || 'No especificadas'}</span>
          </div>
          {product.ensamble && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Ensamble: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.ensamble}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Producción
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Unidades a producir: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.unidades || 0}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Unidades por placa: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.unidadesPorPlaca || 1}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Tiempo unitario: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.tiempoUnitario || '00:00:30'}</span>
          </div>
          {tiempoTotal > 0 && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Tiempo total: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {Math.floor(tiempoTotal / 60)}h {Math.floor(tiempoTotal % 60)}m
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Costos y Precios
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Precio unitario: </span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
              {formatCurrency(product.precioUnitario || 0)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Total: </span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>
              {formatCurrency(totalValue)}
            </span>
          </div>
          {precioPorMinuto > 0 && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Por minuto: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {formatCurrency(precioPorMinuto)}
              </span>
            </div>
          )}
          {typeof product.margenMaterial !== 'undefined' && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Margen material: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(product.margenMaterial || 0)}%</span>
            </div>
          )}
        </div>
      </div>

      {(product.usoPlacas > 0 || product.costoMaterial > 0) && (
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            fontWeight: 600 
          }}>
            Materiales
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {product.usoPlacas > 0 && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Uso placas: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.usoPlacas}</span>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Unidades por placa: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.unidadesPorPlaca || 1}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Costo placa: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(product.costoPlaca || 0)}</span>
            </div>
            {product.costoMaterial > 0 && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Costo material: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {formatCurrency(product.costoMaterial)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {product.imagen && (
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            fontWeight: 600 
          }}>
            Imagen
          </h4>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)'
          }}>
            <img 
              src={product.imagen} 
              alt={product.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para el formulario de edición
function EditForm({ editData, setEditData, imagePreview, onImageChange, onSave, materials = [], categories = [], currentMaterialId, editCalculatedFields, toggleEditFieldMode }) {
  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const [showCustomCategory, setShowCustomCategory] = useState(false)

  useEffect(() => {
    // Si la categoría actual no está entre las categorías predefinidas, mostrar el campo personalizado
    if (editData.categoria && !categories.includes(editData.categoria)) {
      setShowCustomCategory(true)
    } else {
      setShowCustomCategory(false)
    }
  }, [editData.categoria, categories])

  // Obtener datos del material actual (del editData o del producto original)
  const getCurrentMaterialData = () => {
    const materialId = editData.materialId || currentMaterialId
    if (materialId && materials.length > 0) {
      const material = materials.find(m => String(m.id) === String(materialId))
      return material || null
    }
    return null
  }

  const currentMaterialData = getCurrentMaterialData()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      fontSize: '0.9rem'
    }}>
      {/* Información básica */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Información Básica
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Nombre
            </label>
            <input
              type="text"
              value={editData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Categoría
            </label>
            <div>
              <select
                value={categories.includes(editData.categoria) ? editData.categoria : (showCustomCategory ? '__nueva__' : '')}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__nueva__') {
                    // switch to custom category input
                    handleInputChange('categoria', '')
                    setShowCustomCategory(true)
                    setTimeout(() => {
                      const input = document.querySelector('[name="categoriaPersonalizada"]')
                      if (input) input.focus()
                    }, 50)
                  } else {
                    handleInputChange('categoria', v)
                    setShowCustomCategory(false)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__nueva__">✏️ Crear nueva categoría...</option>
              </select>

              {showCustomCategory && (
                <input
                  type="text"
                  name="categoriaPersonalizada"
                  value={editData.categoria || ''}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  placeholder="Ingrese nueva categoría"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    marginTop: '8px'
                  }}
                />
              )}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Medidas
            </label>
            <input
              type="text"
              value={editData.medidas}
              onChange={(e) => handleInputChange('medidas', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tipo
            </label>
            <select
              value={editData.tipo}
              onChange={(e) => handleInputChange('tipo', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            >
              <option value="Venta">Venta</option>
              <option value="Presupuesto">Presupuesto</option>
              <option value="Stock">Stock</option>
            </select>
          </div>
          
          {/* Información del Material Actual */}
          {currentMaterialData && (
            <div style={{
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              marginTop: '8px'
            }}>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                fontWeight: 600
              }}>
                Material Seleccionado
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}>
                <span style={{ fontWeight: 600 }}>
                  ID: {currentMaterialData.id} • {currentMaterialData.nombre}
                </span>
                <span>•</span>
                <span>{currentMaterialData.tipo || 'Sin tipo'}</span>
                {currentMaterialData.espesor && (
                  <>
                    <span>•</span>
                    <span>{currentMaterialData.espesor}</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Material
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={editData.materialId || ''}
                onChange={(e) => {
                  const id = e.target.value
                  const sel = materials.find(x => String(x.id) === String(id))
                  if (sel) {
                    handleInputChange('materialId', id)
                    handleInputChange('costoMaterial', Number(sel.costoUnitario || 0))
                    handleInputChange('costoPlaca', Number(sel.costoUnitario || 0))
                  } else {
                    handleInputChange('materialId', '')
                    handleInputChange('costoMaterial', 0)
                    handleInputChange('costoPlaca', 0)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">-- Seleccionar material --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}{m.tipo ? ` — ${m.tipo}` : ''}{m.espesor ? ` — ${m.espesor}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Producción */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Producción
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Unidades a producir
            </label>
            <input
              type="number"
              value={editData.unidades}
              onChange={(e) => handleInputChange('unidades', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tiempo Unitario
            </label>
            <input
              type="text"
              value={editData.tiempoUnitario}
              onChange={(e) => handleInputChange('tiempoUnitario', e.target.value)}
              placeholder="HH:MM:SS"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Precio Unitario
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={editData.precioUnitario}
                onChange={(e) => handleInputChange('precioUnitario', Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    // Trigger parent save if provided
                    try { onSave && onSave() } catch (err) { console.error(err) }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
                min="0"
                step="0.01"
              />
              <button
                type="button"
                onClick={() => toggleEditFieldMode('isPrecioUnitarioManual')}
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: editCalculatedFields.isPrecioUnitarioManual ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: editCalculatedFields.isPrecioUnitarioManual ? 'white' : 'var(--text-primary)',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
                title={editCalculatedFields.isPrecioUnitarioManual ? 'Modo manual activado' : 'Modo automático activado'}
              >
                {editCalculatedFields.isPrecioUnitarioManual ? 'MAN' : 'AUTO'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Materiales */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Materiales
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Unidades por Placa
            </label>
            <input
              type="number"
              value={editData.unidadesPorPlaca}
              onChange={(e) => handleInputChange('unidadesPorPlaca', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Uso de Placas
            </label>
            <input
              type="number"
              value={editData.usoPlacas}
              onChange={(e) => handleInputChange('usoPlacas', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Costo Material
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={editData.costoMaterial}
                onChange={(e) => handleInputChange('costoMaterial', Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
                min="0"
                step="0.01"
              />
              <button
                type="button"
                onClick={() => toggleEditFieldMode('isCostoMaterialManual')}
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: editCalculatedFields.isCostoMaterialManual ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: editCalculatedFields.isCostoMaterialManual ? 'white' : 'var(--text-primary)',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
                title={editCalculatedFields.isCostoMaterialManual ? 'Modo manual activado' : 'Modo automático activado'}
              >
                {editCalculatedFields.isCostoMaterialManual ? 'MAN' : 'AUTO'}
              </button>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Costo Placa ($)
            </label>
            <input
              type="number"
              value={editData.costoPlaca}
              onChange={(e) => handleInputChange('costoPlaca', Number(e.target.value))}
              readOnly
              title="Este valor se extrae del material seleccionado"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'not-allowed',
                opacity: 0.9
              }}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Margen Material (%)
            </label>
            <input
              type="number"
              value={editData.margenMaterial}
              onChange={(e) => handleInputChange('margenMaterial', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Imagen */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Imagen
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
          {imagePreview && (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <img 
                src={imagePreview} 
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Visibilidad / Publicación */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={editData.publicado || false} onChange={(e) => handleInputChange('publicado', e.target.checked)} />
          <span style={{ color: 'var(--text-primary)' }}>Publicar en catálogo público</span>
        </label>
      </div>
    </div>
  )
}

// Exportar componente protegido con autenticación de admin
export default withAdminAuth(Products)