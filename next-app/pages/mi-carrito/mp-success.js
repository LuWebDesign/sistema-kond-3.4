import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import PublicLayout from '../../components/PublicLayout'
import { supabase } from '../../supabase/client'
import { TENANT_ID } from '../../lib/tenant'

export default function MpSuccessPage() {
  const router = useRouter()
  const { payment_id, preference_id } = router.query

  const emailSentRef = useRef(false)
  const [pedido, setPedido] = useState(null)

  // Effect 1: query pedidos_catalogo when preference_id is available
  useEffect(() => {
    if (!preference_id) return
    supabase
      .from('pedidos_catalogo')
      .select('id')
      .eq('mp_preference_id', preference_id)
      .eq('tenant_id', TENANT_ID)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setPedido(data)
      })
  }, [preference_id])

  // Effect 2: fire email once when pedido.id is available
  useEffect(() => {
    if (!pedido?.id || emailSentRef.current) return
    emailSentRef.current = true
    fetch('/api/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: pedido.id, nuevoEstado: 'recibido_mp' })
    }).catch(err => console.warn('[email] MP email failed:', err))
  }, [pedido])

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
