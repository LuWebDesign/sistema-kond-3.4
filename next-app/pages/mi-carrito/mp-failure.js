import { useRouter } from 'next/router'
import PublicLayout from '../../components/PublicLayout'

export default function MpFailurePage() {
  const router = useRouter()

  return (
    <PublicLayout title="Pago no procesado - KOND">
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>❌</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          El pago no pudo procesarse
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          Podés intentar nuevamente o elegir otro método de pago.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/mi-carrito/finalizar-compra')}
            style={{ padding: '12px 24px', borderRadius: 8, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => router.push('/catalog')}
            style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500, fontSize: '1rem' }}
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    </PublicLayout>
  )
}
