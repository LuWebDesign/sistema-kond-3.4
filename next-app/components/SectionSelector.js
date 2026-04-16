import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useCart } from '../hooks/useCatalog'

export default function SectionSelector({ className, style }) {
  const router = useRouter()
  const { totalItems } = useCart()
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    try {
      const u = localStorage.getItem('currentUser')
      if (u) setCurrentUser(JSON.parse(u))
      else setCurrentUser(null)
    } catch (e) {
      setCurrentUser(null)
    }
  }, [])

  return (
    <div className={className} style={{ display: 'flex', gap: '8px', background: 'var(--bg-section)', padding: '4px', borderRadius: 8, marginLeft: 12, ...style }}>
      <button
        onClick={() => router.push('/catalog')}
        style={{ background: 'var(--kond-btn-bg, var(--accent-blue))', color: 'var(--kond-btn-color, white)', border: 'none', borderRadius: 'var(--kond-btn-radius, 6px)', padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
      >
        Catálogo
      </button>

      {currentUser && (
        <button
          onClick={() => router.push('/catalog/mis-pedidos')}
          style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Mis Pedidos
        </button>
      )}

      <button
        onClick={() => router.push('/catalog/user')}
        style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
      >
        {currentUser ? 'Mi Cuenta' : 'Iniciar sesión'}
      </button>

      <button
        onClick={() => router.push('/catalog/mi-carrito')}
        style={{ position: 'relative', background: 'transparent', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        🛒 Carrito
        {totalItems > 0 && (
          <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>{totalItems}</span>
        )}
      </button>
    </div>
  )
}
