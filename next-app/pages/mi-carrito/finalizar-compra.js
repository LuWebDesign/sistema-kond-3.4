import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import PublicLayout from '../../components/PublicLayout'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import stylesResp from '../../styles/catalog-responsive.module.css'
import { useCart, useProducts, useCoupons, useOrders } from '../../hooks/useCatalog'
import {
  formatCurrency,
  generateWhatsAppMessage,
  validateCheckoutForm,
  getCurrentUser,
  createToast,
  compressImage
} from '../../utils/catalogUtils'
import { getPaymentConfig } from '../../utils/supabasePaymentConfig'
import { getPromocionesActivas } from '../../utils/supabaseMarketing'
import { applyPromotionsToCart } from '../../utils/promoEngine'
import { useNotifications } from '../../components/NotificationsProvider'

export default function FinalizarCompraPage() {
  const router = useRouter()
  const { cart, clearCart, subtotal } = useCart()
  const { products } = useProducts()
  const { calculateDiscount } = useCoupons()
  const { saveOrder } = useOrders()
  const notificationsContext = useNotifications()
  const addNotification = notificationsContext?.addNotification

  const discount = calculateDiscount(subtotal)
  const total = Math.max(0, subtotal - discount)

  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [deliveryMethod, setDeliveryMethod] = useState('retiro')
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(null)
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [freeShippingEligible, setFreeShippingEligible] = useState(false)
  const [comprobante, setComprobante] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false)
  const [customerData, setCustomerData] = useState({ name: '', apellido: '', phone: '', email: '', address: '' })

  const paymentSectionRef = useRef(null)

  // Cargar datos del usuario al montar (client-side only — evita hydration mismatch)
  useEffect(() => {
    try {
      const u = getCurrentUser()
      if (!u) return
      const data = {
        name: u.nombre || u.name || u.email || '',
        apellido: u.apellido || u.lastName || '',
        phone: u.telefono || u.phone || u.telefonoMovil || '',
        email: u.email || u.correo || '',
        address: [u.direccion || u.address || '', u.localidad || u.city || '', u.cp || u.zip || '', u.provincia || u.state || ''].filter(Boolean).join(', ')
      }
      setCustomerData(data)
      // Auto-colapsar perfil si ya está completo
      if (data.name && data.phone) setIsProfileCollapsed(true)
    } catch { /* optional prefill: ignore if user data unavailable */ }
  }, [])

  // Cargar configuración de pago
  useEffect(() => {
    const load = async () => {
      try {
        const config = await getPaymentConfig()
        if (config) {
          setPaymentConfig(config)
          if (config.transferencia?.enabled) setPaymentMethod('transferencia')
          else if (config.whatsapp?.enabled) setPaymentMethod('whatsapp')
          else if (config.retiro?.enabled) setPaymentMethod('retiro')
        }
      } catch {
        try {
          const local = localStorage.getItem('paymentConfig')
          if (local) setPaymentConfig(JSON.parse(local))
        } catch { /* invalid JSON in localStorage: skip */ }
      }
    }
    load()

    const onConfigUpdated = async (e) => {
      try {
        const cfg = e?.detail || (await getPaymentConfig())
        if (cfg) {
          setPaymentConfig(cfg)
          setPaymentMethod((prev) => {
            if (prev && cfg[prev]?.enabled) return prev
            if (cfg.transferencia?.enabled) return 'transferencia'
            if (cfg.whatsapp?.enabled) return 'whatsapp'
            if (cfg.retiro?.enabled) return 'retiro'
            return ''
          })
        }
      } catch { /* event handler: ignore to prevent UI disruption */ }
    }
    window.addEventListener('paymentConfig:updated', onConfigUpdated)
    return () => window.removeEventListener('paymentConfig:updated', onConfigUpdated)
  }, [])

  // Sincronizar datos del usuario desde storage
  useEffect(() => {
    const applyUser = (user) => {
      if (!user) return
      setCustomerData(prev => ({
        ...prev,
        name: user.nombre || user.name || user.email || prev.name,
        apellido: user.apellido || user.lastName || prev.apellido,
        phone: user.telefono || user.phone || prev.phone,
        email: user.email || user.correo || prev.email,
        address: [user.direccion || user.address || '', user.localidad || user.city || '', user.cp || user.zip || '', user.provincia || user.state || ''].filter(Boolean).join(', ') || prev.address
      }))
    }
    const onUserUpdated = (e) => {
      try { applyUser(e?.detail || getCurrentUser()) } catch { /* event handler: ignore if user data invalid */ }
    }
    const onStorage = (e) => {
      if (e.key === 'currentUser') {
        try { if (e.newValue) applyUser(JSON.parse(e.newValue)) } catch { /* invalid JSON in storage event: skip */ }
      }
    }
    window.addEventListener('user:updated', onUserUpdated)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('user:updated', onUserUpdated)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Calcular envío gratis
  useEffect(() => {
    let mounted = true
    const compute = async () => {
      try {
        const { data, error } = await getPromocionesActivas()
        if (error || !mounted) return
        const promos = (data || []).map(p => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          aplicaA: p.aplica_a,
          categoria: p.categoria,
          productoId: p.producto_id,
          activo: p.activo,
          descuentoMonto: p.descuento_monto,
          config: p.configuracion || p.config
        }))
        const result = applyPromotionsToCart(cart || [], promos)
        if (mounted) setFreeShippingEligible(!!result.freeShipping)
      } catch { /* optional computation: ignore if promo data unavailable */ }
    }
    compute()
    return () => { mounted = false }
  }, [cart])

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
    } catch {
      const reader = new FileReader()
      reader.onload = (ev) => setComprobante(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleOrderComplete = useCallback(() => {
    clearCart()
    createToast('Pedido enviado exitosamente', 'success')
    router.push('/catalog')
  }, [clearCart, router])

  const handleSubmitOrder = async () => {
    if (isSubmitting) return
    const validationErrors = validateCheckoutForm(customerData, paymentMethod)
    if (validationErrors.length > 0) return createToast(validationErrors[0], 'error')
    if (deliveryMethod === 'envio' && (!customerData.address || !customerData.address.trim())) {
      return createToast('La dirección es requerida para envío', 'error')
    }
    if (paymentMethod === 'transferencia' && paymentConfig?.calendario?.enabled !== false && !selectedDeliveryDate) {
      return createToast('Selecciona una fecha de entrega para transferencia', 'error')
    }
    if (paymentMethod === 'transferencia' && !comprobante) {
      return createToast('Sube el comprobante de transferencia', 'error')
    }

    setIsSubmitting(true)
    try {
      let comprobanteUrl = null
      if (paymentMethod === 'transferencia' && comprobante) {
        createToast('Subiendo comprobante...', 'info')
        try {
          const { uploadComprobanteBase64 } = await import('../../utils/supabasePedidos')
          const { data: uploadData, error: uploadError } = await uploadComprobanteBase64(comprobante, Date.now())
          if (!uploadError) comprobanteUrl = uploadData.url
        } catch { /* upload failed: continue order without remote URL */ }
      }

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
        metodoEntrega: deliveryMethod,
        estadoPago: paymentMethod === 'transferencia' ? 'pagado_total' : 'pendiente',
        fechaSolicitudEntrega: selectedDeliveryDate,
        total,
        subtotal,
        descuento: discount,
        comprobante: paymentMethod === 'transferencia' ? (comprobanteUrl || comprobante) : null,
        montoRecibido: paymentMethod === 'transferencia' ? Number(total) : 0
      }

      const result = await saveOrder(orderData, () => {})
      if (!result.success) throw new Error(result.error?.message || 'Error al guardar el pedido')

      createToast('Pedido procesado exitosamente.', 'success')

      const whatsappPhone = paymentConfig?.whatsapp?.numero || '541136231857'
      if (paymentMethod === 'whatsapp') {
        const message = generateWhatsAppMessage(cart, total, customerData, formatCurrency, { metodoPago: 'whatsapp' })
        if (typeof window !== 'undefined') window.open(`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        createToast('Abriendo WhatsApp...', 'success')
      }
      if (paymentMethod === 'transferencia') {
        const message = generateWhatsAppMessage(cart, total, customerData, formatCurrency, { metodoPago: 'transferencia', comprobanteUrl })
        if (typeof window !== 'undefined') window.open(`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        createToast('Abriendo WhatsApp con los detalles del pedido...', 'success')
      }

      setTimeout(() => handleOrderComplete(), 1500)
    } catch (error) {
      if (error.name === 'QuotaExceededError' || (error.message && error.message.includes('exceeded the quota'))) {
        createToast('Espacio insuficiente en el navegador. Por favor libera espacio en localStorage e intenta nuevamente.', 'error')
        try {
          if (typeof window !== 'undefined' && window.confirm('¿Querés que el sitio elimine datos locales temporales para intentar liberar espacio?')) {
            try {
              localStorage.removeItem('pedidosCatalogo')
              localStorage.removeItem('cart')
              createToast('Datos locales eliminados. Intentá enviar el pedido nuevamente.', 'success')
            } catch { /* storage cleanup failed: best-effort, ignore */ }
          }
        } catch { /* safety net: ignore secondary error */ }
      } else {
        createToast('Error al procesar el pedido. Intenta nuevamente.', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Si el carrito está vacío, redirigir
  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length === 0) {
      // Dar un tick para que el hook de cart cargue desde localStorage antes de redirigir
      const timer = setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem('cart') || '[]')
        if (stored.length === 0) router.replace('/mi-carrito')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [cart, router])

  return (
    <PublicLayout title="Finalizar compra - KOND">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <button onClick={() => router.push('/catalog')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', padding: 0, fontSize: '0.9rem' }}>Catálogo</button>
          <span>/</span>
          <button onClick={() => router.push('/mi-carrito')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', padding: 0, fontSize: '0.9rem' }}>Mi carrito</button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Finalizar compra</span>
        </div>

        <h2 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
          Finalizar compra
        </h2>

        <div className={stylesResp.checkoutPageLayout}>
          {/* Columna izquierda: formulario */}
          <div className={stylesResp.pageColumn}>

            {/* Datos del usuario (colapsable) */}
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
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Nombre *</label>
                      <input value={customerData.name} onChange={(e) => setCustomerData(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" autoComplete="given-name" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Apellido</label>
                      <input value={customerData.apellido} onChange={(e) => setCustomerData(p => ({ ...p, apellido: e.target.value }))} placeholder="Apellido" autoComplete="family-name" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Teléfono *</label>
                      <input value={customerData.phone} onChange={(e) => setCustomerData(p => ({ ...p, phone: e.target.value }))} placeholder="Teléfono" autoComplete="tel" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
                      <input value={customerData.email} onChange={(e) => setCustomerData(p => ({ ...p, email: e.target.value }))} placeholder="Email (opcional)" autoComplete="email" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Dirección</label>
                    <input value={customerData.address} onChange={(e) => setCustomerData(p => ({ ...p, address: e.target.value }))} placeholder="Dirección" autoComplete="street-address" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Método de entrega */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Método de entrega</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setDeliveryMethod('envio')} style={{ padding: '8px 14px', borderRadius: 8, border: deliveryMethod === 'envio' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: deliveryMethod === 'envio' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: deliveryMethod === 'envio' ? 700 : 400 }}>
                  Con envío
                </button>
                <button onClick={() => setDeliveryMethod('retiro')} style={{ padding: '8px 14px', borderRadius: 8, border: deliveryMethod === 'retiro' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: deliveryMethod === 'retiro' ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: deliveryMethod === 'retiro' ? 700 : 400 }}>
                  Retiro por local
                </button>
              </div>
              {deliveryMethod === 'envio' && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Completa tus datos de envío</div>
                  <div>Para facilitar la coordinación, completa tu dirección en <strong>Mi Cuenta → Información de perfil</strong>.</div>
                  <button onClick={() => router.push('/catalog/user')} style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>Ir a Mi Cuenta</button>
                </div>
              )}
            </div>

            {/* Método de pago/pedido */}
            <section ref={paymentSectionRef} style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {paymentConfig?.whatsapp?.enabled && (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontSize: '0.95rem' }}>Realizar pedido mediante</div>
                  <button
                    onClick={() => setPaymentMethod('whatsapp')}
                    style={{ padding: '14px 16px', borderRadius: 10, width: '100%', border: paymentMethod === 'whatsapp' ? '2px solid #25D366' : '1.5px solid var(--border-color)', background: paymentMethod === 'whatsapp' ? '#25D36618' : 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', position: 'relative' }}
                  >
                    {paymentMethod === 'whatsapp' && <span style={{ position: 'absolute', top: 8, right: 10, background: '#25D366', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    <span style={{ fontSize: '2rem', flexShrink: 0 }}>💬</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: paymentMethod === 'whatsapp' ? '#25D366' : 'var(--text-primary)' }}>WhatsApp</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>Coordinamos los detalles de pago y entrega por chat</div>
                    </div>
                  </button>
                  {paymentMethod === 'whatsapp' && paymentConfig?.textos?.infoWhatsappEnabled !== false && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: '#25D36610', border: '1px solid #25D36650', fontSize: 14 }}>
                      <div style={{ fontWeight: 700, color: '#16a34a' }}>Solicitar pedido por WhatsApp</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>{paymentConfig?.textos?.infoWhatsapp || paymentConfig?.whatsapp?.mensaje || 'Podés enviar tu pedido por WhatsApp y coordinamos los detalles de pago y entrega.'}</div>
                    </div>
                  )}
                </div>
              )}

              {paymentConfig?.transferencia?.enabled && (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontSize: '0.95rem' }}>Medios de pago</div>
                  <button
                    onClick={() => setPaymentMethod(paymentMethod === 'transferencia' ? (paymentConfig?.whatsapp?.enabled ? 'whatsapp' : '') : 'transferencia')}
                    style={{ padding: '14px 16px', borderRadius: 10, width: '100%', border: paymentMethod === 'transferencia' ? '2px solid var(--accent-blue)' : '1.5px solid var(--border-color)', background: paymentMethod === 'transferencia' ? 'var(--bg-hover)' : 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', position: 'relative' }}
                  >
                    {paymentMethod === 'transferencia' && <span style={{ position: 'absolute', top: 8, right: 10, background: 'var(--accent-blue)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    <span style={{ fontSize: '2rem', flexShrink: 0 }}>🏦</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: paymentMethod === 'transferencia' ? 'var(--accent-blue)' : 'var(--text-primary)' }}>Transferencia</div>
                    </div>
                  </button>
                  {paymentConfig?.textos?.infoTransferenciaEnabled !== false && paymentMethod === 'transferencia' && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: 14 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{paymentConfig?.textos?.infoTransferencia || 'Realizá una seña del 50% por transferencia. Aquí tenés los datos para pagar.'}</div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Sección transferencia: calendario + datos bancarios + comprobante */}
            {paymentMethod === 'transferencia' && (
              <section style={{ marginBottom: 18 }}>
                {paymentConfig !== null && paymentConfig?.calendario?.enabled !== false && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Fecha de entrega solicitada</label>
                    <AvailabilityCalendar className="checkout-calendar" cart={cart} selectedDate={selectedDeliveryDate} onDateSelect={setSelectedDeliveryDate} />
                  </div>
                )}

                {/* Datos bancarios */}
                <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-card)', fontSize: 14, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Datos para transferencia</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                    {paymentConfig?.transferencia?.titular && (
                      <><div style={{ color: 'var(--text-secondary)' }}><strong>Titular</strong></div><div style={{ textAlign: 'right' }}>{paymentConfig.transferencia.titular}</div></>
                    )}
                    {paymentConfig?.transferencia?.banco && (
                      <><div style={{ color: 'var(--text-secondary)' }}><strong>Banco</strong></div><div style={{ textAlign: 'right' }}>{paymentConfig.transferencia.banco}</div></>
                    )}
                    {paymentConfig?.transferencia?.cbu && (
                      <><div style={{ color: 'var(--text-secondary)' }}><strong>CBU</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontFamily: 'monospace', background: 'var(--bg-hover)', padding: '6px 8px', borderRadius: 6 }}>{paymentConfig.transferencia.cbu}</div>
                        <button onClick={() => { navigator.clipboard?.writeText(paymentConfig.transferencia.cbu); createToast('CBU copiado', 'success') }} aria-label="Copiar CBU" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                        </button>
                      </div></>
                    )}
                    {paymentConfig?.transferencia?.alias && (
                      <><div style={{ color: 'var(--text-secondary)' }}><strong>Alias</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontFamily: 'monospace', background: 'var(--bg-hover)', padding: '6px 8px', borderRadius: 6 }}>{paymentConfig.transferencia.alias}</div>
                        <button onClick={() => { navigator.clipboard?.writeText(paymentConfig.transferencia.alias); createToast('Alias copiado', 'success') }} aria-label="Copiar alias" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', cursor: 'pointer' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                        </button>
                      </div></>
                    )}
                  </div>
                </div>

                {/* Comprobante */}
                <div style={{ marginTop: 12 }}>
                  <input id="comprobante-file" type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { const el = document.getElementById('comprobante-file'); if (el) el.click() }}
                      style={{ padding: '10px 14px', borderRadius: 8, border: comprobante ? '2px solid var(--accent-secondary)' : '1.5px solid var(--border-color)', background: comprobante ? 'var(--bg-hover)' : 'var(--bg-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      {comprobante ? 'Comprobante cargado' : 'Subir comprobante'}
                    </button>
                    {comprobante && <img src={comprobante} alt="comprobante" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />}
                  </div>
                </div>

                {/* Retiro en local */}
                {paymentConfig?.retiro?.enabled && paymentConfig?.textos?.infoRetiroEnabled !== false && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 14 }}>
                    <div style={{ fontWeight: 700 }}>Retiro en local</div>
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      {paymentConfig?.textos?.infoRetiro
                        ? <div style={{ whiteSpace: 'pre-line' }}>{paymentConfig.textos.infoRetiro}</div>
                        : <>
                            {paymentConfig.retiro.direccion && <div><strong>Dirección:</strong> {paymentConfig.retiro.direccion}</div>}
                            {paymentConfig.retiro.horarios && <div style={{ marginTop: 4 }}><strong>Horarios:</strong> {paymentConfig.retiro.horarios}</div>}
                          </>
                      }
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Columna derecha: resumen del pedido (restructurado visualmente) */}
          <aside className={stylesResp.pageColumnRight}>
            <div className={stylesResp.orderSummaryCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Resumen</div>
              <div style={{ fontWeight: 700 }}>{cart.length} items</div>
            </div>

            {/* Compacto: mostrar sólo nombre y precio (y descuentos por unidad y total, si aplica) */}
              <div className={stylesResp.summaryItemsList}>
              {cart.map((item, idx) => {
                const keyId = item.productId || item.idProducto || item.id || idx
                const prod = products.find(p => String(p.id) === String(item.productId || item.idProducto))
                const original = (item.originalPrice !== undefined && item.originalPrice !== null)
                  ? item.originalPrice
                  : (prod ? (prod.precioUnitario || prod.precio) : item.price)
                const unitPrice = item.price !== undefined ? item.price : (prod ? (prod.precioPromocional || prod.precioUnitario || prod.precio) : 0)
                const lineTotal = unitPrice * item.quantity
                const unitSavings = Math.max(0, (original || 0) - unitPrice)
                const savings = Math.max(0, unitSavings * item.quantity)
                return (
                  <div key={keyId} className={stylesResp.summaryItem}>
                    <div style={{ minWidth: 0 }}>
                      <div className={stylesResp.summaryItemName}>{item.name}</div>
                      <div className={stylesResp.summaryItemUnitPrice}>
                        {formatCurrency(unitPrice)} × {item.quantity}
                        {unitSavings > 0 && <span className={stylesResp.summaryItemSavings}> Ahorras {formatCurrency(unitSavings)} c/u</span>}
                      </div>
                    </div>
                    <div className={stylesResp.summaryItemPrice}>
                      <div className={stylesResp.summaryItemTotalPrice}>{formatCurrency(lineTotal)}</div>
                      {savings > 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total ahorro: {formatCurrency(savings)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>

              <div className={stylesResp.summaryTotals}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ color: 'var(--text-secondary)' }}>Subtotal</div>
                <div style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</div>
              </div>

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ color: 'var(--accent-secondary)' }}>Descuento</div>
                  <div style={{ color: 'var(--accent-secondary)' }}>-{formatCurrency(discount)}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ color: 'var(--text-secondary)' }}>Envío</div>
                <div style={{ fontWeight: 700 }}>{deliveryMethod === 'retiro' ? 'Retiro — Sin costo' : freeShippingEligible ? 'Envío gratis' : 'A cotizar'}</div>
              </div>

              <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', marginBottom: 12 }}>
                <div style={{ color: 'var(--text-primary)' }}>Total</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>{formatCurrency(total)}</div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                style={{ width: '100%', padding: 14, borderRadius: 8, background: isSubmitting ? 'var(--text-muted)' : 'var(--accent-secondary)', color: 'white', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', marginBottom: 10 }}
              >
                {isSubmitting ? 'Procesando...' : paymentMethod === 'whatsapp' ? 'Enviar por WhatsApp' : 'Confirmar pedido'}
              </button>

              <button
                onClick={() => router.push('/mi-carrito')}
                style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500 }}
              >
                Volver al carrito
              </button>

              <div style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                Los envíos y tiempos de entrega se coordinan luego de la confirmación del pago.
              </div>
            </div>
          </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  )
}
