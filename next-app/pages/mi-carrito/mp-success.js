import { useRouter } from 'next/router'
import PublicLayout from '../../components/PublicLayout'

export default function MpSuccessPage() {
  const router = useRouter()
  const { payment_id, preference_id } = router.query

  return (
    <PublicLayout title="Pago aprobado - KOND">
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          ¡Pago aprobado!
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Tu pedido fue confirmado.
        </p>
        {payment_id && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            N° de pago: <span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>{payment_id}</span>
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
          <button
            onClick={() => router.push('/catalog/mis-pedidos')}
            style={{ padding: '12px 24px', borderRadius: 8, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
          >
            Ver mis pedidos
          </button>
          <button
            onClick={() => router.push('/catalog')}
            style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500, fontSize: '1rem' }}
          >
            Seguir comprando
          </button>
        </div>
      </div>
    </PublicLayout>
  )
}
