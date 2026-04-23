// ============================================
// SUPABASE AUTH HELPERS V2 - ACTUALIZADO
// Autenticación usando Supabase Auth + tabla usuarios
// Versión: 1.1 (con rol admin corregido)
// ============================================

import supabase from './supabaseClient';

// Verificar que Supabase esté inicializado
if (!supabase) {
  console.warn('⚠️ Supabase no inicializado. Funciones de autenticación pueden no funcionar correctamente.');
}

/**
 * Login con username y password usando Supabase Auth
 * Nota: Creamos usuarios en auth.users vinculados con nuestra tabla usuarios
 */
export async function loginWithUsername(username, password) {
  if (!supabase) {
    console.warn('Supabase no inicializado - loginWithUsername fallando gracefully');
    return { 
      error: 'Sistema de autenticación no disponible',
      user: null,
      session: null
    };
  }

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
  if (!supabase) {
    console.warn('Supabase no inicializado - loginWithEmail fallando gracefully');
    return {
      error: 'Sistema de autenticación no disponible',
      user: null,
      session: null,
    };
  }

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

    // console.log('🔍 Usuario desde BD:', usuario);
    // console.log('🔍 Rol del usuario:', usuario?.rol);

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

    // console.log('✅ Usuario final:', user);

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
 * Login específico para administradores con email y contraseña
 * Los admin usan Supabase Auth directamente (NO Google OAuth)
 */
export async function loginAdmin(email, password) {
  if (!supabase) {
    return {
      error: 'Sistema de autenticación no disponible',
      user: null,
      session: null,
    };
  }

  try {
    // Intentar login con Supabase Auth usando email y contraseña
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Error de autenticación admin:', authError);
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

    if (fetchError || !usuario) {
      console.error('Usuario no encontrado en tabla usuarios:', fetchError);
      return {
        error: 'Usuario no encontrado',
        user: null,
        session: null
      };
    }

    // Verificar que sea admin o super_admin
    if (usuario.rol !== 'admin' && usuario.rol !== 'super_admin') {
      // Cerrar sesión si no es admin
      await supabase.auth.signOut();
      return {
        error: 'No tienes permisos de administrador',
        user: null,
        session: null,
      };
    }

    // Usuario admin autenticado exitosamente
    const adminUser = {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre || 'Admin',
      apellido: usuario.apellido || '',
      isAdmin: true
    };

    // Guardar información del admin en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('kond-admin', JSON.stringify(adminUser));
      localStorage.setItem('kond-user', JSON.stringify(adminUser)); // Para compatibilidad
    }

    return {
      error: null,
      user: adminUser,
      session: authData.session,
    };
  } catch (error) {
    console.error('Error en loginAdmin:', error);
    return {
      error: error.message,
      user: null,
      session: null,
    };
  }
}

/**
 * Crear usuario en Supabase Auth para admin
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
 * Versión mejorada que verifica la sesión completa
 */
