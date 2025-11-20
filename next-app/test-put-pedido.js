// Script de prueba para verificar el endpoint PUT de pedidos
// Ejecutar con: node test-put-pedido.js

const BASE_URL = 'http://localhost:3000'

async function testPutPedido() {
  // console.log('🧪 Probando PUT /api/pedidos/catalogo/[id]...\n')

  // Datos de prueba (ajusta el ID según un pedido existente en tu DB)
  const pedidoId = 13
  const updatePayload = {
    estado: 'confirmado',
    fechaProduccion: '2025-11-10',
    cliente: {
      nombre: 'Test',
      apellido: 'User Updated'
    },
    notas: 'Actualizado via script de prueba'
  }

  try {
    // console.log('📤 Enviando PUT a:', `${BASE_URL}/api/pedidos/catalogo/${pedidoId}`)
    // console.log('📦 Payload:', JSON.stringify(updatePayload, null, 2))
    // console.log('')

    const response = await fetch(`${BASE_URL}/api/pedidos/catalogo/${pedidoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    })

    // console.log('📥 Respuesta del servidor:')
    // console.log('   Status:', response.status, response.statusText)
    
    const data = await response.json()
    // console.log('   Body:', JSON.stringify(data, null, 2))

    if (response.ok) {
      // console.log('\n✅ PUT exitoso! El pedido se actualizó en Supabase')
    } else {
      // console.log('\n❌ PUT falló:', data.error || 'Error desconocido')
    }

  } catch (error) {
    console.error('\n❌ Error ejecutando la prueba:', error.message)
    console.error('   Asegúrate de que el servidor de desarrollo esté corriendo en', BASE_URL)
  }
}

// Ejecutar prueba
testPutPedido()
