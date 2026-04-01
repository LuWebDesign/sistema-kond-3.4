import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency, timeToSeconds, secondsToTime, compressImage } from '../../utils/catalogUtils'
import { 
  getAllProductos, 
  createProducto, 
  updateProducto, 
  deleteProducto, 
  toggleProductoPublicado,
  uploadProductoImagen 
} from '../../utils/supabaseProducts'
import dynamic from 'next/dynamic'

// Componente sin SSR para evitar hydration mismatches
const Products = dynamic(() => Promise.resolve(ProductsComponent), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div>Cargando productos...</div>
    </div>
  )
});

function ProductsComponent() {
  // Estados principales
  const [products, setProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [expandedCards, setExpandedCards] = useState(new Set()) // Estado para tarjetas expandidas
  const [editingCards, setEditingCards] = useState(new Set()) // Estado para tarjetas en modo edición
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, nombre } del producto a eliminar
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
    imagen: '',
    stock: 0
  })

  // Estados para manejo de imagen en el formulario de agregar
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  // Manejar cambio de imagen en el formulario de agregar
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5) // Limitar a 5 archivos
    if (files.length > 0) {
      setImageFiles(files)
      const previews = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target.result)
          reader.readAsDataURL(file)
        })
      })
      Promise.all(previews).then(setImagePreviews)
    } else {
      setImageFiles([])
      setImagePreviews([])
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
  
  // Obtener categorías únicas de los productos existentes
  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))].sort()

  // (updateCalculatedFields eliminado: lógica inlineada en el useEffect de abajo)

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
      
      // Mapear campos de snake_case a camelCase y calcular costoMaterial
      const initializedProducts = (productList || []).map(p => {
        // Calcular costo material: costoPlaca / unidadesPorPlaca
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
          margenMaterial: p.margen_material || 0,
          precioUnitario: p.precio_unitario || 0,
          precioPromos: p.precio_promos || 0,
          unidades: p.unidades || 1,
          ensamble: p.ensamble || 'Sin ensamble',
          imagen: (p.imagenes_urls && p.imagenes_urls.length > 0) ? p.imagenes_urls[0] : '',
          imagenes: p.imagenes_urls || [],
          stock: p.stock || 0,
          fechaCreacion: p.created_at || (typeof window !== 'undefined' ? new Date().toISOString() : '')
        }
      })

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
      // console.log('Conexión con base de datos materiales:', list.length > 0 ? 'OK' : 'Sin materiales', 'Total materiales:', list.length)
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

  const saveMaterialChanges = async () => {
    try {
      // 🆕 Intentar actualizar en Supabase
      try {
        const { updateMaterial } = await import('../../utils/supabaseMateriales')
        const { data, error } = await updateMaterial(editingMaterial, materialForm)
        
        if (data && !error) {
          // console.log('✅ Material actualizado en Supabase desde products')
          
          // Recargar materiales desde Supabase
          await loadMaterials()
          
          // Actualizar el formData del producto si el material editado está seleccionado
          if (formData.materialId === editingMaterial) {
            const updatedMaterial = materials.find(m => String(m.id) === String(editingMaterial))
            if (updatedMaterial) {
              setFormData(prev => ({ 
                ...prev, 
                costoMaterial: Number(updatedMaterial.costoUnitario || 0), 
                costoPlaca: Number(updatedMaterial.costoUnitario || 0) 
              }))
            }
          }
          
          cancelEditingMaterial()
          alert('Material actualizado correctamente')
          return
        } else {
          throw new Error('Supabase update failed')
        }
      } catch (supabaseError) {
        console.warn('⚠️ Fallback a localStorage para actualizar material')
        
        // Fallback: localStorage
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
        alert('Material actualizado correctamente')
      }
    } catch (error) {
      console.error('Error al guardar material:', error)
      alert('Error al guardar el material')
    }
  }

  // 🆕 Cargar materiales desde Supabase con fallback a localStorage
  const loadMaterials = async () => {
    if (typeof window === 'undefined') return
    
    try {
      const { getAllMateriales } = await import('../../utils/supabaseMateriales')
      const { data: materialesSupabase, error } = await getAllMateriales()
      
      if (materialesSupabase && !error) {
        // Mapear de snake_case a camelCase
        const mappedMateriales = materialesSupabase.map(m => ({
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
        // console.log('✅ Materiales cargados desde Supabase en products:', mappedMateriales.length)
        checkMaterialsConnection()
        return
      } else {
        throw new Error('Supabase failed')
      }
    } catch (supabaseError) {
      console.warn('⚠️ Fallback a localStorage para materiales en products')
      
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem('materiales')
        const list = raw ? JSON.parse(raw) : []
        setMaterials(list)
        checkMaterialsConnection()
      } catch (e) { 
        console.error('Error cargando materiales:', e) 
      }
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [])

  // Guardar productos ya no necesita hacer nada (Supabase guarda automáticamente)
  // Mantenemos la función por compatibilidad pero vacía
  const saveProducts = useCallback((productList) => {
    // No-op: Supabase guarda automáticamente en cada operación
    // console.log('saveProducts called (no-op with Supabase)')
  }, [])

  // Calcular productos filtrados con useMemo (optimización)
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Filtro de búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        // Búsqueda en campos principales
        p.nombre?.toLowerCase().includes(searchTerm) ||
        p.categoria?.toLowerCase().includes(searchTerm) ||
        p.medidas?.toLowerCase().includes(searchTerm) ||
        // Búsqueda por ID
        String(p.id).toLowerCase().includes(searchTerm) ||
        // Búsqueda por precio (convertir a string para buscar)
        String(p.precioUnitario || '').toLowerCase().includes(searchTerm) ||
        formatCurrency(p.precioUnitario || 0).toLowerCase().includes(searchTerm) ||
        // Búsqueda por material
        p.material?.toLowerCase().includes(searchTerm) ||
        // Búsqueda por espesor
        p.espesor?.toLowerCase().includes(searchTerm) ||
        // Búsqueda por tiempo unitario
        p.tiempoUnitario?.toLowerCase().includes(searchTerm) ||
        // Búsqueda por costo de material
        String(p.costoMaterial || '').toLowerCase().includes(searchTerm) ||
        formatCurrency(p.costoMaterial || 0).toLowerCase().includes(searchTerm) ||
        // Búsqueda por costo de placa
        String(p.costoPlaca || '').toLowerCase().includes(searchTerm) ||
        formatCurrency(p.costoPlaca || 0).toLowerCase().includes(searchTerm) ||
        // Búsqueda por precio por minuto
        String(p.precioPorMinuto || '').toLowerCase().includes(searchTerm) ||
        formatCurrency(p.precioPorMinuto || 0).toLowerCase().includes(searchTerm) ||
        // Búsqueda por unidades por placa
        String(p.unidadesPorPlaca || '').toLowerCase().includes(searchTerm) ||
        // Búsqueda por uso de placas
        String(p.usoPlacas || '').toLowerCase().includes(searchTerm) ||
        // Búsqueda por stock
        String(p.stock || '').toLowerCase().includes(searchTerm) ||
        // Búsqueda por tipo
        p.tipo?.toLowerCase().includes(searchTerm)
      )
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.tipo === filters.type)
    }

    // Solo productos activos
    filtered = filtered.filter(p => p.active !== false)

    return filtered
  }, [products, filters])

  // Calcular métricas
  const calculateMetrics = useCallback(() => {
    const activeProducts = filteredProducts.filter(p => p.active !== false)

    const total = activeProducts.length

    // Valor total: suma de todos los precios unitarios
    const totalValue = activeProducts.reduce((sum, p) => sum + (Number(p.precioUnitario) || 0), 0)

    // Tiempo total: suma del tiempo de corte de todos los productos
    const totalTimeMinutes = activeProducts.reduce((sum, p) => {
      const timeStr = p.tiempoUnitario || '00:00:30'
      const [hours, minutes, seconds] = timeStr.split(':').map(Number)
      const totalMin = (hours * 60) + minutes + (seconds / 60)
      return sum + totalMin
    }, 0)

    // Precio promedio: valor total / total de productos
    const averagePrice = total > 0 ? totalValue / total : 0

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
      totalTime: totalTimeMinutes,
      averagePrice,
      typeDistribution
    })
  }, [filteredProducts])

  // Efectos
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Escuchar cambios en productos desde otras páginas (como database)
  useEffect(() => {
    const handleProductosUpdated = () => {
      loadProducts()
    }

    window.addEventListener('productos:updated', handleProductosUpdated)
    
    return () => {
      window.removeEventListener('productos:updated', handleProductosUpdated)
    }
  }, [loadProducts])

  // Ya no necesitamos applyFilters como efecto porque usamos useMemo
  
  useEffect(() => {
    calculateMetrics()
  }, [filteredProducts, calculateMetrics])

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target

    // Campos que deben ser tratados como números
  const numericFields = new Set(['unidades', 'unidadesPorPlaca', 'usoPlacas', 'costoPlaca', 'costoMaterial', 'margenMaterial', 'precioUnitario', 'precioPromos', 'stock'])

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

  // Actualizar campos calculados cuando cambien inputs relevantes (una sola pasada, sin cascada)
  useEffect(() => {
    try {
      const { unidades, unidadesPorPlaca, costoPlaca, margenMaterial, tiempoUnitario, costoMaterial, precioUnitario } = formData
      const { isUsoPlacasManual, isCostoMaterialManual, isPrecioUnitarioManual } = calculatedFields

      const updates = {}

      // 1. Calcular uso de placas
      if (!isUsoPlacasManual) {
        const usoPlacas = unidadesPorPlaca > 0 ? Math.ceil(unidades / unidadesPorPlaca) : 0
        if (Number(formData.usoPlacas) !== Number(usoPlacas)) updates.usoPlacas = usoPlacas
      }

      // 2. Calcular costo de material y retener el valor efectivo para el paso siguiente
      let costoMaterialEfectivo = costoMaterial
      if (!isCostoMaterialManual) {
        const costoMaterialCalc = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
        const costoMaterialRounded = parseFloat(costoMaterialCalc.toFixed(2))
        if (Number(costoMaterial) !== costoMaterialRounded) updates.costoMaterial = costoMaterialRounded
        costoMaterialEfectivo = costoMaterialRounded
      }

      // 3. Calcular precio/margen usando costoMaterialEfectivo (evita la segunda pasada)
      if (!isPrecioUnitarioManual) {
        // Modo auto: derivar precio desde margen y costo material
        const precioUnitarioCalc = costoMaterialEfectivo * (1 + margenMaterial / 100)
        const precioRounded = parseFloat(precioUnitarioCalc.toFixed(2))
        if (Number(precioUnitario) !== precioRounded) updates.precioUnitario = precioRounded
      } else {
        // Modo manual de precio: derivar margen desde precio y costo material
        const margenDesdePrecio = costoMaterialEfectivo > 0 ? ((precioUnitario / costoMaterialEfectivo) - 1) * 100 : 0
        const margenRedondeado = parseFloat(margenDesdePrecio.toFixed(1))
        if (Number(margenMaterial) !== margenRedondeado) updates.margenMaterial = margenRedondeado
      }

      // Aplicar todos los cambios de formData en una sola llamada
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }))
      }

      // 4. Calcular tiempo total y precio por minuto
      const tiempoSegundos = timeToSeconds(tiempoUnitario || '00:00:30')
      const tiempoTotalSegundos = tiempoSegundos * unidades
      const tiempoMinutos = tiempoSegundos / 60
      const precioEfectivo = updates.precioUnitario !== undefined ? updates.precioUnitario : precioUnitario
      const newTiempoTotal = secondsToTime(tiempoTotalSegundos)
      const newPrecioPorMinuto = tiempoMinutos > 0 ? precioEfectivo / tiempoMinutos : 0

      setCalculatedFields(prev => {
        if (prev.tiempoTotal === newTiempoTotal && prev.precioPorMinuto === newPrecioPorMinuto) return prev
        return { ...prev, tiempoTotal: newTiempoTotal, precioPorMinuto: newPrecioPorMinuto }
      })
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
        stock: finalFormData.stock,
        ensamble: finalFormData.ensamble,
        imagenes: [] // Array de URLs de imágenes
      }

      // Crear producto en Supabase
      const { data: createdProduct, error } = await createProducto(newProductData)
      
      if (error) {
        console.error('Error creating product:', error)
        alert('Error al crear el producto: ' + error)
        return
      }

      // Si hay imágenes, subirlas a Storage y actualizar el producto
      if (imageFiles.length > 0 && createdProduct) {
        try {
          const uploadPromises = imageFiles.map(file => uploadProductoImagen(file, createdProduct.id))
          const uploadResults = await Promise.all(uploadPromises)
          
          const imageUrls = uploadResults
            .filter(result => !result.error && result.data)
            .map(result => result.data.url)
          
          if (imageUrls.length > 0) {
            // Actualizar producto con el array de URLs de imágenes
            await updateProducto(createdProduct.id, { imagenes: imageUrls })
          }
        } catch (uploadErr) {
          console.warn('No se pudieron subir algunas imágenes:', uploadErr)
        }
      }

      // Recargar productos desde Supabase
      await loadProducts()
      // Notificar a otras vistas (como /database) que hay nuevos productos
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('productos:updated'))
          // También usar localStorage para disparar evento 'storage' en otras pestañas
          localStorage.setItem('productos_updated', Date.now().toString())
        }
      } catch (e) {
        console.warn('No se pudo despachar evento de productos actualizados:', e)
      }
      
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
        imagenes: [],
        stock: 0,
        publicado: false
      })
      setImageFiles([])
      setImagePreviews([])
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

  // Eliminar producto - abre modal de confirmación
  const handleDeleteProduct = (id) => {
    const product = products.find(p => p.id === id)
    setDeleteConfirm({ id, nombre: product?.nombre || 'este producto' })
  }

  // Confirmar eliminación
  const confirmDeleteProduct = async () => {
    if (!deleteConfirm) return
    const { id } = deleteConfirm
    setDeleteConfirm(null)
    try {
      const res = await deleteProducto(id)

      if (res.error) {
        console.error('Error deleting product:', res.error)
        alert('Error al eliminar el producto')
        return
      }

      // Caso exitoso: res.deleted === true
      if (res.deleted) {
        await loadProducts()
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('productos:updated'))
            localStorage.setItem('productos_updated', Date.now().toString())
          }
        } catch (e) {}
        return
      }

      // Fallback: recargar productos por seguridad
      await loadProducts()
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('productos:updated'))
          localStorage.setItem('productos_updated', Date.now().toString())
        }
      } catch (e) {}
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar el producto')
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
      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary, #fff)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              animation: 'slideUp 0.2s ease'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.5rem'
            }}>
              🗑️
            </div>
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text-primary, #111)'
            }}>
              Eliminar producto
            </h3>
            <p style={{
              margin: '0 0 8px',
              color: 'var(--text-secondary, #666)',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              ¿Estás seguro de que quieres eliminar{' '}
              <strong style={{ color: 'var(--text-primary, #111)' }}>{deleteConfirm.nombre}</strong>?
            </p>
            <p style={{
              margin: '0 0 24px',
              color: '#ef4444',
              fontSize: '0.8rem',
              fontWeight: 500
            }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #ddd)',
                  background: 'var(--bg-primary, #f5f5f5)',
                  color: 'var(--text-primary, #333)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteProduct}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>

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
            <div className="buttons-section" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                  fontSize: '0.9rem',
                  height: '44px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showAddForm ? '∧ Ocultar Formulario' : '+ Agregar Producto'}
              </button>

              <Link href="/admin/materiales" style={{
                background: '#e5e7eb',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'none',
                height: '44px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>Ir a Materiales</Link>
            </div>

            {/* Filtros */}
            <div className="filters-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="filters-input-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre, ID, precio, material, espesor..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    flex: 1
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
                    fontSize: '0.9rem',
                    flex: 1
                  }}
                >
                  <option value="all">Todos los tipos</option>
                  <option value="Venta">Venta</option>
                  <option value="Presupuesto">Presupuesto</option>
                  <option value="Stock">Stock</option>
                </select>
              </div>
              <small style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                marginLeft: '4px'
              }}>
                Busca por: nombre, ID, precio, material, espesor, tiempo, etc.
              </small>
            </div>
          </div>

          {/* Formulario Agregar Producto */}
          {showAddForm && (
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
              border: '2px solid var(--border-color)',
              borderRadius: '16px',
              padding: '32px',
              marginTop: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)'
            }}>
              {/* Header del formulario */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '32px',
                paddingBottom: '20px',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                  ✨
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Agregar Nuevo Producto
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Completa los campos para crear un nuevo producto
                  </p>
                </div>
              </div>
              
              {/* Sección: Información Básica */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>📋</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Información Básica
                  </h4>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Nombre */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Nombre <span style={{ color: '#ef4444' }}>*</span>
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Categoría
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={(e) => {
                        handleInputChange(e)
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__nueva__">✏️ Crear nueva categoría...</option>
                    </select>
                    
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
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid #3b82f6',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem',
                          marginTop: '12px'
                        }}
                      />
                    )}
                  </div>

                  {/* Tipo */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Tipo <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'medidas')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Venta">Venta</option>
                      <option value="Presupuesto">Presupuesto</option>
                      <option value="Stock">Stock</option>
                    </select>
                  </div>

                  {/* Medidas */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Medidas <span style={{ color: '#ef4444' }}>*</span>
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Producción y Tiempos */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>⏱️</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Producción y Tiempos
                  </h4>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Tiempo Unitario */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Tiempo Unitario <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
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
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem'
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        pointerEvents: 'none'
                      }}>
                        HH:MM:SS
                      </span>
                    </div>
                  </div>

                  {/* Unidades */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Unidades a producir <span style={{ color: '#ef4444' }}>*</span>
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'unidadesPorPlaca')}
                      min="0"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  {/* Tiempo Total (calculado) */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Tiempo Total
                    </label>
                    <div style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: '#10b981',
                      fontSize: '0.95rem',
                      fontWeight: 600
                    }}>
                      {calculatedFields.tiempoTotal}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Material y Placas */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>🎨</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Material y Placas
                  </h4>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Unidades por Placa */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  {/* Uso de Placas */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Uso de Placas
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="number"
                        name="usoPlacas"
                        value={formData.usoPlacas}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, 'materialId')}
                        readOnly={!calculatedFields.isUsoPlacasManual}
                        min="0"
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border-color)',
                          background: calculatedFields.isUsoPlacasManual ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem',
                          cursor: calculatedFields.isUsoPlacasManual ? 'text' : 'not-allowed'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleFieldMode('isUsoPlacasManual')}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border-color)',
                          background: calculatedFields.isUsoPlacasManual ? '#3b82f6' : 'var(--bg-secondary)',
                          color: calculatedFields.isUsoPlacasManual ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          minWidth: '80px'
                        }}
                      >
                        {calculatedFields.isUsoPlacasManual ? 'Manual' : 'Auto'}
                      </button>
                    </div>
                  </div>

                  {/* Material (selección desde Materiales) */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Material
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                        onKeyDown={(e) => handleKeyDown(e, 'ensamble')}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem',
                          cursor: 'pointer'
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
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#3b82f6',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
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
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
                  </div>

                  {/* Ensamble */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Ensamble
                    </label>
                    <select
                      name="ensamble"
                      value={formData.ensamble}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'costoPlaca')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Sin ensamble">Sin ensamble</option>
                      <option value="Manual">Manual</option>
                      <option value="Automático">Automático</option>
                    </select>
                  </div>

                  {/* Costo Placa */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Costo Placa ($)
                    </label>
                    <input
                      type="number"
                      name="costoPlaca"
                      value={formData.costoPlaca}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'margenMaterial')}
                      min="0"
                      step="0.01"
                      readOnly
                      title="Este valor se extrae del material seleccionado"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                        fontSize: '0.95rem',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>

                  {/* Margen Material */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  {/* Precio por Minuto (calculado) */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Precio por Minuto
                    </label>
                    <div style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: '#10b981',
                      fontSize: '0.95rem',
                      fontWeight: 600
                    }}>
                      {formatCurrency(calculatedFields.precioPorMinuto)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Precios */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>💰</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Gestión de Precios
                  </h4>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Precio Unitario */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Precio Unitario <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        width: '100%',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '3px solid #3b82f6',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)',
                        color: '#2563eb',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)'
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
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '2px solid #3b82f6',
                            background: 'var(--bg-secondary)',
                            color: '#2563eb',
                            fontSize: '1.05rem',
                            fontWeight: 700
                          }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => toggleFieldMode('isPrecioUnitarioManual')}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: '2px solid var(--border-color)',
                          background: calculatedFields.isPrecioUnitarioManual ? '#3b82f6' : 'var(--bg-secondary)',
                          color: calculatedFields.isPrecioUnitarioManual ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          minWidth: '100px'
                        }}
                      >
                        {calculatedFields.isPrecioUnitarioManual ? 'Manual' : 'Auto'}
                      </button>
                    </div>
                  </div>

                  {/* Precio Promos */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)' 
                    }}>
                      Precio Promociones (opcional)
                    </label>
                    <input
                      type="number"
                      name="precioPromos"
                      value={formData.precioPromos}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="Dejar vacío para precio por defecto"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                    <small style={{ 
                      display: 'block', 
                      marginTop: '6px', 
                      fontSize: '0.8rem', 
                      color: 'var(--text-secondary)' 
                    }}>
                      Precio afectado por cupones y promociones
                    </small>
                  </div>
                </div>
              </div>

              {/* Sección: Imágenes */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>📸</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Imágenes del Producto
                  </h4>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '12px', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)' 
                  }}>
                    Subir imágenes (hasta 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px dashed var(--border-color)',
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  />
                  
                  {imagePreviews.length > 0 && (
                    <div style={{
                      marginTop: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '12px'
                    }}>
                      {imagePreviews.map((preview, index) => (
                        <div key={index} style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '2px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          position: 'relative'
                        }}>
                          <img 
                            src={preview} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover' 
                            }} 
                            alt={`Preview ${index + 1}`} 
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            fontSize: '0.75rem',
                            padding: '4px',
                            textAlign: 'center'
                          }}>
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección: Visibilidad */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '2px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '20px' }}>👁️</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Opciones de Visibilidad
                  </h4>
                </div>
                
                <div style={{
                  padding: '16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '1rem', 
                      color: 'var(--text-primary)',
                      marginBottom: '4px'
                    }}>
                      Publicar en catálogo público
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-secondary)' 
                    }}>
                      Visible para clientes en el catálogo público
                    </div>
                  </div>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '56px',
                    height: '30px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.publicado || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, publicado: e.target.checked }))}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: formData.publicado ? '#10b981' : '#ccc',
                      borderRadius: '30px',
                      transition: 'background 0.3s'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '22px',
                        width: '22px',
                        left: formData.publicado ? '30px' : '4px',
                        bottom: '4px',
                        background: 'white',
                        borderRadius: '50%',
                        transition: 'left 0.3s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}></span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{
                display: 'flex',
                gap: '16px',
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '2px solid var(--border-color)'
              }}>
                <button
                  onClick={handleAddProduct}
                  disabled={!formData.nombre || !formData.medidas}
                  style={{
                    flex: 1,
                    background: (formData.nombre && formData.medidas) 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'var(--text-secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px 32px',
                    cursor: (formData.nombre && formData.medidas) ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: (formData.nombre && formData.medidas) 
                      ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                      : 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.nombre && formData.medidas) {
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = formData.nombre && formData.medidas 
                      ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                      : 'none'
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
                    flex: 0.6,
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px 32px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--bg-secondary)'
                    e.target.style.borderColor = 'var(--text-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.borderColor = 'var(--border-color)'
                  }}
                >
                  ✕ Cancelar
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
    imagenes: product.imagenes || [product.imagen].filter(Boolean) || [],
    stock: product.stock || 0
  })
  const initialPreviews = product.imagenes || [product.imagen].filter(Boolean) || []
  const [imagePreviews, setImagePreviews] = useState(initialPreviews)
  // imageFiles is aligned with imagePreviews: null for existing images, File for newly selected
  const [imageFiles, setImageFiles] = useState(initialPreviews.map(() => null))

  // Actualizar editData cuando cambie el producto (por ejemplo, cuando se actualiza el stock desde database)
  // NO resetear si el usuario está editando, para no perder imágenes/datos no guardados
  useEffect(() => {
    if (isEditing) return;
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
      imagenes: product.imagenes || [product.imagen].filter(Boolean) || [],
      stock: product.stock || 0
    })
    const initial = product.imagenes || [product.imagen].filter(Boolean) || []
    setImagePreviews(initial)
    setImageFiles(initial.map(() => null))
  }, [product, isEditing])

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

  // Resetear modos manuales cuando sale de edición
  // (La sincronización de editData/imagePreviews/imageFiles ya se maneja en el useEffect anterior)
  useEffect(() => {
    if (!isEditing) {
      setEditCalculatedFields({
        isCostoMaterialManual: false,
        isPrecioUnitarioManual: false
      })
    }
  }, [isEditing])

  const getTypeColor = (type) => {
    switch (type) {
      case 'Venta': return '#10b981'
      case 'Presupuesto': return '#f59e0b'  
      case 'Stock': return '#3b82f6'
      default: return 'var(--text-secondary)'
    }
  }

  // Función para obtener el texto del badge de tipo con información de stock
  const getTypeBadgeText = (product) => {
    if (product.tipo === 'Stock') {
      const stock = product.stock || 0
      if (stock === 0) {
        return 'Sin stock'
      } else if (stock < 5) {
        return `Stock bajo (${stock})`
      } else {
        return `Stock (${stock})`
      }
    }
    return product.tipo
  }

  // Función para obtener el color del badge de tipo con información de stock
  const getTypeBadgeColor = (product) => {
    if (product.tipo === 'Stock') {
      const stock = product.stock || 0
      if (stock === 0) {
        return '#ef4444' // Rojo para sin stock
      } else if (stock < 5) {
        return '#f59e0b' // Amarillo para stock bajo
      } else {
        return '#10b981' // Verde para stock disponible
      }
    }
    return getTypeColor(product.tipo)
  }

  // Función para toggle de campos manuales en edición
  const toggleEditFieldMode = (fieldName) => {
    setEditCalculatedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  // Manejar cambio de imagen (agregar nuevas manteniendo las existentes)
  const handleImageChange = (e) => {
    const incoming = Array.from(e.target.files || [])
    if (incoming.length === 0) return

    // calcular cuántos slots quedan (max 5)
    const remaining = Math.max(0, 5 - imagePreviews.length)
    const toTake = incoming.slice(0, remaining)

    if (toTake.length === 0) return

    // Generar previews para los nuevos files
    const previewPromises = toTake.map(file => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.readAsDataURL(file)
    }))

    Promise.all(previewPromises).then(newPreviews => {
      const updatedPreviews = [...imagePreviews, ...newPreviews].slice(0, 5)
      const updatedFiles = [...imageFiles, ...toTake].slice(0, 5)
      setImagePreviews(updatedPreviews)
      setImageFiles(updatedFiles)
    })
  }

  // Reordenar imágenes (mover index a otra posición)
  const moveImage = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    const previews = Array.from(imagePreviews)
    const files = Array.from(imageFiles)
    const [p] = previews.splice(fromIndex, 1)
    const [f] = files.splice(fromIndex, 1)
    previews.splice(toIndex, 0, p)
    files.splice(toIndex, 0, f)
    setImagePreviews(previews)
    setImageFiles(files)
  }

  const moveLeft = (idx) => { if (idx > 0) moveImage(idx, idx - 1) }
  const moveRight = (idx) => { if (idx < imagePreviews.length - 1) moveImage(idx, idx + 1) }

  // Eliminar imagen por índice
  const removeImage = (idx) => {
    const previews = Array.from(imagePreviews)
    const files = Array.from(imageFiles)
    previews.splice(idx, 1)
    files.splice(idx, 1)
    setImagePreviews(previews)
    setImageFiles(files)
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
      
      // Si hay imágenes nuevas (Files) subir solo esos y mantener el orden elegido por el usuario
      try {
        // Preparar promesas de subida para las posiciones que tengan File
        const uploadPromises = imageFiles.map((file, idx) => {
          if (file instanceof File) {
            return uploadProductoImagen(file, product.id)
              .then(res => ({ idx, res }))
              .catch(err => ({ idx, res: { error: err } }))
          }
          return Promise.resolve({ idx, res: null })
        })

        const uploadResults = await Promise.all(uploadPromises)

        // Verificar si hubo errores en las subidas
        const failedUploads = uploadResults.filter(r => r.res && r.res.error)
        if (failedUploads.length > 0) {
          console.error('Errores al subir imágenes:', failedUploads.map(f => f.res.error))
        }

        // Construir arreglo final de URLs según el orden actual en imagePreviews
        const finalUrls = []
        for (let i = 0; i < imagePreviews.length; i++) {
          const fileEntry = imageFiles[i]
          if (fileEntry instanceof File) {
            const result = uploadResults.find(r => r.idx === i)
            if (result && result.res && !result.res.error && result.res.data && result.res.data.url) {
              finalUrls.push(result.res.data.url)
            } else {
              // Si falló la subida, intentar guardar como base64 como fallback
              try {
                const base64 = await new Promise((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result)
                  reader.onerror = reject
                  reader.readAsDataURL(fileEntry)
                })
                if (base64) finalUrls.push(base64)
              } catch (b64Err) {
                console.warn('No se pudo convertir imagen a base64:', b64Err)
              }
            }
          } else {
            // mantener la URL existente (asegurarse que sea URL pública o base64)
            const preview = imagePreviews[i]
            if (typeof preview === 'string' && (preview.startsWith('http') || preview.startsWith('data:'))) {
              finalUrls.push(preview)
            }
          }
        }

        // Siempre asignar (incluso si está vacío, para permitir eliminar todas las imágenes)
        finalData.imagenes = finalUrls.slice(0, 5)

        // Avisar al usuario si algunas imágenes no se pudieron subir al storage
        if (failedUploads.length > 0) {
          alert(`⚠️ ${failedUploads.length} imagen(es) no se pudieron subir al almacenamiento. Se guardaron como respaldo local.`)
        }
      } catch (uploadErr) {
        console.error('Error general al procesar imágenes:', uploadErr)
        alert('⚠️ Hubo un error al subir las imágenes. Los demás cambios se guardarán.')
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
  const tiempoSegundos = product.tiempoUnitario ? timeToSeconds(product.tiempoUnitario) : 0
  const tiempoTotalSegundos = tiempoSegundos * (product.unidades || 0)
  const tiempoTotal = secondsToTime(tiempoTotalSegundos)
  const precioPorMinuto = tiempoSegundos > 0 ? (product.precioUnitario || 0) / (tiempoSegundos / 60) : 0

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
    <div 
      className="product-card-admin"
      style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      opacity: product.active === false ? 0.6 : 1,
      transition: 'all 0.3s ease',
      borderColor: isEditing ? '#3b82f6' : 'var(--border-color)',
      position: 'relative'
    }}>
      {/* Header con información resumida */}
      <div className="product-card-header" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: isExpanded ? '16px' : '0'
      }}>
        {/* Botones de acción arriba */}
        <div className="product-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

              <div style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500
                }}>
                  ID: {product.id}
                </span>
                
                <button
                  onClick={() => onToggleExpansion(product.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                  title={isExpanded ? 'Colapsar' : 'Expandir'}
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Nombre y badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="product-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              {product.nombre}
            </h3>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              {/* Información del producto a la izquierda */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem'
              }}>
                {/* Material, Tipo y Espesor */}
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {materialData ? materialData.nombre : 'Sin material'}
                  </strong> • {materialData ? (materialData.tipo || 'Sin tipo') : 'Sin tipo'} 
                  {materialData && materialData.espesor && ` • ${materialData.espesor}`}
                </div>
                
                {/* Precios */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span>
                    <strong style={{ color: 'var(--accent-blue)' }}>{formatCurrency(product.precioUnitario || 0)}</strong>/unit
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

                {/* Badges de estado */}
                <div style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  alignItems: 'center',
                  marginTop: '4px'
                }}>
                  <span style={{
                    background: getTypeBadgeColor(product) + '20',
                    color: getTypeBadgeColor(product),
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 500
                  }}>
                    {getTypeBadgeText(product)}
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
                </div>
              </div>
              
              {/* Imagen de previsualización a la derecha */}
              <div style={{
                flexShrink: 0,
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {product.imagenes && product.imagenes.length > 0 ? (
                  <img
                    src={product.imagenes[0]}
                    alt={product.nombre}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    textAlign: 'center'
                  }}>
                    Sin imagen
                  </div>
                )}
              </div>
            </div>
          )}
          
          {isExpanded && !isEditing && (
            <p style={{
              margin: '0 0 8px 0',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              {product.categoria} • {product.medidas} • Creado: {product.fechaCreacion ? new Date(product.fechaCreacion).toLocaleDateString() : '—'}
              {product.publicado ? ' • Público' : ''}
            </p>
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
              imagePreviews={imagePreviews}
              onImageChange={handleImageChange}
              onReorderImage={moveImage}
              onRemoveImage={removeImage}
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
  const tiempoSegundos = product.tiempoUnitario ? timeToSeconds(product.tiempoUnitario) : 0
  const tiempoTotalSegundos = tiempoSegundos * (product.unidades || 0)
  const tiempoTotal = secondsToTime(tiempoTotalSegundos)
  const totalValue = (product.precioUnitario || 0) * (product.unidades || 0)
  const precioPorMinuto = tiempoSegundos > 0 ? (product.precioUnitario || 0) / (tiempoSegundos / 60) : 0

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
          {product.tipo === 'Stock' && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Stock: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.stock || 0} unidades</span>
            </div>
          )}
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
    </div>
  )
}

