import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function PaymentConfigRedirect() {
  const router = useRouter()
  useEffect(() => {
    // Redirigir al editor dentro del panel admin
    router.replace('/admin/payment-config')
  }, [router])

  return null
}
  const [isRetiroCollapsed, setIsRetiroCollapsed] = useState(false)

  // Cargar configuración desde Supabase al montar
  useEffect(() => {
    loadConfig()
  }, [])
  
  // Auto-colapsar secciones cuando tienen datos guardados
  useEffect(() => {
    if (!isLoading) {
      // Colapsar si tiene datos completos
      if (paymentConfig.transferencia.alias && paymentConfig.transferencia.cbu) {
        setIsTransferenciaCollapsed(true)
      }
      if (paymentConfig.whatsapp.numero) {
        setIsWhatsappCollapsed(true)
      }
      if (paymentConfig.retiro.direccion) {
        setIsRetiroCollapsed(true)
      }
    }
  }, [isLoading, paymentConfig.transferencia.alias, paymentConfig.transferencia.cbu, 
      paymentConfig.whatsapp.numero, paymentConfig.retiro.direccion])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const config = await getPaymentConfig()
      if (config) {
        setPaymentConfig(config)
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error)
      setSaveMessage('❌ Error al cargar la configuración')
    } finally {
      setIsLoading(false)
    }
  }

  // Guardar configuración en Supabase
  const handleSaveConfig = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      const success = await savePaymentConfig(paymentConfig)
      
      if (success) {
        // También guardar en localStorage como backup
        localStorage.setItem('paymentConfig', JSON.stringify(paymentConfig))
        setSaveMessage('✅ Configuración guardada exitosamente')
        
        // Auto-colapsar secciones después de guardar
        if (paymentConfig.transferencia.enabled && paymentConfig.transferencia.alias) {
          setIsTransferenciaCollapsed(true)
        }
        if (paymentConfig.whatsapp.enabled && paymentConfig.whatsapp.numero) {
          setIsWhatsappCollapsed(true)
        }
        if (paymentConfig.retiro.enabled && paymentConfig.retiro.direccion) {
          setIsRetiroCollapsed(true)
        }
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          setSaveMessage('')
        }, 3000)
      } else {
        setSaveMessage('❌ Error al guardar la configuración')
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      setSaveMessage('❌ Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Layout title="Configuración de Métodos de Pago - Sistema KOND">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--border-color)',
            borderTop: '4px solid var(--accent-blue)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando configuración...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Configuración de Métodos de Pago - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button 
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Volver
          </button>
          
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '8px'
          }}>
            💳 Configuración de Métodos de Pago
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configura la información que se mostrará a los clientes al finalizar su compra
          </p>
        </div>

        {/* Mensaje de guardado */}
        {saveMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: saveMessage.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${saveMessage.includes('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: saveMessage.includes('✅') ? '#10b981' : '#ef4444',
            fontWeight: 500
          }}>
            {saveMessage}
          </div>
        )}

        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Transferencia Bancaria */}
          <div style={{
            padding: '24px',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox"
                  checked={paymentConfig.transferencia.enabled}
                  onChange={(e) => setPaymentConfig(prev => ({
                    ...prev,
                    transferencia: { ...prev.transferencia, enabled: e.target.checked }
                  }))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>
                    🏦 Transferencia Bancaria
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Datos de cuenta para recibir transferencias
                  </p>
                </div>
              </div>
              
              {paymentConfig.transferencia.enabled && (
                <button
                  onClick={() => setIsTransferenciaCollapsed(!isTransferenciaCollapsed)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {isTransferenciaCollapsed ? '📋 Ver detalles' : '⬆️ Ocultar'}
                </button>
              )}
            </div>
            
            {paymentConfig.transferencia.enabled && !isTransferenciaCollapsed && (
              <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    Alias CBU
                  </label>
                  <input 
                    value={paymentConfig.transferencia.alias}
                    onChange={(e) => setPaymentConfig(prev => ({
                      ...prev,
                      transferencia: { ...prev.transferencia, alias: e.target.value }
                    }))}
                    placeholder="ej: KOND.PRODUCCION"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    CBU / CVU
                  </label>
                  <input 
                    value={paymentConfig.transferencia.cbu}
                    onChange={(e) => setPaymentConfig(prev => ({
                      ...prev,
                      transferencia: { ...prev.transferencia, cbu: e.target.value }
                    }))}
                    placeholder="ej: 0000000000000000000000"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)', 
                      marginBottom: '8px' 
                    }}>
                      Titular
                    </label>
                    <input 
                      value={paymentConfig.transferencia.titular}
                      onChange={(e) => setPaymentConfig(prev => ({
                        ...prev,
                        transferencia: { ...prev.transferencia, titular: e.target.value }
                      }))}
                      placeholder="ej: Juan Pérez"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.9rem', 
                      fontWeight: 600,
                      color: 'var(--text-primary)', 
                      marginBottom: '8px' 
                    }}>
                      Banco
                    </label>
                    <input 
                      value={paymentConfig.transferencia.banco}
                      onChange={(e) => setPaymentConfig(prev => ({
                        ...prev,
                        transferencia: { ...prev.transferencia, banco: e.target.value }
                      }))}
                      placeholder="ej: Banco Galicia"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {paymentConfig.transferencia.enabled && isTransferenciaCollapsed && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  ✓ Configurado: {paymentConfig.transferencia.alias || 'Sin alias'} • {paymentConfig.transferencia.titular || 'Sin titular'}
                </p>
              </div>
            )}
          </div>

          {/* WhatsApp */
          <div style={{
            padding: '24px',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox"
                  checked={paymentConfig.whatsapp.enabled}
                  onChange={(e) => setPaymentConfig(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, enabled: e.target.checked }
                  }))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>
                    💬 WhatsApp
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Contacto directo con los clientes
                  </p>
                </div>
              </div>
              
              {paymentConfig.whatsapp.enabled && (
                <button
                  onClick={() => setIsWhatsappCollapsed(!isWhatsappCollapsed)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {isWhatsappCollapsed ? '📋 Ver detalles' : '⬆️ Ocultar'}
                </button>
              )}
            </div>
            
            {paymentConfig.whatsapp.enabled && !isWhatsappCollapsed && (
              <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    Número de WhatsApp
                  </label>
                  <input 
                    value={paymentConfig.whatsapp.numero}
                    onChange={(e) => setPaymentConfig(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, numero: e.target.value }
                    }))}
                    placeholder="ej: 5491112345678"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <small style={{ 
                    display: 'block',
                    marginTop: '6px',
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem' 
                  }}>
                    Incluir código de país sin + ni espacios (ej: 549 + código de área + número)
                  </small>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    Mensaje personalizado (opcional)
                  </label>
                  <textarea 
                    value={paymentConfig.whatsapp.mensaje}
                    onChange={(e) => setPaymentConfig(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, mensaje: e.target.value }
                    }))}
                    placeholder="ej: ¡Gracias por tu pedido! Te contactaremos pronto para coordinar la entrega..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            )}
            
            {paymentConfig.whatsapp.enabled && isWhatsappCollapsed && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(34, 197, 94, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  ✓ Configurado: {paymentConfig.whatsapp.numero || 'Sin número'}
                  {paymentConfig.whatsapp.mensaje && ' • Con mensaje personalizado'}
                </p>
              </div>
            )}
          </div>
          }
          {/* Retiro en local */}
          <div style={{
            padding: '24px',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox"
                  checked={paymentConfig.retiro.enabled}
                  onChange={(e) => setPaymentConfig(prev => ({
                    ...prev,
                    retiro: { ...prev.retiro, enabled: e.target.checked }
                  }))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>
                    🏪 Retiro en Local
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Información del punto de retiro
                  </p>
                </div>
              </div>
              
              {paymentConfig.retiro.enabled && (
                <button
                  onClick={() => setIsRetiroCollapsed(!isRetiroCollapsed)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {isRetiroCollapsed ? '📋 Ver detalles' : '⬆️ Ocultar'}
                </button>
              )}
            </div>
            
            {paymentConfig.retiro.enabled && !isRetiroCollapsed && (
              <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    Dirección
                  </label>
                  <input 
                    value={paymentConfig.retiro.direccion}
                    onChange={(e) => setPaymentConfig(prev => ({
                      ...prev,
                      retiro: { ...prev.retiro, direccion: e.target.value }
                    }))}
                    placeholder="ej: Av. Corrientes 1234, CABA"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'var(--text-primary)', 
                    marginBottom: '8px' 
                  }}>
                    Horarios de atención
                  </label>
                  <input 
                    value={paymentConfig.retiro.horarios}
                    onChange={(e) => setPaymentConfig(prev => ({
                      ...prev,
                      retiro: { ...prev.retiro, horarios: e.target.value }
                    }))}
                    placeholder="ej: Lun a Vie 9-18hs, Sáb 9-13hs"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            )}
            
            {paymentConfig.retiro.enabled && isRetiroCollapsed && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.2)'
              }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  ✓ Configurado: {paymentConfig.retiro.direccion || 'Sin dirección'}
                  {paymentConfig.retiro.horarios && ` • ${paymentConfig.retiro.horarios}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{
          marginTop: '32px',
          padding: '20px',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          position: 'sticky',
          bottom: '20px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '1rem'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isSaving ? 'var(--text-secondary)' : 'var(--accent-blue)',
              color: 'white',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSaving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(PaymentConfig)
