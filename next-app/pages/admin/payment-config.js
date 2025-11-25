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
    retiro: { enabled: true, direccion: '', horarios: '' }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')

  const [isTransferenciaCollapsed, setIsTransferenciaCollapsed] = useState(false)
  const [isWhatsappCollapsed, setIsWhatsappCollapsed] = useState(false)
  const [isRetiroCollapsed, setIsRetiroCollapsed] = useState(false)

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
      if (paymentConfig.retiro.direccion) {
        setIsRetiroCollapsed(true)
      }
    }
  }, [isLoading, paymentConfig.transferencia.alias, paymentConfig.transferencia.cbu, paymentConfig.whatsapp.numero, paymentConfig.retiro.direccion])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const config = await getPaymentConfig()
      if (config) setPaymentConfig(config)
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
                  onClick={() => setPaymentConfig(prev => ({ ...prev, transferencia: { ...prev.transferencia, enabled: !prev.transferencia.enabled } }))}
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
                  onClick={() => setPaymentConfig(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, enabled: !prev.whatsapp.enabled } }))}
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
                  onClick={() => setPaymentConfig(prev => ({ ...prev, retiro: { ...prev.retiro, enabled: !prev.retiro.enabled } }))}
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
                <input placeholder="Horarios" value={paymentConfig.retiro.horarios} onChange={(e) => setPaymentConfig(prev => ({ ...prev, retiro: { ...prev.retiro, horarios: e.target.value } }))} style={{ width: '100%', padding: 8, borderRadius: 8, marginTop: 8 }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleSaveConfig} disabled={isSaving} style={{ padding: '12px 24px', borderRadius: 8, background: isSaving ? 'var(--text-secondary)' : 'var(--accent-blue)', color: 'white', border: 'none' }}>{isSaving ? '⏳ Guardando...' : '💾 Guardar Configuración'}</button>
            <button onClick={() => router.back()} style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Cancelar</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(PaymentConfigAdmin)
