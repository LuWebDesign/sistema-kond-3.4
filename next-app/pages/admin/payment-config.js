import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getPaymentConfig, savePaymentConfig } from '../../utils/supabasePaymentConfig'

function PaymentConfigAdmin() {
  const router = useRouter()
  const [paymentConfig, setPaymentConfig] = useState({
    transferencia: { enabled: true, alias: '', cbu: '', titular: '', banco: '' },
    whatsapp: { enabled: true, numero: '', mensaje: '' },
    retiro: { enabled: true, direccion: '', direccionLink: '', horarios: '' },
    calendario: { enabled: true },
    textos: {
      infoTransferencia: 'Nota: si elegís el método Transferencia y realizas una (seña 50%), podés seleccionar una fecha de entrega disponible en el calendario.',
      infoTransferenciaEnabled: true,
      infoWhatsapp: 'Podés enviar tu pedido por WhatsApp y coordinamos los detalles de pago y entrega.',
      infoWhatsappEnabled: true,
      infoRetiro: '',
      infoRetiroEnabled: true,
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')

  const [isTransferenciaCollapsed, setIsTransferenciaCollapsed] = useState(false)
  const [isWhatsappCollapsed, setIsWhatsappCollapsed] = useState(false)
  const [isRetiroCollapsed, setIsRetiroCollapsed] = useState(false)
  const [isTextoTransferenciaCollapsed, setIsTextoTransferenciaCollapsed] = useState(false)
  const [isTextoWhatsappCollapsed, setIsTextoWhatsappCollapsed] = useState(false)
  const [isTextoRetiroCollapsed, setIsTextoRetiroCollapsed] = useState(false)
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    tipo: '',
    campo: '',
    actual: false,
    icon: '',
    description: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      if (paymentConfig.transferencia.alias && paymentConfig.transferencia.cbu) {
        setIsTransferenciaCollapsed(true)
      }
      if (paymentConfig.whatsapp.numero) {
        setIsWhatsappCollapsed(true)
      }
      if (paymentConfig.retiro.direccion && paymentConfig.retiro.direccion.length > 3) {
        setIsRetiroCollapsed(true)
      }
      if (paymentConfig.textos?.infoTransferencia) {
        setIsTextoTransferenciaCollapsed(true)
      }
      if (paymentConfig.textos?.infoWhatsapp) {
        setIsTextoWhatsappCollapsed(true)
      }
      if (paymentConfig.textos?.infoRetiro) {
        setIsTextoRetiroCollapsed(true)
      }
    }
  }, [isLoading])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const config = await getPaymentConfig()
      if (config) {
        setPaymentConfig(prev => ({
          ...prev,
          ...config,
          calendario: { ...prev.calendario, ...config.calendario },
          textos: { ...prev.textos, ...(config.textos || {}) },
        }))
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error)
      setSaveMessage('❌ Error al cargar la configuración')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      const result = await savePaymentConfig(paymentConfig)
      if (result && result.success) {
        // keep local copy as backup
        if (typeof window !== 'undefined') localStorage.setItem('paymentConfig', JSON.stringify(paymentConfig))
        setSaveMessage('✅ Configuración guardada exitosamente')
        // Collapse all sections after saving
        setIsTransferenciaCollapsed(true)
        setIsWhatsappCollapsed(true)
        setIsRetiroCollapsed(true)
        setIsTextoTransferenciaCollapsed(true)
        setIsTextoWhatsappCollapsed(true)
        setIsTextoRetiroCollapsed(true)
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        const errObj = result?.error
        const errMsg = errObj?.message || (typeof errObj === 'string' ? errObj : JSON.stringify(errObj)) || 'Error al guardar la configuración'
        setSaveMessage(`❌ ${errMsg}`)
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      setSaveMessage(`❌ ${error?.message || String(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const getDescriptionForType = (tipo) => {
    const descriptions = {
      'Transferencia Bancaria': 'Los datos de tu cuenta bancaria (alias, CBU/CVU, titular y banco) estarán visibles para que los clientes puedan realizar transferencias. Si lo ocultás, este método de pago no estará disponible en el checkout.',
      'WhatsApp': 'El botón de contacto por WhatsApp estará disponible para que los clientes puedan coordinar su pedido directamente. Si lo ocultás, este método no estará disponible en el checkout.',
      'Retiro en Local': 'La opción de retiro en local con tu dirección y horarios estará disponible para los clientes. Si lo ocultás, este método no estará disponible en el checkout.',
      'Calendario de Fecha de Entrega': 'Los clientes podrán seleccionar una fecha de entrega disponible cuando elijan transferencia. Si lo desactivás, no verán el calendario de fechas.',
      'Texto Transferencia': 'Este texto informativo aparecerá en el método de transferencia para guiar al cliente. Si lo ocultás, no se mostrará ninguna nota adicional.',
      'Texto WhatsApp': 'Este texto informativo aparecerá en el método de WhatsApp para guiar al cliente. Si lo ocultás, no se mostrará ninguna nota adicional.',
      'Texto Retiro': 'Este texto informativo aparecerá en el método de retiro para guiar al cliente. Si lo ocultás, no se mostrará ninguna nota adicional.'
    }
    return descriptions[tipo] || 'Esta sección será visible u oculta para los clientes en el checkout.'
  }

  const getIconForType = (tipo) => {
    const icons = {
      'Transferencia Bancaria': '🏦',
      'WhatsApp': '💬',
      'Retiro en Local': '📦',
      'Calendario de Fecha de Entrega': '📅',
      'Texto Transferencia': '🏦',
      'Texto WhatsApp': '💬',
      'Texto Retiro': '📦'
    }
    return icons[tipo] || '⚙️'
  }

  const handleToggleVisibility = (tipo, campo, actual) => {
    setConfirmModal({
      isOpen: true,
      tipo,
      campo,
      actual,
      icon: getIconForType(tipo),
      description: getDescriptionForType(tipo)
    })
  }

  const confirmToggle = () => {
    const nuevoEstado = !confirmModal.actual
    const campo = confirmModal.campo
    
    if (campo.includes('.')) {
      const [parent, child] = campo.split('.')
      setPaymentConfig(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: nuevoEstado }
      }))
    } else {
      setPaymentConfig(prev => ({
        ...prev,
        textos: { ...prev.textos, [campo]: nuevoEstado }
      }))
    }
    
    setConfirmModal({ ...confirmModal, isOpen: false })
  }

  const cancelToggle = () => {
    setConfirmModal({ ...confirmModal, isOpen: false })
  }

  if (isLoading) {
    return (
      <Layout title="Configuración de Métodos de Pago - Sistema KOND">
        <div style={{ padding: 20 }}>Cargando configuración...</div>
      </Layout>
    )
  }

  const saveMessageStyle = {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    background: saveMessage.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    border: saveMessage.includes('✅') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
    color: saveMessage.includes('✅') ? '#10b981' : '#ef4444',
    fontWeight: 500,
  }

  return (
    <Layout title="Configuración de Métodos de Pago - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>💳 Finalizar Compra (Configuración)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configura la información que se mostrará a los clientes al finalizar su compra</p>
        </div>

        {saveMessage && (
          <div style={saveMessageStyle}>
            {saveMessage}
          </div>
        )}

        {/* Simplified form - keeps the same fields as before */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>🏦 Transferencia Bancaria</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Datos de cuenta para recibir transferencias</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('Transferencia Bancaria', 'transferencia.enabled', paymentConfig.transferencia.enabled)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: paymentConfig.transferencia.enabled ? 'rgba(16,185,129,0.08)' : 'transparent',
                    color: paymentConfig.transferencia.enabled ? 'var(--color-success)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {paymentConfig.transferencia.enabled ? 'Visible' : 'No visible'}
                </button>
                <button type="button" onClick={() => setIsTransferenciaCollapsed(prev => !prev)} style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)' }}>{isTransferenciaCollapsed ? 'Editar' : 'Ocultar'}</button>
              </div>
            </div>

            {!isTransferenciaCollapsed && (
              <div style={{ marginTop: 12 }}>
                <input placeholder="Alias" value={paymentConfig.transferencia.alias} onChange={(e) => setPaymentConfig(prev => ({ ...prev, transferencia: { ...prev.transferencia, alias: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8 }} />
                <input placeholder="CBU/CVU" value={paymentConfig.transferencia.cbu} onChange={(e) => setPaymentConfig(prev => ({ ...prev, transferencia: { ...prev.transferencia, cbu: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
                <input placeholder="Titular" value={paymentConfig.transferencia.titular} onChange={(e) => setPaymentConfig(prev => ({ ...prev, transferencia: { ...prev.transferencia, titular: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
                <input placeholder="Banco" value={paymentConfig.transferencia.banco} onChange={(e) => setPaymentConfig(prev => ({ ...prev, transferencia: { ...prev.transferencia, banco: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
              </div>
            )}
          </div>

          <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>💬 WhatsApp</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Contacto directo</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('WhatsApp', 'whatsapp.enabled', paymentConfig.whatsapp.enabled)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: paymentConfig.whatsapp.enabled ? 'rgba(16,185,129,0.08)' : 'transparent',
                    color: paymentConfig.whatsapp.enabled ? 'var(--color-success)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {paymentConfig.whatsapp.enabled ? 'Visible' : 'No visible'}
                </button>
                <button type="button" onClick={() => setIsWhatsappCollapsed(prev => !prev)} style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)' }}>{isWhatsappCollapsed ? 'Editar' : 'Ocultar'}</button>
              </div>
            </div>
            {!isWhatsappCollapsed && (
              <div style={{ marginTop: 12 }}>
                <input placeholder="Número" value={paymentConfig.whatsapp.numero} onChange={(e) => setPaymentConfig(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, numero: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8 }} />
                <textarea placeholder="Mensaje" value={paymentConfig.whatsapp.mensaje} onChange={(e) => setPaymentConfig(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, mensaje: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
              </div>
            )}
          </div>

          <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>📦 Retiro</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Datos para retiro en local</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('Retiro en Local', 'retiro.enabled', paymentConfig.retiro.enabled)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: paymentConfig.retiro.enabled ? 'rgba(16,185,129,0.08)' : 'transparent',
                    color: paymentConfig.retiro.enabled ? 'var(--color-success)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {paymentConfig.retiro.enabled ? 'Visible' : 'No visible'}
                </button>
                <button type="button" onClick={() => setIsRetiroCollapsed(prev => !prev)} style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)' }}>{isRetiroCollapsed ? 'Editar' : 'Ocultar'}</button>
              </div>
            </div>

            {!isRetiroCollapsed && (
              <div style={{ marginTop: 12 }}>
                <input placeholder="Dirección" value={paymentConfig.retiro.direccion} onChange={(e) => setPaymentConfig(prev => ({ ...prev, retiro: { ...prev.retiro, direccion: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8 }} />
                <input placeholder="Link de Google Maps (https://goo.gl/maps/...)" value={paymentConfig.retiro.direccionLink || ''} onChange={(e) => setPaymentConfig(prev => ({ ...prev, retiro: { ...prev.retiro, direccionLink: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
                <input placeholder="Horarios" value={paymentConfig.retiro.horarios} onChange={(e) => setPaymentConfig(prev => ({ ...prev, retiro: { ...prev.retiro, horarios: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
              </div>
            )}
          </div>

          {/* Calendario de Fecha de Entrega */}
          <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>📅 Fecha de entrega solicitada</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Permite al cliente seleccionar una fecha de entrega al finalizar la compra con transferencia</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleVisibility('Calendario de Fecha de Entrega', 'calendario.enabled', paymentConfig.calendario?.enabled)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: paymentConfig.calendario?.enabled ? 'rgba(16,185,129,0.08)' : 'transparent',
                  color: paymentConfig.calendario?.enabled ? 'var(--color-success)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {paymentConfig.calendario?.enabled ? '✅ Activado' : '⛔ Desactivado'}
              </button>
            </div>
          </div>

          {/* Textos informativos del checkout */}
          <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 4px 0' }}>📝 Textos del Checkout</h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>Bloques informativos que ve el cliente al finalizar la compra</p>

            {/* Info Transferencia */}
            <div style={{ marginBottom: 12, padding: 16, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14 }}>🏦 Transferencia Bancaria</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Texto informativo que ve el cliente</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility('Texto Transferencia', 'infoTransferenciaEnabled', paymentConfig.textos?.infoTransferenciaEnabled !== false)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: paymentConfig.textos?.infoTransferenciaEnabled !== false ? 'rgba(16,185,129,0.08)' : 'transparent', color: paymentConfig.textos?.infoTransferenciaEnabled !== false ? 'var(--color-success)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
                  >
                    {paymentConfig.textos?.infoTransferenciaEnabled !== false ? 'Visible' : 'No visible'}
                  </button>
                  <button type="button" onClick={() => setIsTextoTransferenciaCollapsed(prev => !prev)} style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>{isTextoTransferenciaCollapsed ? 'Editar' : 'Ocultar'}</button>
                </div>
              </div>
              {!isTextoTransferenciaCollapsed && (
                <textarea
                  rows={3}
                  placeholder="Nota sobre transferencia..."
                  value={paymentConfig.textos?.infoTransferencia || ''}
                  onChange={(e) => setPaymentConfig(prev => ({ ...prev, textos: { ...prev.textos, infoTransferencia: e.target.value } }))}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box', marginTop: 12 }}
                />
              )}
            </div>

            {/* Info WhatsApp */}
            <div style={{ marginBottom: 12, padding: 16, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14 }}>💬 WhatsApp</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Texto informativo que ve el cliente</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility('Texto WhatsApp', 'infoWhatsappEnabled', paymentConfig.textos?.infoWhatsappEnabled !== false)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: paymentConfig.textos?.infoWhatsappEnabled !== false ? 'rgba(16,185,129,0.08)' : 'transparent', color: paymentConfig.textos?.infoWhatsappEnabled !== false ? 'var(--color-success)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
                  >
                    {paymentConfig.textos?.infoWhatsappEnabled !== false ? 'Visible' : 'No visible'}
                  </button>
                  <button type="button" onClick={() => setIsTextoWhatsappCollapsed(prev => !prev)} style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>{isTextoWhatsappCollapsed ? 'Editar' : 'Ocultar'}</button>
                </div>
              </div>
              {!isTextoWhatsappCollapsed && (
                <textarea
                  rows={3}
                  placeholder="Podés enviar tu pedido por WhatsApp y coordinamos los detalles de pago y entrega."
                  value={paymentConfig.textos?.infoWhatsapp || ''}
                  onChange={(e) => setPaymentConfig(prev => ({ ...prev, textos: { ...prev.textos, infoWhatsapp: e.target.value } }))}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box', marginTop: 12 }}
                />
              )}
            </div>

            {/* Info Retiro */}
            <div style={{ padding: 16, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14 }}>📦 Retiro</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Texto informativo que ve el cliente</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility('Texto Retiro', 'infoRetiroEnabled', paymentConfig.textos?.infoRetiroEnabled !== false)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: paymentConfig.textos?.infoRetiroEnabled !== false ? 'rgba(16,185,129,0.08)' : 'transparent', color: paymentConfig.textos?.infoRetiroEnabled !== false ? 'var(--color-success)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
                  >
                    {paymentConfig.textos?.infoRetiroEnabled !== false ? 'Visible' : 'No visible'}
                  </button>
                  <button type="button" onClick={() => setIsTextoRetiroCollapsed(prev => !prev)} style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>{isTextoRetiroCollapsed ? 'Editar' : 'Ocultar'}</button>
                </div>
              </div>
              {!isTextoRetiroCollapsed && (
                <textarea
                  rows={3}
                  placeholder="Nota adicional sobre el retiro en local..."
                  value={paymentConfig.textos?.infoRetiro || ''}
                  onChange={(e) => setPaymentConfig(prev => ({ ...prev, textos: { ...prev.textos, infoRetiro: e.target.value } }))}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box', marginTop: 12 }}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleSaveConfig} disabled={isSaving} style={{ padding: '12px 24px', borderRadius: 8, background: isSaving ? 'var(--text-secondary)' : 'var(--accent-blue)', color: 'white', border: 'none' }}>{isSaving ? '⏳ Guardando...' : '💾 Guardar Configuración'}</button>
            <button onClick={() => router.back()} style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Cancelar</button>
          </div>
        </div>

        {/* Modal de confirmación personalizado */}
        {confirmModal.isOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }} onClick={cancelToggle}>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)'
            }} onClick={(e) => e.stopPropagation()}>
              {/* Icono y título */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{confirmModal.icon}</div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {confirmModal.tipo}
                </h2>
              </div>

              {/* Estado actual/nuevo */}
              <div style={{
                background: 'var(--bg-secondary)',
                padding: 16,
                borderRadius: 12,
                marginBottom: 20,
                border: '2px solid ' + (confirmModal.actual
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)')
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Estado actual:</span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: confirmModal.actual ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                    color: confirmModal.actual ? '#10b981' : '#6b7280'
                  }}>
                    {confirmModal.actual ? '✅ Visible' : '⛔ No visible'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>→</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 8 }}>Cambiar a:</span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: !confirmModal.actual ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: !confirmModal.actual ? '#10b981' : '#ef4444'
                    }}>
                      {!confirmModal.actual ? '✅ Visible' : '⛔ No visible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 18, marginTop: 2 }}>ℹ️</span>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--text-primary)'
                  }}>
                    {confirmModal.description}
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={confirmToggle}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: !confirmModal.actual ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px ' + (!confirmModal.actual ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
                    transition: 'transform 0.1s, box-shadow 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {!confirmModal.actual ? '✅ Hacer Visible' : '⛔ Ocultar'}
                </button>
                <button
                  onClick={cancelToggle}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: 10,
                    border: '2px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                    e.currentTarget.style.borderColor = 'var(--text-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default withAdminAuth(PaymentConfigAdmin)
