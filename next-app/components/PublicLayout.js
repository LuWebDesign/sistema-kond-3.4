import Link from 'next/link'
import { useState, useEffect } from 'react'
import NotificationsProvider from './NotificationsProvider'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'

export default function PublicLayout({ children, title = 'Catálogo - KOND' }) {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.body.className = savedTheme
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.body.className = newTheme
  }

  return (
    <NotificationsProvider>
      <title>{title}</title>
      
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header público */}
        <header style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Link href="/catalog" style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🏪 KOND
            </Link>
            
            <nav style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center'
            }}>
              <Link href="/catalog" style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                ':hover': {
                  background: 'var(--bg-hover)'
                }
              }}>
                🛍️ Catálogo
              </Link>
              
              <a href="/user-public.html" style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                👤 Mi Cuenta (Cliente)
              </a>
            </nav>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            {/* Notificaciones para usuario */}
            <NotificationsButton target="user" />
            
            {/* Botón de tema */}
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'var(--bg-section)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>


          </div>
        </header>

        {/* Panel de notificaciones para usuario */}
        <NotificationsPanel target="user" />

        {/* Main Content */}
        <main style={{
          minHeight: 'calc(100vh - 80px)',
          background: 'var(--bg-primary)'
        }}>
          {children}
        </main>

        {/* Footer público */}
        <footer style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          padding: '32px 20px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '32px',
              marginBottom: '24px'
            }}>
              <div>
                <h3 style={{
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  🏪 KOND
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.6
                }}>
                  Tu tienda de confianza para productos de calidad. 
                  Comprá fácil y seguro desde la comodidad de tu hogar.
                </p>
              </div>
              
              <div>
                <h4 style={{
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  Enlaces útiles
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <Link href="/catalog" style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    transition: 'color 0.2s'
                  }}>
                    Catálogo de productos
                  </Link>
                  <a href="/user-public.html" style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--accent-blue)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
                    Mi cuenta
                  </a>
                </div>
              </div>
              
              <div>
                <h4 style={{
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  Contacto
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}>
                  <div>📱 +54 11 1234-5678</div>
                  <div>📧 info@kond.com</div>
                  <div>📍 Buenos Aires, Argentina</div>
                </div>
              </div>
            </div>
            
            <div style={{
              paddingTop: '24px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.8rem'
            }}>
              <p>© 2025 KOND. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Variables CSS */}
      <style jsx global>{`
        :root {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-card: #334155;
          --bg-section: #475569;
          --bg-input: #1e293b;
          --bg-hover: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-muted: #94a3b8;
          --border-color: #475569;
          --accent-blue: #3b82f6;
          --accent-secondary: #10b981;
          --person-color: #8b5cf6;
          --orders-color: #f59e0b;
          --products-color: #06b6d4;
          --calendar-color: #84cc16;
          --database-color: #f97316;
          --finances-color: #eab308;
          --account-color: #6366f1;
        }

        body.light {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-card: #f1f5f9;
          --bg-section: #e2e8f0;
          --bg-input: #ffffff;
          --bg-hover: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #475569;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.3s ease;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        a:hover {
          color: var(--accent-blue);
        }

        /* Responsive */
        @media (max-width: 768px) {
          header nav {
            display: none !important;
          }
          
          header > div:first-child {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
      `}</style>
    </NotificationsProvider>
  )
}