export async function getCurrentSession() {
  if (!supabase) {
    console.warn('Supabase no inicializado');
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || !session.user) {
      // No hay sesión válida en Supabase
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kond-user');
      }
      return null;
    }

    // Obtener info del usuario desde localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('kond-user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);

          // Verificar que el ID del usuario coincida con la sesión
          if (userData.id === session.user.id) {
            return {
              session,
              user: userData,
            };
          }
        } catch (parseError) {
          console.warn('Error parseando datos de usuario en localStorage:', parseError);
        }
      }

      // Si no hay datos en localStorage, intentar obtenerlos de la BD
      const isPublicPage = typeof window !== 'undefined' && 
        (window.location.pathname === '/catalog' || 
         window.location.pathname === '/catalog/user' || 
         window.location.pathname.startsWith('/tracking'));
      
      try {
        const { data: usuario, error: fetchError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!fetchError && usuario) {
          // Guardar en localStorage para futuras consultas
          const userData = {
            id: usuario.id,
            username: usuario.username,
            rol: usuario.rol,
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            telefono: usuario.telefono,
            direccion: usuario.direccion,
            localidad: usuario.localidad,
            cp: usuario.cp,
            provincia: usuario.provincia,
            observaciones: usuario.observaciones
          };
          
          // Si estamos en página pública y el usuario es ADMIN, no retornar sesión
          if (isPublicPage && (usuario.rol === 'admin' || usuario.rol === 'super_admin')) {
            // console.log('Sesión de admin detectada en página pública - ignorando');
            return null;
          }
          
          // Guardar en la clave correcta según el contexto
          if (isPublicPage) {
            // Solo guardar en currentUser si NO es admin
            localStorage.setItem('currentUser', JSON.stringify(userData));
          } else {
            localStorage.setItem('kond-user', JSON.stringify(userData));
          }

          return {
            session,
            user: userData,
          };
        } else if (fetchError) {
          // Si hay error (como 406 por RLS o PGRST116), retornar sesión básica sin datos de usuario
          if (!isPublicPage) {
            console.warn('No se pudo obtener datos del usuario (posible error de permisos):', fetchError);
          }
          return {
            session,
            user: {
              id: session.user.id,
              email: session.user.email,
              username: session.user.email?.split('@')[0] || 'usuario',
              rol: 'cliente'
            }
          };
        }
      } catch (dbError) {
        if (!isPublicPage) {
          console.warn('Error obteniendo usuario de BD:', dbError);
        }
        // Retornar sesión básica con datos mínimos
        return {
          session,
          user: {
            id: session.user.id,
            email: session.user.email,
            username: session.user.email?.split('@')[0] || 'usuario',
            rol: 'cliente'
          }
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo sesión actual:', error);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kond-user');
    }
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
      // Remover TODAS las claves relacionadas con sesiones
      localStorage.removeItem('kond-user');
      localStorage.removeItem('kond-admin');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('adminSession');
      localStorage.removeItem('userSession');
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
// REGISTRO DE CLIENTES
// ============================================

/**
 * Registrar un nuevo cliente con email y contraseña usando Supabase Auth
 * Crea el usuario en auth.users y en la tabla usuarios
 */
export async function registerWithEmail(email, password, profileData = {}) {
  if (!supabase) {
    return {
      error: 'Sistema de autenticación no disponible',
      user: null,
      session: null,
    };
  }

  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      // Mensaje amigable para errores comunes
      if (authError.message?.includes('already registered')) {
        return { error: 'Este email ya está registrado. Intentá iniciar sesión.', user: null, session: null };
      }
      return { error: authError.message, user: null, session: null };
    }

    if (!authData?.user) {
      return { error: 'No se pudo crear la cuenta', user: null, session: null };
    }

    // 2. Crear registro en la tabla usuarios
    const baseUsername = profileData.nombre || email.split('@')[0];
    const uniqueUsername = `${baseUsername.replace(/\s+/g, '_')}_${Date.now()}`.substring(0, 100);

    const { error: insertError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email: email,
        username: uniqueUsername,
        nombre: profileData.nombre || '',
        apellido: profileData.apellido || '',
        telefono: profileData.telefono || '',
        direccion: profileData.direccion || '',
        localidad: profileData.localidad || '',
        cp: profileData.cp || '',
        provincia: profileData.provincia || '',
        observaciones: profileData.observaciones || '',
        rol: 'cliente',
      });

    if (insertError) {
      console.error('Error creando usuario en tabla usuarios:', insertError);
      // El usuario se creó en Auth pero falló en la tabla — no es fatal
    }

    // 3. Construir objeto de usuario (sin password)
    const user = {
      id: authData.user.id,
      email: email,
      username: uniqueUsername,
      nombre: profileData.nombre || '',
      apellido: profileData.apellido || '',
      telefono: profileData.telefono || '',
      direccion: profileData.direccion || '',
      localidad: profileData.localidad || '',
      cp: profileData.cp || '',
      provincia: profileData.provincia || '',
      observaciones: profileData.observaciones || '',
      rol: 'cliente',
      fechaRegistro: new Date().toISOString(),
    };

    return {
      error: null,
      user,
      session: authData.session,
      emailConfirmationRequired: !authData.session, // si no hay sesión, requiere confirmar email
    };
  } catch (error) {
    console.error('Error en registerWithEmail:', error);
    return { error: error.message, user: null, session: null };
  }
}

