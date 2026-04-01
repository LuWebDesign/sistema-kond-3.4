import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '../../../utils/supabaseClient';

export default function ConfirmEmail() {
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Verificando tu email...');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const queryType = searchParams.get('type');
        const errorDescription = searchParams.get('error_description');
        const accessToken = hashParams.get('access_token');
        const hashType = hashParams.get('type');

        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription));
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;

          setStatus('success');
          setMessage('¡Email confirmado exitosamente!');

          setTimeout(() => {
            router.push('/catalog/user');
          }, 3000);
          return;
        }

        if (tokenHash && queryType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: queryType,
          });

          if (error) throw error;

          setStatus('success');
          setMessage('¡Email confirmado exitosamente!');

          setTimeout(() => {
            router.push('/catalog/user');
          }, 3000);
          return;
        }

        if (hashType === 'signup' && accessToken) {
          const { data, error } = await supabase.auth.getUser(accessToken);

          if (error) throw error;

          if (data.user) {
            setStatus('success');
            setMessage('¡Email confirmado exitosamente!');
            
            setTimeout(() => {
              router.push('/catalog/user');
            }, 3000);
            return;
          }
        }

        setStatus('error');
        setMessage('Link de confirmación inválido o expirado');
      } catch (error) {
        console.error('Error confirmando email:', error);
        setStatus('error');
        setMessage(error?.message || 'Error al confirmar el email. Por favor intenta nuevamente.');
      }
    };

    handleEmailConfirmation();
  }, [router]);

  return (
    <div className="confirm-container">
      <div className="confirm-card">
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <h1>Verificando...</h1>
            <p>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="icon success-icon">✅</div>
            <h1>¡Email Confirmado!</h1>
            <p>Tu cuenta ha sido activada exitosamente.</p>
            <p className="redirect-text">Serás redirigido al login en 3 segundos...</p>
            <Link href="/catalog/user">
              <a className="btn-primary">Ir a iniciar sesión ahora</a>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon error-icon">❌</div>
            <h1>Error de Verificación</h1>
            <p>{message}</p>
            <div className="actions">
              <Link href="/catalog/register">
                <a className="btn-secondary">Registrarme nuevamente</a>
              </Link>
              <Link href="/catalog/user">
                <a className="btn-primary">Ir a login</a>
              </Link>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .confirm-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #f5f5f5);
          padding: 20px;
        }

        .confirm-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 48px 40px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          max-width: 480px;
          width: 100%;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color, #e5e7eb);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .icon {
          font-size: 4rem;
          margin-bottom: 24px;
        }

        .success-icon {
          animation: bounce 1s ease;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        h1 {
          color: var(--text-primary, #1f2937);
          margin: 0 0 16px 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        p {
          color: var(--text-secondary, #6b7280);
          margin: 0 0 12px 0;
          line-height: 1.6;
        }

        .redirect-text {
          color: var(--text-muted, #9ca3af);
          font-size: 0.9rem;
          margin: 24px 0;
        }

        .actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          display: inline-block;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          margin-top: 16px;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: var(--bg-card, #fff);
          color: var(--text-primary, #1f2937);
          border: 1px solid var(--border-color, #e5e7eb);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary, #f9fafb);
        }

        @media (max-width: 480px) {
          .confirm-card {
            padding: 36px 24px;
          }

          h1 {
            font-size: 1.5rem;
          }

          .icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
