import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Layout({ children, title = 'Sistema KOND' }) {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: 240,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '20px'
          }}>
            Sistema KOND
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/" style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              🏠 Dashboard
            </Link>
            
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginTop: '16px',
              marginBottom: '8px',
              paddingLeft: '16px'
            }}>
              Catálogo y Ventas
            </div>
            
            <Link href="/catalog" style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              🛍️ Catálogo Público
            </Link>
            
            <Link href="/orders" style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              📦 Gestión de Pedidos
            </Link>
            
            <Link href="/tracking" style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              � Seguimiento
            </Link>

            <div style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginTop: '16px',
              marginBottom: '8px',
              paddingLeft: '16px'
            }}>
              Administración
            </div>
            
            <Link href="/user" style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              👤 Mi Cuenta
            </Link>
            
            <Link href="/marketing" style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}>
              🎯 Marketing
            </Link>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button
              onClick={toggleTheme}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          background: 'var(--bg-primary)',
          overflow: 'auto'
        }}>
          {children}
        </main>
      </div>
    </>
  )
}
