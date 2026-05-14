import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function SectionSelector({ className, style }) {
  // Lightweight selector that derives the "active" state from the router path
  const router = useRouter()
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
      setMounted(true)
    }
  }, [])

  // Normalize path (strip query/hash)
  const path = (router?.asPath ?? '').split(/[?#]/)[0] || '/'

  // Determine which button should be active.
  const isHome = path === '/home'
  const isMisPedidos = path === '/catalog/mis-pedidos' || path.startsWith('/catalog/mis-pedidos/')
  const isUser = path === '/catalog/user' || path.startsWith('/catalog/user/')
  const isCatalog = (path === '/catalog' || (path.startsWith('/catalog/') && !isMisPedidos && !isUser))

  const baseBtn = { border: 'none', borderRadius: 'var(--kond-btn-radius, 6px)', padding: '8px 12px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
  const activeStyle = { background: 'var(--kond-btn-bg, var(--accent-blue))', color: 'var(--kond-btn-color, white)' }
  const inactiveStyle = { background: 'transparent', color: 'var(--text-secondary)' }

  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--bg-section)', padding: '4px', borderRadius: 8, ...style }}>
      <button
        onClick={() => router.push('/home')}
        aria-current={isHome ? 'page' : undefined}
        style={{ ...baseBtn, ...(isHome ? activeStyle : inactiveStyle) }}
      >
        Home
      </button>

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
        {mounted ? (currentUser ? 'Mi Cuenta' : 'Mi Perfil') : 'Mi Perfil'}
      </button>
    </div>
  )
}
