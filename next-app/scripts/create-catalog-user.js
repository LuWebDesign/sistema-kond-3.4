// Script: create-catalog-user.js
// Uso: desde la carpeta next-app ejecutar: node scripts/create-catalog-user.js
// Necesita SUPABASE_SERVICE_ROLE_KEY en next-app/.env.local

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Leer .env.local
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
  console.error('❌ Faltan variables de entorno. Añade NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en next-app/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// EDITA estos valores antes de ejecutar si quieres otra cuenta
const NEW_EMAIL = process.env.NEW_USER_EMAIL || 'user@kond.local'
const NEW_PASSWORD = process.env.NEW_USER_PASSWORD || 'UserTest!2025'
const USERNAME = process.env.NEW_USER_USERNAME || 'user'

async function createUser() {
  try {
    console.log('🚀 Creando usuario en Supabase Auth...')

    // 1) Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: NEW_EMAIL,
      password: NEW_PASSWORD,
      email_confirm: true,
      user_metadata: { username: USERNAME }
    })

    if (authError) {
      if (authError.message && authError.message.includes('already registered')) {
        console.log('⚠️ El email ya está registrado en Auth. Intentando buscar usuario...')
        const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
        if (listErr) throw listErr
        const existing = users.find(u => u.email === NEW_EMAIL)
        if (existing) {
          console.log('✓ Usuario encontrado en Auth, ID:', existing.id)
          await ensureUsuarioRow(existing.id)
          console.log('✅ Usuario sincronizado con tabla usuarios')
          console.log(`Email: ${NEW_EMAIL}`)
          console.log(`Password: ${NEW_PASSWORD}`)
          return
        } else {
          throw new Error('Usuario registrado pero no encontrado en lista de Auth')
        }
      }
      throw authError
    }

    console.log('✓ Usuario creado en Auth. ID:', authData.user.id)
    await ensureUsuarioRow(authData.user.id)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ USUARIO CREADO')
    console.log(`Email:    ${NEW_EMAIL}`)
    console.log(`Password: ${NEW_PASSWORD}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (err) {
    console.error('❌ Error creando usuario:', err.message || err)
  }
}

async function ensureUsuarioRow(userId) {
  // Crear o actualizar fila en tabla usuarios
  const { error: upsertErr } = await supabase
    .from('usuarios')
    .upsert({ id: userId, username: USERNAME, rol: 'usuario' }, { onConflict: 'id' })

  if (upsertErr) throw upsertErr
}

createUser()
