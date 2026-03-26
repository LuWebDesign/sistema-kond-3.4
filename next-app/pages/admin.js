import Layout from '../components/Layout'
import withAdminAuth from '../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { formatCurrency } from '../utils/catalogUtils'

function Admin() {
  const router = useRouter()
  const [systemStats, setSystemStats] = useState({
    totalProductos: 0,
    totalPedidos: 0,
    totalClientes: 0,
    balanceTotal: 0
  })
  
  return (
    <Layout title="Panel Administrativo - Sistema KOND">
      <div className="admin-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Accesos Rápidos reducido: solo Métodos de Pago */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{
            color: 'var(--text-primary)',
            margin: '0 0 20px 0',
            fontSize: '1.1rem'
          }}>
            🚀 Accesos Rápidos
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)',
              background: 'var(--bg-section)'
            }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>💳 Métodos de Pago</h4>
              <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Espacio para configurar transferencia, WhatsApp y retiro.
              </p>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => router.push('/admin/payment-config')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--accent-blue)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Configurar Métodos de Pago
                </button>
              </div>
            </div>

            {/* Placeholder: espacio reservado para futuro contenido relacionado */}
            <div style={{ height: 120, borderRadius: 8, background: 'transparent' }} />
          </div>
        </div>
          {/* Información del Usuario */}
          <div className="admin-card" style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, var(--person-color), var(--accent-blue))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: 'white'
              }}>
                👤
              </div>
              <div>
                <h3 style={{
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontSize: '1.2rem'
                }}>
                  Administrador KOND
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0 0',
                  fontSize: '0.9rem'
                }}>
                  admin1
                </p>
                <span style={{
                  background: 'var(--accent-secondary)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  Activo
                </span>
              </div>
            </div>

            <div className="admin-user-details" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  marginBottom: '4px'
                }}>
                  Último acceso
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  {new Date().toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  marginBottom: '4px'
                }}>
                  Rol
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Super Admin
                </div>
              </div>
              <div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  marginBottom: '4px'
                }}>
                  Permisos
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Completos
                </div>
              </div>
              <div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  marginBottom: '4px'
                }}>
                  Sesiones
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  1 activa
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas del Sistema */}
          <div className="admin-card" style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
              fontSize: '1.1rem'
            }}>
              📊 Resumen del Sistema
            </h3>

            <div className="admin-stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: 'var(--products-color)',
                  fontSize: '1.8rem',
                  fontWeight: 700
                }}>
                  {systemStats.totalProductos}
                </div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}>
                  Productos
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: 'var(--orders-color)',
                  fontSize: '1.8rem',
                  fontWeight: 700
                }}>
                  {systemStats.totalPedidos}
                </div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}>
                  Pedidos
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: 'var(--finances-color)',
                  fontSize: '1.8rem',
                  fontWeight: 700
                }}>
                  {systemStats.totalClientes}
                </div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}>
                  Clientes
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: 'var(--person-color)',
                  fontSize: '1.4rem',
                  fontWeight: 700
                }}>
                  {formatCurrency(systemStats.balanceTotal)}
                </div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}>
                  Balance
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información del Sistema y Credenciales */}
        <div className="admin-grid-secondary" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px'
        }}>
          {/* Información del Sistema eliminada por petición del administrador */}

          {/* Credenciales de Acceso */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{
              color: 'var(--text-primary)',
              margin: '0 0 20px 0',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔐 Credenciales de Acceso
            </h3>

            <div style={{
              background: 'var(--bg-section)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{
                color: 'var(--text-primary)',
                margin: '0 0 12px 0',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                👑 Administrador Principal
              </h4>
              <div style={{
                fontFamily: 'monospace',
                background: 'var(--bg-input)',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  marginBottom: '4px',
                  fontFamily: 'inherit'
                }}>
                  Usuario:
                </div>
                <div style={{
                  color: 'var(--accent-blue)',
                  fontWeight: 600,
                  marginBottom: '8px',
                  fontSize: '0.9rem'
                }}>
                  admin@kond.local
                </div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  marginBottom: '4px',
                  fontFamily: 'inherit'
                }}>
                  Contraseña:
                </div>
                <div style={{
                  color: 'var(--accent-blue)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  KondAdmin!2025
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <button
                  onClick={() => navigator.clipboard.writeText('admin@kond.local')}
                  style={{
                    flex: 1,
                    background: 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  📋 Copiar Usuario
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText('KondAdmin!2025')}
                  style={{
                    flex: 1,
                    background: 'var(--accent-secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  📋 Copiar Contraseña
                </button>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{
                color: 'var(--accent-blue)',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🔒 Información de Seguridad
              </div>
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                marginBottom: '12px'
              }}>
                Estas credenciales se utilizan para acceder al sistema administrativo desde la página de inicio (<code>/home</code>).
                Se recomienda cambiar la contraseña periódicamente por seguridad.
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Acceso completo a todas las funciones administrativas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span>Gestión de productos, pedidos y usuarios</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#f59e0b' }}>⚠</span>
                  <span>No compartir estas credenciales</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{
            color: 'var(--text-primary)',
            margin: '0 0 20px 0',
            fontSize: '1.1rem'
          }}>
            🚀 Accesos Rápidos
          </h3>

          <div className="quick-access-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <button
              onClick={() => router.push('/admin/products')}
              style={{
                background: 'var(--bg-section)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-section)'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🏷️</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Productos</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Gestionar inventario
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/orders')}
              style={{
                background: 'var(--bg-section)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-section)'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📦</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Pedidos</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Gestionar órdenes
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/calendar')}
              style={{
                background: 'var(--bg-section)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-section)'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📅</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Calendario</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Programar producción
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                background: 'var(--bg-section)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-section)'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Dashboard</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Ver métricas generales
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/payment-config')}
              style={{
                background: 'var(--bg-section)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-section)'}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💳</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Métodos de Pago</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Configurar transferencia, WhatsApp y retiro
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .admin-container {
            padding: 12px !important;
          }

          .admin-header-section {
            flex-direction: column;
            align-items: stretch !important;
          }

          .admin-header-section h1 {
            font-size: 1.5rem !important;
          }

          .admin-header-section p {
            font-size: 0.9rem !important;
          }

          .admin-header-buttons {
            justify-content: stretch;
          }

          .admin-header-buttons button {
            flex: 1;
            padding: 10px 16px !important;
            font-size: 0.85rem !important;
          }

          .admin-grid-main,
          .admin-grid-secondary {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .admin-card {
            padding: 16px !important;
          }

          .admin-user-details {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .admin-stats-grid {
            gap: 12px !important;
          }

          .admin-stats-grid > div > div:first-child {
            font-size: 1.5rem !important;
          }

          .quick-access-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .admin-container {
            padding: 8px !important;
          }

          .admin-header-section h1 {
            font-size: 1.3rem !important;
          }

          .admin-header-buttons button span:last-child {
            display: none;
          }

          .admin-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </Layout>
  )
}

export default withAdminAuth(Admin)