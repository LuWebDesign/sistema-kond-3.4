// ============================================
// SUPABASE AUTH HELPERS
// Funciones auxiliares para autenticación
// ============================================

import supabase from './supabaseClient';
import bcrypt from 'bcryptjs';

/**
 * Login con username y password (usando bcrypt manual)
 * Nota: Supabase Auth usa email por defecto, aquí hacemos login custom con username
 */
export async function loginWithUsername(username, password) {
  try {
    // 1. Buscar usuario por username
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

    // 2. Verificar password con bcrypt
    const passwordMatch = bcrypt.compareSync(password, usuario.password_hash);

    if (!passwordMatch) {
      return {
        error: 'Contraseña incorrecta',
        user: null,
        session: null
      };
    }

    // 3. Crear sesión manualmente en localStorage (simulando auth)
    // TODO: Migrar a Supabase Auth real o implementar JWT custom
    const session = {
      user: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
      },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase-session', JSON.stringify(session));
    }

    return {
      error: null,
      user: session.user,
      session,
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
 * Obtener sesión actual desde localStorage
 */
export function getCurrentSession() {
  if (typeof window === 'undefined') return null;

  const sessionStr = localStorage.getItem('supabase-session');
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    
    // Verificar que no haya expirado
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem('supabase-session');
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Cerrar sesión
 */
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase-session');
  }
}

/**
 * Verificar si el usuario actual es admin
 */
export function isAdmin() {
  const session = getCurrentSession();
  return session?.user?.rol === 'admin';
}

/**
 * Obtener usuario actual
 */
export function getCurrentUser() {
  const session = getCurrentSession();
  return session?.user || null;
}
