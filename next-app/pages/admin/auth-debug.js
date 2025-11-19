import { useState, useEffect } from 'react';
import { getCurrentSession } from '../../utils/supabaseAuthV2';

export default function AuthDebug() {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getCurrentSession();
        setSessionInfo(session);

        // También mostrar localStorage
        if (typeof window !== 'undefined') {
          const localUser = localStorage.getItem('kond-user');
          console.log('📦 localStorage kond-user:', localUser);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setSessionInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return <div>Verificando sesión...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Diagnóstico de Autenticación</h1>

      <h2>Estado de Sesión:</h2>
      <pre style={{
        background: '#f5f5f5',
        padding: '10px',
        borderRadius: '4px',
        overflow: 'auto'
      }}>
        {JSON.stringify(sessionInfo, null, 2)}
      </pre>

      <h2>localStorage:</h2>
      {typeof window !== 'undefined' && (
        <pre style={{
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            'kond-user': localStorage.getItem('kond-user')
          }, null, 2)}
        </pre>
      )}

      <h2>Verificaciones:</h2>
      <ul>
        <li>✅ Tiene sesión: {sessionInfo?.session ? 'SÍ' : 'NO'}</li>
        <li>✅ Tiene usuario: {sessionInfo?.user ? 'SÍ' : 'NO'}</li>
        <li>✅ Rol es admin: {sessionInfo?.user?.rol === 'admin' ? 'SÍ' : 'NO'}</li>
        <li>ℹ️ Rol actual: {sessionInfo?.user?.rol || 'N/A'}</li>
      </ul>

      <button
        onClick={() => window.location.reload()}
        style={{ padding: '10px 20px', marginTop: '20px' }}
      >
        🔄 Recargar
      </button>
    </div>
  );
}