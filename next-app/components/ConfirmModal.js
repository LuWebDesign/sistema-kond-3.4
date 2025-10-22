import React, { useEffect } from 'react'

export default function ConfirmModal({ open, onClose, message = 'Cambios guardados correctamente', autoCloseMs = 2200 }) {
  useEffect(() => {
    if (!open) return
    if (autoCloseMs > 0) {
      const t = setTimeout(() => { onClose && onClose() }, autoCloseMs)
      return () => clearTimeout(t)
    }
  }, [open, autoCloseMs, onClose])

  if (!open) return null

  return (
    <div className="confirm-modal" role="dialog" aria-modal="true">
      <div className="confirm-modal__backdrop" onClick={() => onClose && onClose()} />
      <div className="confirm-modal__box" aria-live="polite">
        <div className="confirm-modal__icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#0f172a" />
            <path d="M7 13.5l2.5 2.5L17 8.5" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="confirm-modal__content">
          <div className="confirm-modal__title">¡Listo!</div>
          <div className="confirm-modal__message">{message}</div>
        </div>
        <button className="confirm-modal__close" onClick={() => onClose && onClose()} aria-label="Cerrar">OK</button>
      </div>
    </div>
  )
}
