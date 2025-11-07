// API Route: Autenticación de usuarios
// POST /api/auth/login
// Verifica credenciales contra Supabase

import { supabaseAdmin } from '../../../utils/supabaseClient';
const bcrypt = require('bcryptjs');

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { username, password } = req.body;

    // Validar datos requeridos
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Obtener cliente admin (bypassa RLS)
    const supabase = supabaseAdmin();
    
    // Buscar usuario
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Login exitoso - retornar datos del usuario (sin password_hash)
    const { password_hash, ...userWithoutPassword } = usuario;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: 'Login exitoso'
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
