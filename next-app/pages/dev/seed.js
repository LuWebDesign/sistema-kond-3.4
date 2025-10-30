import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function DevSeed() {
  const router = useRouter()
  const [status, setStatus] = useState('inicializando')

  useEffect(() => {
    try {
      const sample = [
        {
          id: 1001,
          nombre: 'Cartel Happy birthday',
          categoria: 'Decoracion',
          tipo: 'Venta',
          medidas: '30x20 cm',
          tiempoUnitario: '00:10:00',
          publicado: true,
          hiddenInProductos: false,
          unidadesPorPlaca: 1,
          usoPlacas: 1,
          costoPlaca: 1000,
          costoMaterial: 500,
          precioUnitario: 2500,
          imagen: '',
          descripcion: 'Cartel decorativo para fiestas. Ejemplo de producto de prueba.'
        },
        {
          id: 1002,
          nombre: 'Tarjeta de Mesa',
          categoria: 'Papeleria',
          tipo: 'Venta',
          medidas: '10x7 cm',
          tiempoUnitario: '00:05:00',
          publicado: true,
          hiddenInProductos: false,
          unidadesPorPlaca: 10,
          usoPlacas: 1,
          costoPlaca: 200,
          costoMaterial: 50,
          precioUnitario: 350,
          imagen: '',
          descripcion: 'Tarjeta de mesa de ejemplo para pruebas.'
        }
      ]

      localStorage.setItem('productosBase', JSON.stringify(sample))
      // También prefill para currentUser (checkout)
      const user = {
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '+5491123456789',
        email: 'juan.perez@example.com',
        direccion: 'CABA, Argentina'
      }
      localStorage.setItem('currentUser', JSON.stringify(user))

      setStatus('ok')
    } catch (err) {
      console.error('Error al sembrar datos de dev:', err)
      setStatus('error')
    }
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Dev seed: datos de ejemplo</h1>
      <p>Esta página siembra datos de ejemplo en <code>localStorage</code> para pruebas locales.</p>
      <p>Estado: <strong>{status}</strong></p>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button
          onClick={() => router.push('/catalog')}
          style={{ padding: '8px 12px', cursor: 'pointer' }}
        >
          Ir al catálogo
        </button>

        <button
            onClick={() => router.push('/catalog/Decoracion/Cartel-Happy-birthday')}
          style={{ padding: '8px 12px', cursor: 'pointer' }}
        >
          Abrir producto de ejemplo
        </button>

        <button
          onClick={() => router.push('/catalog/mi-carrito/finalizar-compra')}
          style={{ padding: '8px 12px', cursor: 'pointer' }}
        >
          Abrir checkout (ruta amigable)
        </button>
      </div>

      <hr style={{ margin: '18px 0' }} />

      <p style={{ color: '#666' }}>Notas:</p>
      <ul>
        <li>Esta página solo debe usarse en desarrollo local.</li>
        <li>Si quieres limpiar los datos, abre DevTools → Application → Local Storage y borra las claves <code>productosBase</code> y <code>currentUser</code>.</li>
      </ul>
    </div>
  )
}
