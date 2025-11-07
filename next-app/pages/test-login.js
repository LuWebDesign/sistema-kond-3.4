// Página de prueba simple para depurar el login - v1.1
import { useState } from 'react'
import { loginWithEmail } from '../utils/supabaseAuthV2'

export default function TestLogin() {
  const [email, setEmail] = useState('admin@kond.local')
  const [password, setPassword] = useState('Admin123!')
  const [result, setResult] = useState(null)

  const handleTest = async () => {
    console.log('🧪 Iniciando test de login... v1.1')
    console.log('Email:', email)
    console.log('Password:', password)
    
    try {
      const response = await loginWithEmail(email, password)
      console.log('✅ Respuesta completa:', response)
      setResult(JSON.stringify(response, null, 2))
    } catch (error) {
      console.error('❌ Error capturado:', error)
      setResult(JSON.stringify({ error: error.message }, null, 2))
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Test de Login</h1>
      
      <div style={{ marginBottom: '10px' }}>
        <label>Email:</label><br />
        <input 
          type="text" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '300px', padding: '5px' }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Password:</label><br />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '300px', padding: '5px' }}
        />
      </div>

      <button 
        onClick={handleTest}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Probar Login
      </button>

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Resultado:</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}