// Componente para el formulario de edición
function EditForm({ editData, setEditData, imagePreviews, onImageChange, onReorderImage, onRemoveImage, onSave, materials = [], categories = [], currentMaterialId, editCalculatedFields, toggleEditFieldMode }) {
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
              Stock
            </label>
            <input
              type="number"
              value={editData.stock}
              onChange={(e) => handleInputChange('stock', Number(e.target.value))}
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
            multiple
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
          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {imagePreviews.map((preview, index) => (
                <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img 
                    src={preview} 
                    alt={`Preview ${index + 1}`}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => onReorderImage(index, Math.max(0, index - 1))} title="Mover izquierda" style={{ background: '#ffffffcc', border: 'none', padding: '4px', borderRadius: 4, cursor: 'pointer' }}>◀</button>
                    <button type="button" onClick={() => onReorderImage(index, Math.min(imagePreviews.length -1, index + 1))} title="Mover derecha" style={{ background: '#ffffffcc', border: 'none', padding: '4px', borderRadius: 4, cursor: 'pointer' }}>▶</button>
                    <button type="button" onClick={() => onRemoveImage(index)} title="Eliminar imagen" style={{ background: '#ff4d4dcc', border: 'none', padding: '4px', borderRadius: 4, cursor: 'pointer', color: 'white' }}>✕</button>
                  </div>
                </div>
              ))}
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

