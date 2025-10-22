import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'
import NotificationsProvider from './NotificationsProvider'

export default function Layout({ children, title = 'Sistema KOND' }) {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.body.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <NotificationsProvider>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: 260,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            🏭 Sistema KOND
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Dashboard */}
            <Link href="/" style={linkStyle}>
              🏠 Inicio
            </Link>
            
            {/* Sección: Gestión Interna */}
            <div style={sectionDividerStyle}>
              Gestión Interna
            </div>
            
            <Link href="/products" style={linkStyle}>
              🏷️ Productos
            </Link>
            
            <Link href="/calendar" style={linkStyle}>
              📅 Calendario
            </Link>
            
            <Link href="/database" style={linkStyle}>
              🗄️ Base de Datos
            </Link>
            
            {/* Sección: Catálogo y Ventas */}
            <div style={sectionDividerStyle}>
              Catálogo y Ventas
            </div>
            
            <a 
              href="/catalog" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{...linkStyle, display: 'flex', alignItems: 'center', gap: '8px'}}
            >
              🛍️ Catálogo Público
              <span style={{fontSize: '0.7rem', opacity: 0.7}}>↗</span>
            </a>
            
            <Link href="/pedidos" style={linkStyle}>
              📦 Pedidos Internos
            </Link>
            
            <Link href="/pedidos-catalogo" style={linkStyle}>
              🛒 Pedidos Catálogo
            </Link>
            
            <Link href="/marketing" style={linkStyle}>
              🎯 Marketing
            </Link>
            
            <Link href="/finanzas" style={linkStyle}>
              💰 Finanzas
            </Link>
            
            {/* Sección: Administración */}
            <div style={sectionDividerStyle}>
              Administración
            </div>
            
            <Link href="/admin" style={linkStyle}>
              👤 Panel Admin
            </Link>
          </nav>

          {/* Theme Toggle */}
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
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--bg-card)'
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
          overflow: 'auto',
          minHeight: '100vh',
          position: 'relative'
        }}>
          {/* Header con notificaciones */}
          <div style={{
            position: 'sticky',
            top: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 20px',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <NotificationsButton target="admin" />
          </div>
          
          {children}
          <NotificationsPanel target="admin" />
        </main>
      </div>
      
      {/* Variables CSS */}
      <style jsx global>{`
        :root {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-card: #334155;
          --bg-tertiary: #475569;
          --bg-hover: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-tertiary: #64748b;
          --text-muted: #64748b;
          --border-color: #334155;
          --accent-blue: #3b82f6;
          --accent-green: #10b981;
          --accent-orange: #f59e0b;
          --accent-red: #ef4444;
          --person-color: #60a5fa;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        [data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-card: #f1f5f9;
          --bg-tertiary: #e2e8f0;
          --bg-hover: #e2e8f0;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-tertiary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-blue: #3b82f6;
          --accent-green: #10b981;
          --accent-orange: #f59e0b;
          --accent-red: #ef4444;
          --person-color: #2563eb;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          margin: 0;
          padding: 0;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        * {
          box-sizing: border-box;
        }

        /* Scrollbar personalizada */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg-secondary);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        /* Animaciones suaves */
        a, button {
          transition: all 0.2s ease;
        }

        /* Responsive */
        @media (max-width: 768px) {
          aside {
            width: 200px !important;
          }
        }

        @media (max-width: 600px) {
          aside {
            position: fixed !important;
            top: 0;
            left: -260px;
            width: 260px !important;
            height: 100vh;
            z-index: 1000;
            transition: left 0.3s ease;
          }
        }
      `}</style>
    </NotificationsProvider>
  )
}

// Estilos para enlaces del sidebar
const linkStyle = {
  padding: '10px 16px',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  background: 'transparent',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '0.95rem',
  fontWeight: '500'
}

// Estilo para divisores de sección
const sectionDividerStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginTop: '20px',
  marginBottom: '8px',
  paddingLeft: '16px',
  paddingBottom: '4px',
  borderBottom: '1px solid var(--border-color)'
}