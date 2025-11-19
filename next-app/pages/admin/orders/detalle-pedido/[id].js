import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'

function DetallePedido() {
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    // Redirigir a la página principal de orders con el modal abierto
    if (id) {
      router.replace({
        pathname: '/admin/orders',
        query: { modal: 'detalle', id: id }
      }, '/admin/orders', { shallow: true })
    }
  }, [id, router])

  return (
    <Layout title="Detalle de Pedido - Sistema KOND">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Cargando detalle del pedido...</div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(DetallePedido)