// Estilos CSS para responsive
const styles = `
<style jsx global>{\`
  @media (max-width: 768px) {
    .product-card-admin {
      padding: 12px !important;
    }

    .product-card-header {
      gap: 10px !important;
    }

    .product-card-title h3 {
      font-size: 1rem !important;
    }

    .product-card-title span {
      font-size: 0.65rem !important;
      padding: 2px 4px !important;
    }

    .product-card-actions button {
      padding: 8px 10px !important;
      font-size: 0.75rem !important;
    }

    /* Estilos para la sección de filtros en móvil */
    .filters-section {
      flex-direction: column !important;
      gap: 12px !important;
    }

    .filters-input-row {
      flex-direction: column !important;
      gap: 8px !important;
      width: 100% !important;
    }

    .filters-input-row input {
      width: 100% !important;
    }

    .filters-input-row select {
      width: 100% !important;
      display: none !important;
    }

    /* Estilos para los botones en móvil */
    .buttons-section {
      flex-wrap: wrap !important;
      gap: 8px !important;
    }

    .buttons-section button,
    .buttons-section a {
      flex: 1 !important;
      min-width: 120px !important;
      height: 44px !important;
      box-sizing: border-box !important;
    }
  }

  @media (max-width: 480px) {
    .product-card-admin {
      padding: 10px !important;
    }

    .product-card-header {
      gap: 8px !important;
    }

    .product-card-title {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 6px !important;
    }

    .product-card-title h3 {
      font-size: 0.95rem !important;
      line-height: 1.3 !important;
    }

    .product-card-actions {
      gap: 6px !important;
    }

    .product-card-actions button {
      flex: 1;
      min-width: 40px;
      padding: 6px 8px !important;
    }

    .product-card-actions button:first-child,
    .product-card-actions button:nth-child(2) {
      min-width: 80px;
    }
  }
\`}</style>
`