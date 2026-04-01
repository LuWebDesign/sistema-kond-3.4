import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '../../utils/supabaseClient';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido: '',
    telefono: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.nombre) {
      setError('Por favor completa los campos obligatorios');
      return false;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Email inválido');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/catalog/auth/confirm`,
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono
          }
        }
      });

      if (authError) throw authError;

      // 2. Si el registro fue exitoso, crear registro en tabla usuarios
      // Nota: Supabase Auth ya creó el usuario, ahora creamos su perfil
      if (authData.user) {
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            email: formData.email,
            username: formData.email.split('@')[0],
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            rol: 'cliente',
            direccion: '',
            localidad: '',
            cp: '',
            provincia: '',
            observaciones: 'Registro desde catálogo web'
          });

        if (insertError) {
          console.error('Error creando perfil:', insertError);
          // No mostramos error al usuario porque el registro Auth fue exitoso
        }
      }

      // 3. Mostrar mensaje de éxito
      setSuccess(true);

    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.message.includes('already registered')) {
        setError('Este email ya está registrado. ¿Quieres iniciar sesión?');
      } else if (error.message.includes('Invalid email')) {
        setError('Email inválido');
      } else {
        setError(error.message || 'Error al registrar usuario');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card">
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h1>¡Registro Exitoso!</h1>
            <p>Hemos enviado un email de confirmación a:</p>
            <strong>{formData.email}</strong>
            <p className="instruction">
              Por favor revisa tu bandeja de entrada y haz click en el enlace de confirmación para activar tu cuenta.
            </p>
            <div className="tips">
              <p>💡 <strong>Consejo:</strong> Si no ves el email, revisa tu carpeta de spam.</p>
            </div>
            <div className="actions">
              <Link href="/user">
                <a className="btn-primary">Ir a iniciar sesión</a>
              </Link>
              <Link href="/">
                <a className="btn-secondary">Volver al catálogo</a>
              </Link>
            </div>
          </div>
        </div>

        <style jsx>{`
          .success-message {
            text-align: center;
            padding: 20px;
          }

          .success-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            animation: bounce 1s ease;
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }

          .success-message h1 {
            color: var(--text-primary, #1f2937);
            margin-bottom: 16px;
            font-size: 1.75rem;
          }

          .success-message p {
            color: var(--text-secondary, #6b7280);
            margin-bottom: 8px;
            line-height: 1.6;
          }

          .success-message strong {
            color: var(--text-primary, #1f2937);
            font-size: 1.1rem;
            display: block;
            margin: 16px 0;
          }

          .instruction {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            color: #0369a1;
          }

          .tips {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
            text-align: left;
          }

          .tips p {
            margin: 0;
            color: #92400e;
            font-size: 0.9rem;
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
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Crear Cuenta</h1>
          <p>Regístrate para realizar pedidos y hacer seguimiento</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombre">Nombre *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Tu nombre"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="apellido">Apellido</label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Tu apellido"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej: +54 9 11 1234-5678"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Mínimo 6 caracteres"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Repite tu contraseña"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="register-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="register-footer">
          <p>¿Ya tienes cuenta?</p>
          <Link href="/user">
            <a className="login-link">Iniciar sesión</a>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #f5f5f5);
          padding: 40px 20px;
        }

        .register-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          width: 100%;
          max-width: 500px;
        }

        .register-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .register-header h1 {
          color: var(--text-primary, #1f2937);
          margin: 0 0 8px 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .register-header p {
          color: var(--text-secondary, #6b7280);
          margin: 0;
          font-size: 0.95rem;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: var(--text-primary, #1f2937);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-group input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          font-size: 15px;
          background: var(--bg-input, #fff);
          color: var(--text-primary, #1f2937);
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .form-group input:disabled {
          background: var(--bg-tertiary, #f9fafb);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-group input::placeholder {
          color: var(--text-muted, #9ca3af);
        }

        .error-message {
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.9rem;
        }

        .register-btn {
          width: 100%;
          padding: 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 8px;
        }

        .register-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .register-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .register-footer {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          text-align: center;
        }

        .register-footer p {
          color: var(--text-secondary, #6b7280);
          margin-bottom: 8px;
          font-size: 0.9rem;
        }

        .login-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .login-link:hover {
          color: #2563eb;
        }

        @media (max-width: 600px) {
          .register-card {
            padding: 32px 24px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .register-header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
