// API endpoint para diagnosticar notificaciones
// Uso: GET /api/notifications/test

import { supabase, supabaseAdmin } from '../../../utils/supabaseClient'
import { createNotification } from '../../../utils/supabaseNotifications'
import { TENANT_ID } from '../../../lib/tenant'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Probando creación de notificación...')

    // Verificar conexión básica a Supabase
    const { data: connectionTest, error: connectionError } = await supabase
      .from('productos')
      .select('count', { count: 'exact', head: true })

    if (connectionError) {
      console.error('❌ Error de conexión a Supabase:', connectionError)
      return res.status(500).json({
        error: 'Error de conexión a Supabase',
        details: connectionError.message
      })
    }

    console.log('✅ Conexión a Supabase OK')

    // Verificar que la tabla notifications existe
    const { data: tableTest, error: tableError } = await supabase
      .from('notifications')
      .select('count', { count: 'exact', head: true })

    if (tableError) {
      console.error('❌ Error accediendo a tabla notifications:', tableError)
      return res.status(500).json({
        error: 'Tabla notifications no existe o no es accesible',
        details: tableError.message
      })
    }

    console.log('✅ Tabla notifications accesible')

    // Crear una notificación de prueba
    const testNotification = {
      title: '🧪 Notificación de Prueba API',
      body: `Prueba desde Vercel - ${new Date().toISOString()}`,
      type: 'info',
      meta: {
        tipo: 'prueba_api',
        testId: `test-${Date.now()}`,
        source: 'vercel-api-test'
      },
      targetUser: 'admin'
    }

    console.log('📝 Creando notificación de prueba:', testNotification)

    const createdNotification = await createNotification(testNotification)

    console.log('✅ Notificación creada:', createdNotification)

    // Verificar que se puede leer la notificación
    const client = supabaseAdmin();
    const { data: readTest, error: readError } = await client
      .from('notifications')
      .select('*')
      .eq('id', createdNotification.id)
      .eq('tenant_id', TENANT_ID)
      .single()

    if (readError) {
      console.error('❌ Error leyendo notificación creada:', readError)
      return res.status(500).json({
        error: 'Error leyendo notificación creada',
        details: readError.message
      })
    }

    console.log('✅ Notificación leída correctamente')

    // Limpiar notificación de prueba
    const { error: deleteError } = await client
      .from('notifications')
      .delete()
      .eq('id', createdNotification.id)
      .eq('tenant_id', TENANT_ID)

    if (deleteError) {
      console.warn('⚠️ Error limpiando notificación de prueba:', deleteError)
    } else {
      console.log('🧹 Notificación de prueba limpiada')
    }

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Sistema de notificaciones funcionando correctamente',
      data: {
        connection: 'OK',
        table: 'OK',
        create: 'OK',
        read: 'OK',
        notification: createdNotification
      }
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico de notificaciones:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}