import { useState, useEffect, useRef } from 'react'

export default function CollapsibleSection({ icon, title, defaultCollapsed = true, children, summary, onSave }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)
  const containerRef = useRef(null)

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
  }

  useEffect(() => {
    function handleDocClick(e) {
      if (!menuOpen) return
      if (menuRef.current && !menuRef.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [menuOpen])

  const doSave = async () => {
    if (typeof onSave === 'function') {
      try {
        await onSave()
      } catch (err) {
        console.error('CollapsibleSection onSave error:', err)
      }
    }
    // No colapsar: el botón Guardar de sección solo persiste datos, el usuario sigue editando
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      doSave()
    }
  }

  return (
    <div ref={containerRef} style={cardStyle} onKeyDown={handleKeyDown}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {!collapsed && (
            <button
              type="button"
              onClick={doSave}
              title="Guardar sección"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Guardar
            </button>
          )}

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen(s => !s)}
            aria-label="Más opciones"
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'var(--text-primary)'
            }}
          >
            ⋯
          </button>

          {menuOpen && (
            <div ref={menuRef} style={{ position: 'absolute', right: 0, top: '36px', zIndex: 1200 }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => { setCollapsed(false); setMenuOpen(false) }}
                  style={{ display: 'block', padding: '8px 14px', width: '160px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}
                >
                  Modificar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {collapsed ? (
        <div style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
          {summary || 'Sección cerrada. Haz clic en ⋯ → Modificar para editar.'}
        </div>
      ) : (
        <div style={{ marginTop: '16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}
