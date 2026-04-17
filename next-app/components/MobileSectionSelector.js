import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import styles from '../styles/catalog-responsive.module.css'
import { useCart } from '../hooks/useCatalog'

export default function MobileSectionSelector() {
  const router = useRouter()
  const { totalItems } = useCart()
  const [open, setOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const drawerRef = useRef(null)

  useEffect(() => {
    try {
      const u = localStorage.getItem('currentUser')
      if (u) setCurrentUser(JSON.parse(u))
    } catch (e) { /* ignore */ }
  }, [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
    return undefined
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const navigate = (path) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-controls="mobile-selector-drawer"
        className={styles.mobileSelectorButton}
        onClick={() => setOpen(true)}
        title="Abrir menú"
      >
        {/* simple hamburger icon */}
        <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
      </button>

      {/* Backdrop */}
      <div
        className={styles.mobileSelectorBackdrop}
        style={{ display: open ? 'block' : 'none' }}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="mobile-selector-drawer"
        ref={drawerRef}
        className={styles.mobileSelectorDrawer}
        role="dialog"
        aria-modal="true"
        style={{ transform: open ? 'translateX(0)' : 'translateX(110%)' }}
      >
        <div className={styles.mobileSelectorHeader}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Menú</div>
          <button onClick={() => setOpen(false)} className={styles.mobileSelectorClose} aria-label="Cerrar menú">✕</button>
        </div>

        <nav className={styles.mobileSelectorMenu}>
          <button className={styles.mobileSelectorItem} onClick={() => navigate('/catalog')}>Catálogo</button>
          <button className={styles.mobileSelectorItem} onClick={() => navigate('/catalog/user')}>{currentUser ? 'Mi cuenta' : 'Iniciar sesión'}</button>
          <button className={styles.mobileSelectorItem} onClick={() => navigate('/mi-carrito')}>
            <span>Mi carrito</span>
            {totalItems > 0 && <span className={styles.mobileSelectorCartBadge}>{totalItems}</span>}
          </button>
        </nav>
      </aside>
    </>
  )
}
