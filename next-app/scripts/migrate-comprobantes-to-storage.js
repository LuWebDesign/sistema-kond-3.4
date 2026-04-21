#!/usr/bin/env node
/**
 * Script de migración:
 * - Busca filas en `pedidos_catalogo` cuya `comprobante_url` comienza con `data:` (base64)
 * - Decodifica y sube el archivo al bucket `comprobantes`
 * - Actualiza la fila con la ruta del objeto (filename)
 *
 * Uso: desde `next-app/` ejecutar:
 *   node scripts/migrate-comprobantes-to-storage.js
 * Requiere variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

;(async () => {
  try {
    const mod = await import('../utils/supabaseClient.js')
    const { supabaseAdmin } = mod

    const client = supabaseAdmin()

    console.log('Buscando pedidos con comprobantes inline (data:)...')
    const { data: rows, error } = await client
      .from('pedidos_catalogo')
      .select('id,comprobante_url')
      .ilike('comprobante_url', 'data:%')
      .limit(1000)

    if (error) throw error

    if (!rows || rows.length === 0) {
      console.log('No se encontraron comprobantes inline para migrar.')
      process.exit(0)
    }

    for (const row of rows) {
      try {
        const { id, comprobante_url } = row
        console.log(`Migrando pedido ${id}...`)

        const parts = comprobante_url.split(',')
        if (parts.length < 2) {
          console.warn('Formato inesperado, se salta:', comprobante_url.slice(0, 80))
          continue
        }

        const meta = parts[0] // e.g. data:image/png;base64
        const b64 = parts[1]
        const mimeMatch = meta.match(/data:(.*);base64/)
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
        const ext = mime.split('/').pop().split('+')[0] || 'bin'

        const filename = `pedido-${id}-${Date.now()}.${ext}`

        const buffer = Buffer.from(b64, 'base64')

        // Subir al bucket 'comprobantes' con path = filename
        const { data: uploadData, error: uploadError } = await client.storage
          .from('comprobantes')
          .upload(filename, buffer, { contentType: mime, upsert: false })

        if (uploadError) {
          console.error('Error subiendo archivo para pedido', id, uploadError)
          continue
        }

        // Actualizar la fila para apuntar al objeto (guardamos el nombre relativo)
        const { data: updated, error: updateError } = await client
          .from('pedidos_catalogo')
          .update({ comprobante_url: filename, comprobante_omitido: false })
          .eq('id', id)

        if (updateError) {
          console.error('Error actualizando DB para pedido', id, updateError)
          continue
        }

        console.log(`Pedido ${id} migrado -> ${filename}`)
      } catch (err) {
        console.error('Error procesando fila', row.id, err)
      }
    }

    console.log('Migración completada.')
    process.exit(0)
  } catch (err) {
    console.error('Error en script de migración:', err)
    process.exit(1)
  }
})()
