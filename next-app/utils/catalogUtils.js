// Utilidades para el catálogo

// Formatear moneda
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount)
}

// Convertir tiempo HH:MM:SS a minutos
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  const seconds = parseInt(parts[2]) || 0
  return hours * 60 + minutes + Math.ceil(seconds / 60)
}

// Convertir minutos a tiempo HH:MM
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Escapar HTML para prevenir XSS
export const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// Calcular tiempo total de producción del carrito
export const calculateTotalProductionTime = (cart) => {
  let totalMinutes = 0
  
  cart.forEach(item => {
    const time = item.tiempoUnitario || '00:00:00'
    const minutes = timeToMinutes(time)
    totalMinutes += minutes * item.quantity
  })
  
  return totalMinutes
}

// Obtener capacidad disponible por día
export const getAvailableCapacityPerDay = () => {
  if (typeof window === 'undefined') return {}
  
  const pedidos = JSON.parse(localStorage.getItem('pedidos')) || []
  const productosBase = JSON.parse(localStorage.getItem('productosBase')) || []
  const capacityPerDay = {} // { 'YYYY-MM-DD': minutosUsados }

  // Calcular tiempo usado por día
  pedidos.forEach(pedido => {
    if (!pedido.fecha) return
    
    const producto = productosBase.find(p => p.id === pedido.productoId)
    if (!producto) return
    
    const minutes = timeToMinutes(producto.tiempoUnitario) * pedido.cantidad
    capacityPerDay[pedido.fecha] = (capacityPerDay[pedido.fecha] || 0) + minutes
  })

  return capacityPerDay
}

// Obtener fecha mínima selectable para transferencia
export const getMinSelectableDateForTransfer = () => {
  const today = new Date()
  // Para transferencias, permitir desde mañana
  today.setDate(today.getDate() + 1)
  today.setHours(0, 0, 0, 0)
  return today
}

// Generar mensaje de WhatsApp
export const generateWhatsAppMessage = (cart, total, customerData, formatCurrency) => {
  const itemsList = cart.map(item => 
    `• ${item.name} (${item.measures}) - Cantidad: ${item.quantity} - ${formatCurrency(item.price * item.quantity)}`
  ).join('\n')
  
  const customerInfo = [
    customerData.name,
    customerData.phone,
    customerData.email,
    customerData.address
  ].filter(Boolean).join('\n')
  
  return `Hola! Quiero realizar este pedido:

${itemsList}

Total: ${formatCurrency(total)}

Mis datos:
${customerInfo}`
}

// Validar datos del formulario de checkout
export const validateCheckoutForm = (customerData, paymentMethod) => {
  const errors = []
  
  if (!customerData.name || customerData.name.trim().length < 2) {
    errors.push('El nombre es requerido (mínimo 2 caracteres)')
  }
  
  if (!customerData.phone || customerData.phone.trim().length < 8) {
    errors.push('El teléfono es requerido (mínimo 8 dígitos)')
  }
  
  if (customerData.email && !isValidEmail(customerData.email)) {
    errors.push('El formato del email no es válido')
  }
  
  if (paymentMethod === 'transferencia' && !customerData.address) {
    errors.push('La dirección es requerida para transferencias')
  }
  
  return errors
}

// Validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Comprimir imagen para evitar exceder localStorage
export const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

// Obtener datos del usuario logueado (si existe)
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null
  
  try {
    // Intentar obtener usuario de diferentes fuentes
    if (window.KONDAuth && typeof window.KONDAuth.currentUser === 'function') {
      const u = window.KONDAuth.currentUser()
      if (u && u.rol === 'admin') return null
      return u
    }
    
    // Fallback: buscar en localStorage
    const userData = localStorage.getItem('currentUser')
    if (!userData) return null
    const u2 = JSON.parse(userData)
    if (u2 && u2.rol === 'admin') return null
    return u2
  } catch (error) {
    console.warn('Error getting current user:', error)
    return null
  }
}

