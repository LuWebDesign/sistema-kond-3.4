// ============================================
// SUPABASE AUTH HELPERS V2 - ACTUALIZADO
// Autenticación usando Supabase Auth + tabla usuarios
// Versión: 1.1 (con rol admin corregido)
// ============================================

import supabase from './supabaseClient';

/**
 * Login con username y password usando Supabase Auth
 * Nota: Creamos usuarios en auth.users vinculados con nuestra tabla usuarios
 */
export async function loginWithUsername(username, password) {
  try {
    let usuario = null;

    try {
      const response = await fetch('/api/usuarios/find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (response.status === 404) {
        return {
          error: 'Usuario no encontrado',
          user: null,
          session: null,
        };
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Error consultando usuario');
      }

      const payload = await response.json();
      usuario = payload?.user || null;
    } catch (error) {
      console.error('Error consultando usuario (username):', error);
      return {
        error: 'No se pudo obtener información del usuario',
        user: null,
        session: null,
      };
    }

    if (!usuario) {
      return {
        error: 'Usuario no encontrado',
        user: null,
        session: null,
      };
    }

    // Usar el ID como email para Supabase Auth (formato: <uuid>@kond.local)
    const email = `${usuario.id}@kond.local`;

    // Intentar login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Error de autenticación:', authError);
      return {
        error: 'Credenciales incorrectas',
        user: null,
        session: null,
      };
    }

    // Guardar información del usuario en localStorage para acceso rápido
    if (typeof window !== 'undefined') {
      localStorage.setItem('kond-user', JSON.stringify({
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        email: usuario.email || `${usuario.id}@kond.local`,
        telefono: usuario.telefono || '',
        direccion: usuario.direccion || '',
        localidad: usuario.localidad || '',
        provincia: usuario.provincia || '',
        apellido: usuario.apellido || '',
      }));
    }

    return {
      error: null,
      user: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        email: usuario.email || `${usuario.id}@kond.local`,
        telefono: usuario.telefono || '',
        direccion: usuario.direccion || '',
        localidad: usuario.localidad || '',
        provincia: usuario.provincia || '',
        apellido: usuario.apellido || '',
      },
      session: authData.session,
    };
  } catch (error) {
    console.error('Error en loginWithUsername:', error);
    return {
      error: error.message,
      user: null,
      session: null,
    };
  }
}

/**
 * Login con email y password usando Supabase Auth
 * Para admin: admin@kond.local
 */
export async function loginWithEmail(email, password) {
  try {
    // Intentar login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Error de autenticación:', authError);
      return {
        error: 'Credenciales incorrectas',
        user: null,
        session: null,
      };
    }

    let usuario = null;

    try {
      const response = await fetch(`/api/usuarios/${authData.user.id}`);

      if (response.ok) {
        const payload = await response.json();
        usuario = payload?.user || null;
      } else if (response.status !== 404) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Error consultando usuario');
      }
    } catch (error) {
      console.warn('No se pudo obtener usuario desde API interna:', error);
    }

    const user = {
      id: authData.user.id,
      email: usuario?.email || authData.user.email,
      username: usuario?.username || email.split('@')[0],
      rol: usuario?.rol || 'usuario',
      telefono: usuario?.telefono || '',
      direccion: usuario?.direccion || '',
      localidad: usuario?.localidad || '',
      provincia: usuario?.provincia || '',
      apellido: usuario?.apellido || '',
    };

    console.log('✅ Usuario final:', user);

    // Guardar información del usuario en localStorage para acceso rápido
    if (typeof window !== 'undefined') {
      localStorage.setItem('kond-user', JSON.stringify(user));
    }

    return {
      error: null,
      user,
      session: authData.session,
    };
  } catch (error) {
    console.error('Error en loginWithEmail:', error);
    return {
      error: error.message,
      user: null,
      session: null,
    };
  }
}

/**
 * Crear usuario en Supabase Auth (solo para inicializar admin)
 * Nota: Esto debe ejecutarse una sola vez después de crear el usuario en la tabla
 */
export async function createAuthUserForAdmin(userId, password) {
  try {
    const email = `${userId}@kond.local`;
    
    // Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_id: userId,
        }
      }
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creando auth user:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Obtener sesión actual desde Supabase Auth
 */
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) return null;

    // Obtener info del usuario desde localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('kond-user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          return {
            session,
            user,
          };
        } catch (e) {
          console.error('Error parseando usuario de localStorage:', e);
          localStorage.removeItem('kond-user');
        }
      }
    }

    // Si no hay datos de usuario en localStorage, cerrar sesión
    console.warn('⚠️  Sesión activa pero sin datos de usuario. Cerrando sesión...');
    await supabase.auth.signOut();
    return null;
  } catch (error) {
    console.error('Error en getCurrentSession:', error);
    return null;
  }
}

/**
 * Cerrar sesión
 */
export async function logout() {
  try {
    const signOutResult = await supabase.auth.signOut();
    const error = signOutResult && typeof signOutResult === 'object' ? signOutResult.error : null;
    
    // Limpiar localStorage incluso si hay error de signOut
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kond-user');
    }
    
    // Si el error es 403 (Forbidden), ignorarlo ya que la sesión se limpia localmente
    if (error && error.status === 403) {
      console.warn('⚠️  Error 403 al cerrar sesión en servidor, pero sesión local limpiada');
      return { error: null };
    }
    
    if (error) {
      console.error('Error al cerrar sesión:', error);
      return { error: error.message };
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    
    // Limpiar localStorage de todas formas
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kond-user');
    }
    
    return { error: error.message };
  }
}

/**
 * Verificar si el usuario actual es admin
 */
export function isAdmin() {
  if (typeof window === 'undefined') return false;
  
  const userStr = localStorage.getItem('kond-user');
  if (!userStr) return false;
  
  try {
    const user = JSON.parse(userStr);
    return user?.rol === 'admin';
  } catch {
    return false;
  }
}

/**
 * Obtener usuario actual
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('kond-user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Verificar si hay una sesión activa
 */
export async function hasActiveSession() {
  const session = await getCurrentSession();
  return session !== null && session.session !== null;
}
