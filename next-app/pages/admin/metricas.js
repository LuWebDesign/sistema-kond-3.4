import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import Link from 'next/link'
import styles from '../../styles/metricas.module.css'

function MetricasHub() {
  const cards = [
    {
      title: '📊 Métricas de Pedidos',
      description: 'Resumen de pedidos, estados, pagos, facturación y comparación mensual.',
      href: '/admin/metricas-pedidos',
      color: '#3b82f6'
    },
    {
      title: '📦 Métricas de Productos',
      description: 'Rentabilidad, eficiencia, rankings, análisis por categoría y promociones.',
      href: '/admin/metricas-productos',
      color: '#8b5cf6'
    }
  ]

  return (
    <Layout title="Métricas - Sistema KOND">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>📈 Centro de Métricas</h1>
          <p className={styles.subtitle}>Seleccioná un área para ver métricas detalladas</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginTop: '24px'
        }}>
          {cards.map((card, i) => (
            <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '32px',
                border: '2px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '180px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = card.color
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${card.color}22`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              >
                <h2 style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}>{card.title}</h2>
                <p style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  margin: 0
                }}>{card.description}</p>
                <span style={{
                  marginTop: '16px',
                  color: card.color,
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>Ver métricas →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(MetricasHub)
