import React, { useEffect } from 'react'

export default function ConfirmModal({ open, onClose, message = 'Cambios guardados correctamente', autoCloseMs = 2200, type = 'success' }) {
  useEffect(() => {
    if (!open) return
    if (autoCloseMs > 0) {
      const t = setTimeout(() => { onClose && onClose() }, autoCloseMs)
      return () => clearTimeout(t)
    }
  }, [open, autoCloseMs, onClose])

  if (!open) return null

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '✅'
    }
  }

  const getColor = (type) => {
    switch (type) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#3b82f6'
      default: return '#10b981'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '2rem',
            color: getColor(type)
          }}>
            {getIcon(type)}
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              ¡Listo!
            </h3>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 24px'
        }}>
          <p style={{
            margin: 0,
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: getColor(type),
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1'
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

// Estilos CSS para el ConfirmModal
const styles = `
  :root {
    --bg-card: #334155;
    --border-color: rgba(148, 163, 184, 0.1);
    --shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
  }

  @media (prefers-color-scheme: light) {
    :root {
      --bg-card: #ffffff;
      --border-color: #e2e8f0;
      --shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      --text-primary: #1e293b;
      --text-secondary: #64748b;
    }
  }
`

// Inyectar estilos si no existen
if (typeof document !== 'undefined' && !document.getElementById('confirm-modal-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'confirm-modal-styles'
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
