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
      // Incluir TODOS los campos del perfil del usuario desde la BD
      nombre: usuario?.nombre || usuario?.username || email.split('@')[0],
      apellido: usuario?.apellido || '',
      telefono: usuario?.telefono || '',
      direccion: usuario?.direccion || '',
      localidad: usuario?.localidad || '',
      cp: usuario?.cp || '',
      provincia: usuario?.provincia || '',
      observaciones: usuario?.observaciones || ''
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
    
    return { error: null };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return { error };
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

/**
 * Actualizar perfil de usuario en la base de datos
 */
export async function updateUserProfile(userId, profileData) {
  try {
    // Obtener el usuario autenticado actual
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Error obteniendo usuario autenticado:', authError);
      return { data: null, error: 'No hay usuario autenticado' };
    }

    // Usar el ID del usuario autenticado en lugar del que viene por parámetro
    const correctUserId = authUser.id;
    
    // Verificar si el usuario existe en la tabla usuarios (por ID o por email)
    let existingUser = null;
    const { data: userById } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', correctUserId)
      .maybeSingle();

    if (userById) {
      existingUser = userById;
    } else {
      // No existe por ID, verificar por email
      const { data: userByEmail } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (userByEmail && userByEmail.id !== correctUserId) {
        // Usuario existe con ID diferente, usar UPSERT para actualizar
        existingUser = null; // Forzar creación con UPSERT
      } else if (userByEmail) {
        existingUser = userByEmail;
      }
    }

    // Si no existe, crearlo
    if (!existingUser) {
      // Generar username único usando email y timestamp
      const baseUsername = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
      const uniqueUsername = `${baseUsername.replace(/\s+/g, '_')}_${Date.now()}`.substring(0, 100);

      // Verificar si ya existe un usuario con este email
      const { data: existingByEmail } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      let result;
      if (existingByEmail) {
        // Actualizar el usuario existente
        const { data, error } = await supabase
          .from('usuarios')
          .update({
            id: authUser.id, // Actualizar ID al correcto
            nombre: profileData.nombre || authUser.user_metadata?.full_name?.split(' ')[0] || '',
            apellido: profileData.apellido || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            telefono: profileData.telefono || '',
            direccion: profileData.direccion || '',
            localidad: profileData.localidad || '',
            cp: profileData.cp || '',
            provincia: profileData.provincia || '',
            observaciones: profileData.observaciones || 'Usuario sincronizado desde auth',
          })
          .eq('email', authUser.email)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Error actualizando usuario existente:', error);
          return { data: null, error: error.message };
        }
        result = data;
      } else {
        // Crear nuevo usuario
        const { data, error } = await supabase
          .from('usuarios')
          .insert({
            id: authUser.id,
            email: authUser.email,
            username: uniqueUsername,
            nombre: profileData.nombre || authUser.user_metadata?.full_name?.split(' ')[0] || '',
            apellido: profileData.apellido || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            telefono: profileData.telefono || '',
            direccion: profileData.direccion || '',
            localidad: profileData.localidad || '',
            cp: profileData.cp || '',
            provincia: profileData.provincia || '',
            observaciones: profileData.observaciones || 'Usuario sincronizado desde auth',
            rol: 'cliente',
          })
          .select()
          .maybeSingle();

        if (error) {
          console.error('Error creando usuario en BD:', error);
          return { data: null, error: error.message };
        }
        result = data;
      }

      return { data: result, error: null };
    }    // Si existe, actualizar normalmente
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        nombre: profileData.nombre,
        apellido: profileData.apellido,
        telefono: profileData.telefono,
        direccion: profileData.direccion,
        localidad: profileData.localidad,
        cp: profileData.cp,
        provincia: profileData.provincia,
        observaciones: profileData.observaciones,
        updated_at: new Date().toISOString()
      })
      .eq('id', correctUserId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando perfil en BD:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// GOOGLE OAUTH AUTHENTICATION
// ============================================

/**
 * Login con Google OAuth
 */
export async function loginWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/user` : undefined,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Error en login con Google:', error);
      return { error: error.message, user: null, session: null };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error en loginWithGoogle:', error);
    return { error: error.message, user: null, session: null };
  }
}

/**
 * Manejar callback de OAuth después del login
 */
export async function handleOAuthCallback() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error obteniendo sesión OAuth:', error);
      return { error: error.message, user: null, session: null };
    }

    if (data.session) {
      const user = data.session.user;

      // Verificar si el usuario ya existe en nuestra tabla usuarios
      const { data: existingUser, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', user.email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error verificando usuario existente:', fetchError);
        return { error: fetchError.message, user: null, session: null };
      }

      if (!existingUser) {
        // Crear nuevo usuario en nuestra tabla
        const { data: newUser, error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: user.id,
            email: user.email,
            username: user.user_metadata?.full_name || user.email.split('@')[0],
            nombre: user.user_metadata?.full_name?.split(' ')[0] || '',
            apellido: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            telefono: '',
            direccion: '',
            localidad: '',
            cp: '',
            provincia: '',
            observaciones: 'Usuario registrado con Google OAuth',
            rol: 'cliente',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creando usuario OAuth:', insertError);
          return { error: insertError.message, user: null, session: null };
        }

        // Guardar información del usuario del catálogo en localStorage
        if (typeof window !== 'undefined') {
          const userData = {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            nombre: newUser.nombre,
            apellido: newUser.apellido,
            telefono: newUser.telefono,
            direccion: newUser.direccion,
            localidad: newUser.localidad,
            cp: newUser.cp,
            provincia: newUser.provincia,
            rol: newUser.rol,
            avatar_url: user.user_metadata?.avatar_url,
          };
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }

        return { data: { user: newUser, session: data.session }, error: null };
      } else {
        // Usuario ya existe, actualizar localStorage
        if (typeof window !== 'undefined') {
          const userData = {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            nombre: existingUser.nombre,
            apellido: existingUser.apellido,
            telefono: existingUser.telefono,
            direccion: existingUser.direccion,
            localidad: existingUser.localidad,
            cp: existingUser.cp,
            provincia: existingUser.provincia,
            rol: existingUser.rol,
            avatar_url: user.user_metadata?.avatar_url,
          };
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }

        return { data: { user: existingUser, session: data.session }, error: null };
      }
    }

    return { data: null, error: 'No se pudo obtener la sesión' };
  } catch (error) {
    console.error('Error en handleOAuthCallback:', error);
    return { error: error.message, user: null, session: null };
  }
}
