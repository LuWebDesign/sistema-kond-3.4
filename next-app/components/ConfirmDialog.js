import React from 'react'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}) {
  if (!open) return null

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'success': return '✅'
      case 'info': return 'ℹ️'
      default: return '⚠️'
    }
  }

  const getColor = (type) => {
    switch (type) {
      case 'warning': return '#f59e0b'
      case 'error': return '#ef4444'
      case 'success': return '#10b981'
      case 'info': return '#3b82f6'
      default: return '#f59e0b'
    }
  }

  const handleConfirm = () => {
    onConfirm && onConfirm()
    onClose && onClose()
  }

  const handleCancel = () => {
    onClose && onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel()
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
      onClick={handleBackdropClick}
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
          overflow: 'hidden'
        }}
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
              {title}
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
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
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
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}