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
    // Buscar usuario por username para obtener su email (usamos username como email temporalmente)
    const { data: usuario, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError || !usuario) {
      return { 
        error: 'Usuario no encontrado',
        user: null,
        session: null
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
      }));
    }

    return {
      error: null,
      user: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
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

    // Buscar usuario en la tabla usuarios por ID
    const { data: usuario, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (fetchError) {
      console.warn('Usuario autenticado pero no encontrado en tabla usuarios:', fetchError);
    }

    console.log('🔍 Usuario desde BD:', usuario);
    console.log('🔍 Rol del usuario:', usuario?.rol);

    const user = {
      id: authData.user.id,
      email: authData.user.email,
      username: usuario?.username || email.split('@')[0],
      rol: usuario?.rol || 'usuario',
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
        return {
          session,
          user: JSON.parse(userStr),
        };
      }
    }

    return { session, user: null };
  } catch {
    return null;
  }
}

/**
 * Cerrar sesión
 */
export async function logout() {
  try {
    await supabase.auth.signOut();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kond-user');
    }
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
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
