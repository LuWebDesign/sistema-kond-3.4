/**
 * Configuración de Supabase para Sistema KOND
 * 
 * Agrega este script en tus páginas HTML para habilitar Supabase
 * O impórtalo en tu aplicación Next.js
 */

// Configuración desde variables de entorno
const SUPABASE_CONFIG = {
  url: 'NEXT_PUBLIC_SUPABASE_URL' in process.env 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL 
    : '',
  anonKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' in process.env
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : '',
  useSupabase: 'NEXT_PUBLIC_USE_SUPABASE' in process.env
    ? process.env.NEXT_PUBLIC_USE_SUPABASE === 'true'
    : false
};

// Para HTML estático (sin bundler), configurar manualmente:
// window.KOND_SUPABASE_CONFIG = {
//   url: 'https://tu-proyecto.supabase.co',
//   anonKey: 'tu_anon_key_aqui',
//   useSupabase: true
// };

/**
 * Inicializar Supabase en la aplicación
 */
async function initSupabase() {
  // Verificar si ya está inicializado
  if (window.supabaseClient) {
    console.log('✅ Supabase ya está inicializado');
    return;
  }

  // Verificar configuración
  const config = window.KOND_SUPABASE_CONFIG || SUPABASE_CONFIG;
  
  if (!config.url || !config.anonKey) {
    console.warn('⚠️ Supabase no configurado. Usando localStorage como fallback.');
    window.KOND_USE_SUPABASE = false;
    return;
  }

  try {
    // Importar cliente (ajustar ruta según tu estructura)
    const { supabase, uploadFile, isSupabaseConfigured } = await import('./supabase/client.js');
    
    if (!isSupabaseConfigured()) {
      throw new Error('Configuración de Supabase inválida');
    }

    // Hacer disponible globalmente
    window.supabaseClient = supabase;
    window.uploadFileToSupabase = uploadFile;
    window.KOND_USE_SUPABASE = config.useSupabase;

    console.log('✅ Supabase inicializado correctamente');
    console.log('📊 Modo:', config.useSupabase ? 'Supabase' : 'localStorage (fallback)');
    
    // Opcional: verificar conexión
    const { data, error } = await supabase.from('productos').select('count');
    if (error) {
      console.warn('⚠️ Error conectando a Supabase:', error.message);
      console.log('📦 Usando localStorage como fallback');
      window.KOND_USE_SUPABASE = false;
    } else {
      console.log('✅ Conexión a Supabase verificada');
    }
  } catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    console.log('📦 Usando localStorage como fallback');
    window.KOND_USE_SUPABASE = false;
  }
}

// Auto-inicializar si estamos en el navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
  } else {
    initSupabase();
  }
}

// Exportar para uso en módulos
export { initSupabase, SUPABASE_CONFIG };
