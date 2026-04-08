import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect, useRef } from 'react'
import { getCatalogStyles, saveCatalogStyles, DEFAULT_STYLES } from '../../utils/supabaseCatalogStyles'

function CatalogStylesAdmin() {
  const [styles, setStyles] = useState(DEFAULT_STYLES)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')
  const [activeSection, setActiveSection] = useState('header')
  const logoInputRef = useRef(null)

  useEffect(() => {
    loadStyles()
  }, [])

  const loadStyles = async () => {
    setIsLoading(true)
    try {
      const loaded = await getCatalogStyles()
      if (loaded) setStyles(loaded)
    } catch (error) {
      console.error('Error al cargar estilos:', error)
      setSaveMessage('❌ Error al cargar los estilos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      const result = await saveCatalogStyles(styles)
      if (result && result.success) {
        if (result.normalized && Array.isArray(result.normalized) && result.normalized.length > 0) {
          setSaveMessage(`✅ Estilos guardados. ⚠️ Se normalizaron: ${result.normalized.join(', ')}`)
        } else {
          setSaveMessage('✅ Estilos guardados exitosamente')
        }
        setTimeout(() => setSaveMessage(''), 5000)
      } else {
        setSaveMessage(`❌ ${result?.error || 'Error al guardar'}`)
      }
    } catch (error) {
      console.error('Error al guardar estilos:', error)
      setSaveMessage(`❌ ${error?.message || String(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setStyles(DEFAULT_STYLES)
    setSaveMessage('⚠️ Valores restablecidos. Guarda para aplicar.')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const updateStyle = (key, value) => {
    setStyles(prev => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setSaveMessage('❌ La imagen del logo no debe superar 500KB')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      updateStyle('logoUrl', ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  if (isLoading) {
    return (
      <Layout title="Personalizar Catálogo - Sistema KOND">
        <div style={{ padding: 20 }}>Cargando estilos...</div>
      </Layout>
    )
  }

  const sections = [
    { id: 'header', label: '📌 Header y Logo', icon: '📌' },
    { id: 'footer', label: '📝 Footer', icon: '📝' },
    { id: 'banner', label: '📢 Banner', icon: '📢' },
    { id: 'layout', label: '🔲 Layout', icon: '🔲' },
    { id: 'whatsapp', label: '💬 WhatsApp', icon: '💬' },
  ]

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-input, var(--bg-secondary))',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  }

  const colorFieldStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }

  const colorInputStyle = {
    width: '44px',
    height: '44px',
    padding: '2px',
    border: '2px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'transparent',
  }

  const fieldGroup = {
    marginBottom: '20px',
  }

  const saveMessageStyle = {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    background: saveMessage.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : saveMessage.includes('⚠️') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    border: saveMessage.includes('✅') ? '1px solid rgba(16, 185, 129, 0.3)' : saveMessage.includes('⚠️') ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
    color: saveMessage.includes('✅') ? '#10b981' : saveMessage.includes('⚠️') ? '#f59e0b' : '#ef4444',
    fontWeight: 500,
  }

  // Preview mini del catálogo
  const previewAccent = styles.accentColor || '#3b82f6'
  const previewBtnBg = styles.buttonBg || previewAccent
  const previewBtnColor = styles.buttonTextColor || '#ffffff'
  const previewHeaderBg = styles.headerBg || 'var(--bg-card)'
  const previewCardBg = styles.cardBg || 'var(--bg-card)'

  return (
    <Layout title="Personalizar Catálogo - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🎨 Personalizar Catálogo</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Personaliza los colores, textos y estilos del catálogo público
          </p>
        </div>

        {saveMessage && <div style={saveMessageStyle}>{saveMessage}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
          {/* Panel de edición */}
          <div>
            {/* Tabs de secciones */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSection === s.id ? previewAccent : 'transparent',
                    color: activeSection === s.id ? '#fff' : 'var(--text-secondary)',
                    fontWeight: activeSection === s.id ? 600 : 400,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Sección Header */}
            {activeSection === 'header' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem' }}>📌 Header y Logo</h3>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Texto del logo</label>
                  <input type="text" value={styles.logoText || ''} onChange={(e) => updateStyle('logoText', e.target.value)} placeholder="KOND" style={inputStyle} />
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Imagen del logo (opcional, max 500KB)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {styles.logoUrl && (
                      <img src={styles.logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                    )}
                    <button onClick={() => logoInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      {styles.logoUrl ? 'Cambiar' : 'Subir imagen'}
                    </button>
                    {styles.logoUrl && (
                      <button onClick={() => updateStyle('logoUrl', '')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--accent-red, #ef4444)', background: 'transparent', color: 'var(--accent-red, #ef4444)', cursor: 'pointer' }}>
                        Quitar
                      </button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </div>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Color de fondo del header</label>
                  <div style={colorFieldStyle}>
                    <input type="color" value={styles.headerBg || '#1e293b'} onChange={(e) => updateStyle('headerBg', e.target.value)} style={colorInputStyle} />
                    <input type="text" value={styles.headerBg || ''} onChange={(e) => updateStyle('headerBg', e.target.value)} placeholder="Vacío = tema por defecto" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Color del texto del header</label>
                  <div style={colorFieldStyle}>
                    <input type="color" value={styles.headerTextColor || '#ffffff'} onChange={(e) => updateStyle('headerTextColor', e.target.value)} style={colorInputStyle} />
                    <input type="text" value={styles.headerTextColor || ''} onChange={(e) => updateStyle('headerTextColor', e.target.value)} placeholder="Vacío = tema por defecto" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Sección Footer */}
            {activeSection === 'footer' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem' }}>📝 Footer</h3>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Color de fondo del footer</label>
                  <div style={colorFieldStyle}>
                    <input type="color" value={styles.footerBg || '#1e293b'} onChange={(e) => updateStyle('footerBg', e.target.value)} style={colorInputStyle} />
                    <input type="text" value={styles.footerBg || ''} onChange={(e) => updateStyle('footerBg', e.target.value)} placeholder="Vacío = tema por defecto" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Color del texto del footer</label>
                  <div style={colorFieldStyle}>
                    <input type="color" value={styles.footerTextColor || '#94a3b8'} onChange={(e) => updateStyle('footerTextColor', e.target.value)} style={colorInputStyle} />
                    <input type="text" value={styles.footerTextColor || ''} onChange={(e) => updateStyle('footerTextColor', e.target.value)} placeholder="Vacío = tema por defecto" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Descripción</label>
                  <textarea value={styles.footerDescription || ''} onChange={(e) => updateStyle('footerDescription', e.target.value)} placeholder="Tu tienda de confianza..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>📱 Teléfono</label>
                    <input type="text" value={styles.footerPhone || ''} onChange={(e) => updateStyle('footerPhone', e.target.value)} placeholder="+54 11 1234-5678" style={inputStyle} />
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>📧 Email</label>
                    <input type="text" value={styles.footerEmail || ''} onChange={(e) => updateStyle('footerEmail', e.target.value)} placeholder="info@kond.com" style={inputStyle} />
                  </div>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>📍 Dirección</label>
                  <input type="text" value={styles.footerAddress || ''} onChange={(e) => updateStyle('footerAddress', e.target.value)} placeholder="Buenos Aires, Argentina" style={inputStyle} />
                </div>
              </div>
            )}

            {/* Sección Banner */}
            {activeSection === 'banner' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem' }}>📢 Banner Superior</h3>

                <div style={{ ...fieldGroup, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Mostrar banner</label>
                  <button
                    onClick={() => updateStyle('bannerEnabled', !styles.bannerEnabled)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: styles.bannerEnabled ? 'rgba(16,185,129,0.1)' : 'transparent',
                      color: styles.bannerEnabled ? '#10b981' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {styles.bannerEnabled ? '✅ Activo' : 'Inactivo'}
                  </button>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Texto del banner</label>
                  <input type="text" value={styles.bannerText || ''} onChange={(e) => updateStyle('bannerText', e.target.value)} placeholder="🔥 ¡Ofertas de temporada! Hasta 30% de descuento" style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Color de fondo</label>
                    <div style={colorFieldStyle}>
                      <input type="color" value={styles.bannerBg || '#3b82f6'} onChange={(e) => updateStyle('bannerBg', e.target.value)} style={colorInputStyle} />
                      <input type="text" value={styles.bannerBg || ''} onChange={(e) => updateStyle('bannerBg', e.target.value)} placeholder="#3b82f6" style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Color del texto</label>
                    <div style={colorFieldStyle}>
                      <input type="color" value={styles.bannerTextColor || '#ffffff'} onChange={(e) => updateStyle('bannerTextColor', e.target.value)} style={colorInputStyle} />
                      <input type="text" value={styles.bannerTextColor || ''} onChange={(e) => updateStyle('bannerTextColor', e.target.value)} placeholder="#ffffff" style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                </div>

                {styles.bannerEnabled && styles.bannerText && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: styles.bannerBg || '#3b82f6', color: styles.bannerTextColor || '#fff', borderRadius: '8px', textAlign: 'center', fontWeight: 500, fontSize: '0.95rem' }}>
                    {styles.bannerText}
                  </div>
                )}
              </div>
            )}

            {/* Sección Layout */}
            {activeSection === 'layout' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>🔲 Columnas del catálogo</h3>
                <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Elegí cuántos productos se muestran por fila en el catálogo público. Se aplica en pantallas grandes; en mobile siempre se adapta automáticamente.
                </p>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Columnas por fila</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[3, 4, 5, 6].map(col => {
                      const isActive = (Number(styles.gridColumns) || 3) === col
                      return (
                        <button
                          key={col}
                          onClick={() => updateStyle('gridColumns', col)}
                          style={{
                            width: '72px',
                            padding: '16px 8px',
                            borderRadius: '10px',
                            border: isActive ? `2px solid ${previewAccent}` : '2px solid var(--border-color)',
                            background: isActive ? `${previewAccent}18` : 'var(--bg-secondary)',
                            color: isActive ? previewAccent : 'var(--text-secondary)',
                            fontWeight: isActive ? 700 : 400,
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{col}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>cols</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  💡 Actualmente: <strong style={{ color: 'var(--text-primary)' }}>{Number(styles.gridColumns) || 3} columnas</strong> — recordá guardar los cambios para que se apliquen en el catálogo.
                </div>
              </div>
            )}

            {/* Sección WhatsApp */}
            {activeSection === 'whatsapp' && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>💬 Botón flotante de WhatsApp</h3>
                <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Muestra un botón fijo en la esquina inferior derecha del catálogo para que los clientes te contacten directamente por WhatsApp.
                </p>

                <div style={{ ...fieldGroup, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Mostrar botón</label>
                  <div
                    onClick={() => updateStyle('whatsappEnabled', !styles.whatsappEnabled)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    {/* Toggle track */}
                    <div style={{
                      position: 'relative', width: '48px', height: '26px',
                      borderRadius: '13px',
                      background: styles.whatsappEnabled ? '#25d366' : 'var(--border-color)',
                      transition: 'background 0.25s',
                      flexShrink: 0,
                    }}>
                      {/* Toggle thumb */}
                      <div style={{
                        position: 'absolute', top: '3px',
                        left: styles.whatsappEnabled ? '25px' : '3px',
                        width: '20px', height: '20px',
                        borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                        transition: 'left 0.25s',
                      }} />
                    </div>
                    {/* Label */}
                    <span style={{
                      fontSize: '0.875rem', fontWeight: 600,
                      color: styles.whatsappEnabled ? '#25d366' : 'var(--text-secondary)',
                      transition: 'color 0.25s',
                    }}>
                      {styles.whatsappEnabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Número de WhatsApp</label>
                  <input
                    type="text"
                    value={styles.whatsappNumber || ''}
                    onChange={(e) => updateStyle('whatsappNumber', e.target.value)}
                    placeholder="5491112345678 (código de país + número, sin + ni espacios)"
                    style={inputStyle}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    Ejemplo Argentina: 5491112345678
                  </span>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Mensaje predeterminado</label>
                  <textarea
                    value={styles.whatsappMessage || ''}
                    onChange={(e) => updateStyle('whatsappMessage', e.target.value)}
                    placeholder="Hola! Me gustaría consultar sobre sus productos."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                {styles.whatsappEnabled && styles.whatsappNumber && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(37,211,102,0.08)', borderRadius: '8px', border: '1px solid rgba(37,211,102,0.25)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    📱 Vista previa del enlace:{' '}
                    <a
                      href={`https://wa.me/${styles.whatsappNumber}?text=${encodeURIComponent(styles.whatsappMessage || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#25d366', fontWeight: 500 }}
                    >
                      wa.me/{styles.whatsappNumber}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 24px', borderRadius: '8px', background: isSaving ? 'var(--text-secondary)' : previewAccent, color: '#fff', border: 'none', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
                {isSaving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
              </button>
              <button onClick={handleReset} style={{ padding: '12px 24px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.95rem' }}>
                🔄 Restablecer
              </button>
              <a href="/catalog" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 24px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.95rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👁️ Ver Catálogo ↗
              </a>
            </div>
          </div>

          {/* Preview en vivo */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Vista previa</span>
              </div>

              <div style={{ background: styles.catalogBg || 'var(--bg-primary)', minHeight: '400px', fontSize: '0.75rem' }}>
                {/* Banner preview */}
                {styles.bannerEnabled && styles.bannerText && (
                  <div style={{ padding: '6px 10px', background: styles.bannerBg || '#3b82f6', color: styles.bannerTextColor || '#fff', textAlign: 'center', fontSize: '0.7rem', fontWeight: 500 }}>
                    {styles.bannerText}
                  </div>
                )}

                {/* Header preview */}
                <div style={{ padding: '10px 14px', background: styles.headerBg || 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {styles.logoUrl ? (
                      <img src={styles.logoUrl} alt="Logo" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                    ) : null}
                    <span style={{ fontWeight: 700, color: styles.headerTextColor || previewAccent, fontSize: '0.9rem' }}>
                      {styles.logoText || 'KOND'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: styles.headerTextColor || 'var(--text-primary)', fontSize: '0.65rem' }}>Catálogo</span>
                    <span style={{ color: styles.headerTextColor || 'var(--text-secondary)', fontSize: '0.65rem' }}>Mi Cuenta</span>
                  </div>
                </div>

                {/* Products preview */}
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: styles.catalogTextColor || 'var(--text-primary)', marginBottom: '10px' }}>
                    🛒 Nuestros Productos
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(Number(styles.gridColumns) || 3, 2)}, 1fr)`, gap: '8px' }}>
                    {[1, 2].map(i => (
                      <div key={i} style={{ background: styles.cardBg || 'var(--bg-card)', border: `1px solid ${styles.cardBorderColor || 'var(--border-color)'}`, borderRadius: `${styles.cardRadius || 12}px`, overflow: 'hidden' }}>
                        <div style={{ background: 'var(--bg-secondary)', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>
                          📦
                        </div>
                        <div style={{ padding: '8px' }}>
                          {styles.badgeBg && (
                            <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: styles.badgeBg, color: styles.badgeTextColor || '#fff', fontSize: '0.6rem', marginBottom: '4px' }}>Categoría</span>
                          )}
                          <div style={{ fontWeight: 600, fontSize: '0.7rem', color: styles.catalogTextColor || 'var(--text-primary)' }}>Producto {i}</div>
                          <div style={{ color: previewAccent, fontWeight: 700, fontSize: '0.7rem', margin: '4px 0' }}>$1.500</div>
                          <button style={{ width: '100%', padding: '4px 8px', background: previewBtnBg, color: previewBtnColor, border: 'none', borderRadius: `${styles.buttonRadius || 12}px`, fontSize: '0.6rem', fontWeight: 600 }}>
                            Agregar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer preview */}
                <div style={{ padding: '10px 14px', background: styles.footerBg || 'var(--bg-card)', borderTop: '1px solid var(--border-color)', marginTop: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.7rem', color: styles.footerTextColor || 'var(--text-primary)', marginBottom: '4px' }}>{styles.logoText || 'KOND'}</div>
                  <div style={{ fontSize: '0.6rem', color: styles.footerTextColor || 'var(--text-secondary)' }}>
                    {styles.footerDescription ? styles.footerDescription.substring(0, 60) + '...' : 'Tu tienda de confianza...'}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: styles.footerTextColor || 'var(--text-tertiary)', marginTop: '4px' }}>
                    {styles.footerPhone && <span>📱 {styles.footerPhone} </span>}
                    {styles.footerEmail && <span>📧 {styles.footerEmail}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(CatalogStylesAdmin)
