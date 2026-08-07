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

  const baseBtn = { border: '1px solid transparent', borderRadius: '3px', padding: '8px 12px', minHeight: 36, minWidth: 82, whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 150ms ease, color 150ms ease, background 150ms ease' }
  const activeStyle = { background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--text-secondary)' }
  const inactiveStyle = { background: 'transparent', color: 'var(--text-secondary)' }

  const navigateTo = (path) => router.push(path)
  const prefetch = (path) => { if (router.prefetch) router.prefetch(path) }

  return (
    <div className={className} style={{ display: 'flex', width: 384, maxWidth: '100%', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--bg-section)', padding: '4px', minHeight: 44, borderRadius: 8, ...style }}>
      <button
        onClick={() => navigateTo('/home')}
        onMouseEnter={() => prefetch('/home')}
        aria-current={isHome ? 'page' : undefined}
        style={{ ...baseBtn, ...(isHome ? activeStyle : inactiveStyle) }}
      >
        Home
      </button>

      <button
        onClick={() => navigateTo('/catalog')}
        onMouseEnter={() => prefetch('/catalog')}
        aria-current={isCatalog ? 'page' : undefined}
        style={{ ...baseBtn, ...(isCatalog ? activeStyle : inactiveStyle) }}
      >
        Catálogo
      </button>

      {mounted && currentUser ? (
        <button
          onClick={() => router.push('/catalog/mis-pedidos')}
          aria-current={isMisPedidos ? 'page' : undefined}
          style={{ ...baseBtn, minWidth: 100, ...(isMisPedidos ? activeStyle : inactiveStyle) }}
        >
          Mis Pedidos
        </button>
      ) : (
        <span aria-hidden="true" style={{ display: 'inline-block', width: 100, height: 36 }} />
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