// Mostrar notificación (fallback simple si no hay sistema de notificaciones)
export const showNotification = (message, type = 'info') => {
  if (typeof window === 'undefined') return
  
  // Intentar usar sistema de notificaciones existente
  if (window.addNotification && typeof window.addNotification === 'function') {
    try {
      window.addNotification({
        title: type === 'error' ? '❌ Error' : type === 'success' ? '✅ Éxito' : 'ℹ️ Información',
        body: message,
        date: new Date().toISOString().slice(0, 10),
        meta: { tipo: 'catalog' }
      })
      return
    } catch (e) {
      // Continuar con fallback
    }
  }
  
  // Fallback: alert simple
  alert(message)
}

// Crear elemento de notificación toast
export const createToast = (message, type = 'info', duration = 3000) => {
  if (typeof window === 'undefined') return
  
  console.log('🔔 createToast llamado:', message, type)
  
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 16px 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
  `
  
  toast.textContent = message
  
  // Asegurar que el body esté listo
  if (document.body) {
    document.body.appendChild(toast)
    console.log('✅ Toast añadido al DOM')
  } else {
    console.error('❌ document.body no está disponible')
    return
  }
  
  // Añadir estilos de animación
  if (!document.getElementById('toast-styles')) {
    const styles = document.createElement('style')
    styles.id = 'toast-styles'
    styles.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `
    document.head.appendChild(styles)
  }
  
  // Auto-remove
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out'
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, duration)
}

// Formatear fecha para mostrar
export const formatDate = (dateStr) => {
  if (!dateStr) return 'No especificada'
  
  try {
    // Si la fecha viene en formato YYYY-MM-DD (sin hora) parsearla como fecha local
    const date = (function(s) {
      if (!s) return null
      const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      }
      return new Date(s)
    })(dateStr)
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return 'Error en fecha'
  }
}

// Parsear fecha YYYY-MM-DD como fecha local (evita desfase por zona horaria)
export const parseDateYMD = (s) => {
  if (!s) return null
  const str = String(s)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

// Verificar si el usuario actual es administrador (versión síncrona para compatibilidad)
export const isAdminLogged = () => {
  if (typeof window === 'undefined') return false
  
  try {
    // Verificar si existe sesión de admin en localStorage
    const adminSessionStr = localStorage.getItem('adminSession')
    if (adminSessionStr) {
      const adminSession = JSON.parse(adminSessionStr)
      if ((adminSession.loggedIn || adminSession.isLoggedIn) && adminSession.timestamp) {
        // Usar duración específica guardada o 24 horas por defecto
        const sessionDuration = adminSession.sessionDuration || (24 * 60 * 60 * 1000) // ms
        const sessionAge = Date.now() - adminSession.timestamp

        if (sessionAge < sessionDuration) {
          // Verificar que el usuario sea admin (nueva estructura de Supabase Auth)
          if (adminSession.user && adminSession.user.rol === 'admin') {
            return true
          }
          // Compatibilidad: si tiene rol directamente (estructura actualizada de /home)
          if (adminSession.rol === 'admin') {
            return true
          }
          // Compatibilidad: si es la sesión legacy (sin rol) pero tiene email/username
          if (adminSession.email || adminSession.username) {
            return true
          }
        } else {
          // Sesión expirada, limpiarla
          localStorage.removeItem('adminSession')
        }
      }
    }

    // Verificar si existe usuario de Supabase en localStorage (kond-user)
    const kondUserStr = localStorage.getItem('kond-user')
    if (kondUserStr) {
      const kondUser = JSON.parse(kondUserStr)
      if (kondUser.rol === 'admin') {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error verificando permisos de admin:', error)
    return false
  }
}

// Verificar si el usuario actual es administrador (versión async con Supabase)
export const checkIsAdmin = async () => {
  if (typeof window === 'undefined') return false
  
  try {
    // Importar dinámicamente para evitar problemas de SSR
    const { getCurrentSession } = await import('./supabaseAuthV2')
    const session = await getCurrentSession()
    
    if (session?.user?.rol === 'admin') {
      // Sincronizar con localStorage para compatibilidad
      localStorage.setItem('adminSession', JSON.stringify({
        loggedIn: true,
        isLoggedIn: true,
        timestamp: Date.now(),
        sessionDuration: 24 * 60 * 60 * 1000,
        user: session.user
      }))
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error verificando permisos de admin (async):', error)
    return false
  }
}