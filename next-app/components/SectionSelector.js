import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useCart } from '../hooks/useCatalog'

export default function SectionSelector({ className, style }) {
  // Lightweight selector that derives the "active" state from the router path
  const router = useRouter()
  const { totalItems } = useCart()
  const [currentUser, setCurrentUser] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const u = localStorage.getItem('currentUser')
      if (u) setCurrentUser(JSON.parse(u))
      else setCurrentUser(null)
    } catch (e) {
      setCurrentUser(null)
    } finally {
      // mark mounted after attempting to read browser-only APIs so the
      // initial server/client render stays stable (avoids hydration mismatch)
      setMounted(true)
    }
  }, [])

  // Normalize path (strip query/hash)
  const path = (router?.asPath ?? '').split(/[?#]/)[0] || '/'

  // Determine which button should be active. We treat some specific
  // sub-routes as their own sections so "Catálogo" remains active on
  // category/product pages but not when user/mis-pedidos/mi-carrito are active.
  const isMisPedidos = path === '/catalog/mis-pedidos' || path.startsWith('/catalog/mis-pedidos/')
  const isUser = path === '/catalog/user' || path.startsWith('/catalog/user/')
  const isCarrito = path === '/catalog/mi-carrito' || path.startsWith('/catalog/mi-carrito/')
  const isCatalog = (path === '/catalog' || (path.startsWith('/catalog/') && !isMisPedidos && !isUser && !isCarrito))

  const baseBtn = { border: 'none', borderRadius: 'var(--kond-btn-radius, 6px)', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }
  const activeStyle = { background: 'var(--kond-btn-bg, var(--accent-blue))', color: 'var(--kond-btn-color, white)' }
  const inactiveStyle = { background: 'transparent', color: 'var(--text-secondary)' }

  return (
    <div className={className} style={{ display: 'flex', gap: '8px', background: 'var(--bg-section)', padding: '4px', borderRadius: 8, ...style }}>
      <button
        onClick={() => router.push('/catalog')}
        aria-current={isCatalog ? 'page' : undefined}
        style={{ ...baseBtn, ...(isCatalog ? activeStyle : inactiveStyle) }}
      >
        Catálogo
      </button>

      {mounted && currentUser && (
        <button
          onClick={() => router.push('/catalog/mis-pedidos')}
          aria-current={isMisPedidos ? 'page' : undefined}
          style={{ ...baseBtn, ...(isMisPedidos ? activeStyle : inactiveStyle) }}
        >
          Mis Pedidos
        </button>
      )}

      <button
        onClick={() => router.push('/catalog/user')}
        aria-current={isUser ? 'page' : undefined}
        style={{ ...baseBtn, ...(isUser ? activeStyle : inactiveStyle) }}
      >
        {mounted ? (currentUser ? 'Mi Cuenta' : 'Iniciar sesión') : 'Iniciar sesión'}
      </button>

      <button
        onClick={() => router.push('/catalog/mi-carrito')}
        aria-current={isCarrito ? 'page' : undefined}
        style={{ ...baseBtn, ...(isCarrito ? activeStyle : inactiveStyle), position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        🛒 Carrito
        {totalItems > 0 && (
          <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', marginLeft: 6 }}>{totalItems}</span>
        )}
      </button>
    </div>
  )
}