/**
 * Cerrar sesión de clientes del catálogo
 * Cierra la sesión de Supabase Auth y limpia localStorage del cliente
 */
export async function logoutClient() {
  try {
    await supabase.auth.signOut();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }

    return { error: null };
  } catch (error) {
    console.error('Error al cerrar sesión de cliente:', error);
    return { error: error.message };
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
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/catalog/user` : undefined,
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
 * Usa onAuthStateChange para esperar la sesión - funciona en desktop y mobile
 */
export async function handleOAuthCallback() {
  try {
    // Esperar que Supabase establezca la sesión via onAuthStateChange
    // (Supabase auto-intercambia el code PKCE con detectSessionInUrl: true)
    const session = await new Promise((resolve) => {
      let resolved = false;

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s) {
          resolved = true;
          subscription.unsubscribe();
          resolve(s);
        }
      });

      // Timeout máximo 8 segundos - si ya hay sesión disponible, getSession() la retorna
      setTimeout(async () => {
        if (!resolved) {
          subscription.unsubscribe();
          const { data } = await supabase.auth.getSession();
          resolve(data?.session || null);
        }
      }, 8000);

      // Verificar si la sesión ya existe de inmediato (intercambio ya completado)
      supabase.auth.getSession().then(({ data }) => {
        if (!resolved && data?.session) {
          resolved = true;
          subscription.unsubscribe();
          resolve(data.session);
        }
      });
    });

    if (session) {
      const user = session.user;

      // Verificar si el usuario ya existe en nuestra tabla usuarios
      const { data: existingUser, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', user.email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.warn('Error verificando usuario existente (posible error de permisos RLS):', fetchError);
        // En lugar de fallar, continuar con datos básicos del usuario
        const basicUserData = {
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0],
          apellido: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          telefono: '',
          direccion: '',
          localidad: '',
          cp: '',
          provincia: '',
          observaciones: '',
          rol: 'cliente',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(basicUserData));
        }
        return { data: { user: basicUserData, session }, error: null };
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
          // No bloquear el login por error de insert — usar datos básicos
          const fallbackUser = {
            id: user.id,
            email: user.email,
            nombre: user.user_metadata?.full_name?.split(' ')[0] || '',
            apellido: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            rol: 'cliente',
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
          }
          return { data: { user: fallbackUser, session }, error: null };
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

        return { data: { user: newUser, session }, error: null };
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

        return { data: { user: existingUser, session }, error: null };
      }
    }

    return { data: null, error: 'No se pudo obtener la sesión' };
  } catch (error) {
    console.error('Error en handleOAuthCallback:', error);
    return { error: error.message, user: null, session: null };
  }
}

/**
 * Cerrar sesión de administrador
 */
export async function logoutAdmin() {
  try {
    // Cerrar sesión en Supabase Auth
    const { error } = await supabase.auth.signOut();

    // Limpiar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kond-admin');
      localStorage.removeItem('kond-user');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('adminSession');
      localStorage.removeItem('userSession');
    }

    return { error: null };
  } catch (error) {
    console.error('Error al cerrar sesión admin:', error);
    return { error: error.message };
  }
}

/**
 * Actualizar contraseña del usuario autenticado
 * Acepta contraseña actual (para validación UI) y nueva contraseña
 * Nota: Supabase Auth no requiere la contraseña actual para cambiarla.
 * Solo verifica que haya una sesión activa.
 */
export async function updatePassword(currentPassword, newPassword) {
  if (!supabase) {
    return { data: null, error: { message: 'Sistema de autenticación no disponible' } };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { data: null, error: { message: 'No hay sesión activa' } };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Error actualizando contraseña:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error en updatePassword:', error);
    return { data: null, error: { message: error.message } };
  }
}
