import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { getCurrentSession } from '../../utils/supabaseAuthV2'

const MiCuenta = () => {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const loadUser = async () => {
      const session = await getCurrentSession()
      if (session) {
        setCurrentUser(session.user)
      }
    }
    loadUser()
  }, [])

  return (
    <Layout title="Mi Cuenta - Panel Admin">
      <div style={{ padding: '24px 20px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Mi Cuenta
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentUser?.rol === 'admin' ? 'Administrador' : 'Usuario'} &bull; {currentUser?.email}
          </p>
        </div>

        {/* Información del Perfil (resumen) */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Información del Perfil</h3>
              <p style={{ fontSize: '0.8rem', margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>Gestiona tus datos personales</p>
            </div>
            <div>
              <a href="/admin/mi-cuenta/info-perfil" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                  Abrir Información
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Seguridad y credenciales (resumen) */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Seguridad y Credenciales</h3>
              <p style={{ fontSize: '0.8rem', margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>Administrá credenciales y seguridad de tu cuenta!</p>
            </div>
            <div>
              <a href="/admin/mi-cuenta/security" style={{ textDecoration: 'none' }}>
                <button style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                  Abrir Seguridad
                </button>
              </a>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}

export default withAdminAuth(MiCuenta)
