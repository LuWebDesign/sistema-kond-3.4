// Script: reset-admin-password.js
// Uso: desde la carpeta next-app ejecutar: node scripts/reset-admin-password.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Cargar .env.local manualmente (no confiar en process.env en entornos donde no se cargó)
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: faltan variables en .env.local (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Cambia la contraseña a este valor (puedes editarlo antes de ejecutar)
const NEW_ADMIN_PASSWORD = 'KondAdmin!2025'
const ADMIN_EMAIL = 'admin@kond.local'

async function resetPassword() {
  try {
    console.log(`🔍 Buscando usuario con email ${ADMIN_EMAIL}...`)

    // Listar usuarios (admin API)
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const users = (listData && listData.users) || []
    const user = users.find(u => u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())

    if (!user) {
      console.log('⚠️ Usuario no encontrado en Auth. Intentando buscar en tabla `usuarios`...')
      const { data: rows, error: qErr } = await supabase
        .from('usuarios')
        .select('id, username')
        .eq('username', 'admin')
        .limit(1)
        .single()

      if (qErr) {
        console.error('❌ No se encontró el usuario admin en Auth ni en tabla usuarios')
        throw qErr
      }

      // Si encontramos un registro en usuarios, intentamos obtener su id (puede ser UUID del auth)
      const fallbackId = rows.id
      if (!fallbackId) {
        throw new Error('No se pudo determinar userId para admin')
      }

      console.log('🔍 Usuario admin encontrado en tabla usuarios con id:', fallbackId)
      console.log('🔧 Intentando actualizar contraseña mediante admin.updateUserById...')

      const { data: updData, error: updErr } = await supabase.auth.admin.updateUserById(fallbackId, { password: NEW_ADMIN_PASSWORD })
      if (updErr) throw updErr

      console.log('✅ Contraseña actualizada (tabla usuarios fallback).')
      console.log('Email:', ADMIN_EMAIL)
      console.log('Nueva contraseña:', NEW_ADMIN_PASSWORD)
      return
    }

    const userId = user.id
    console.log('✓ Usuario encontrado en Auth. ID:', userId)
    console.log('🔧 Actualizando contraseña...')

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: NEW_ADMIN_PASSWORD })
    if (updateError) throw updateError

    console.log('✅ Contraseña del admin actualizada correctamente.')
    console.log('Email:', ADMIN_EMAIL)
    console.log('Nueva contraseña:', NEW_ADMIN_PASSWORD)

  } catch (error) {
    console.error('❌ Error al resetear contraseña del admin:', error.message || error)
    process.exit(1)
  }
}

resetPassword()
