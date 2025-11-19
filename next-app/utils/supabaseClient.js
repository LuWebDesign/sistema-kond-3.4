// ============================================
// SUPABASE CLIENT CONFIGURATION
// Cliente Supabase para Next.js
// ============================================

import { createClient } from '@supabase/supabase-js';

// Validar que las variables de entorno estén definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Variables de entorno de Supabase no encontradas. Funciones de autenticación pueden no funcionar correctamente. ' +
    'Verifica que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén definidas en Vercel.'
  );
} else {
  // Cliente público de Supabase (respeta RLS)
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Exportar el cliente (puede ser null si no hay variables)
export { supabase };

// Cliente con service_role (solo para operaciones server-side)
// ⚠️ NUNCA usar en el cliente, solo en API routes
export const supabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definida');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export default supabase;
