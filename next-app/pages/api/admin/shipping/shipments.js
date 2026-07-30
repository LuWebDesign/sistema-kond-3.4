import { verifyAdminCookie } from '../../../../utils/verifyAdminCookie'
import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { TENANT_ID } from '../../../../lib/tenant'
import { importShippingShipment } from '../../../../lib/shipping'

const ORDER_COLUMNS = `
  id, tenant_id, cliente_nombre, cliente_apellido, cliente_telefono, cliente_email, cliente_direccion,
  metodo_entrega, estado_pago, metodo_pago, mp_payment_status, total, shipping_cost,
  shipping_provider, shipping_delivery_type, shipping_service_code, shipping_service_name,
  shipping_quote_snapshot, shipping_destination_snapshot, shipping_agency_snapshot,
  shipping_status, shipping_import_status
`

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await verifyAdminCookie(req)
  if (!userId) return res.status(401).json({ error: 'No autorizado' })

  const { orderId } = req.body || {}
  if (!orderId) return res.status(400).json({ error: 'orderId is required' })

  const supabase = supabaseAdmin()

  const { data: pedido, error: lookupError } = await supabase
    .from('pedidos_catalogo')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (lookupError || !pedido) return res.status(404).json({ error: 'Pedido no encontrado' })

  const eligibilityError = getEligibilityError(pedido)
  if (eligibilityError) return res.status(409).json({ error: eligibilityError })

  const { data: claimed, error: claimError } = await supabase
    .from('pedidos_catalogo')
    .update({ shipping_import_status: 'in_progress', shipping_manual_followup_required: false })
    .eq('id', pedido.id)
    .eq('tenant_id', TENANT_ID)
    .in('shipping_import_status', ['pending', 'failed'])
    .select('id')

  if (claimError) return res.status(500).json({ error: 'No se pudo preparar la generación del envío' })
  if (!claimed?.length) return res.status(409).json({ error: 'El envío ya está en proceso o fue generado' })

  let result
  try {
    result = await importShippingShipment({
      ...pedido,
      adminConfirmed: true,
      recipient: {
        name: `${pedido.cliente_nombre || ''} ${pedido.cliente_apellido || ''}`.trim(),
        phone: pedido.cliente_telefono || '',
        email: pedido.cliente_email || '',
        address: pedido.cliente_direccion || '',
      },
    })
  } catch (error) {
    const isAmbiguousCreate = error?.ambiguousExternalCreate === true
    const failure = {
      error: error?.message || 'Shipping generation failed',
      failedAt: new Date().toISOString(),
      ambiguousExternalCreate: isAmbiguousCreate,
    }

    const { data: recovery, error: recoveryError } = await supabase
      .from('pedidos_catalogo')
      .update({
        shipping_import_status: isAmbiguousCreate ? 'manual_followup' : 'failed',
        shipping_import_result: failure,
        shipping_manual_followup_required: true,
      })
      .eq('id', pedido.id)
      .eq('tenant_id', TENANT_ID)
      .select('shipping_import_status, shipping_import_result, shipping_imported_at, shipping_tracking_number, shipping_manual_followup_required')
      .single()

    let shipping = recovery ? mapShippingPatch(recovery) : null

    if (recoveryError) {
      const { data: fallback, error: fallbackError } = await supabase
        .from('pedidos_catalogo')
        .update({
          shipping_import_status: isAmbiguousCreate ? 'manual_followup' : 'failed',
          shipping_manual_followup_required: true,
        })
        .eq('id', pedido.id)
        .eq('tenant_id', TENANT_ID)
        .select('shipping_import_status, shipping_import_result, shipping_imported_at, shipping_tracking_number, shipping_manual_followup_required')
        .single()

      console.error('[admin/shipping/shipments] Shipment failure recovery update failed:', {
        orderId: pedido.id,
        error: error?.message,
        ambiguousExternalCreate: isAmbiguousCreate,
        recoveryError: recoveryError.message,
        fallbackError: fallbackError?.message,
      })

      if (fallbackError) {
        return res.status(500).json({
          error: isAmbiguousCreate
            ? 'No se pudo confirmar si Zipnova creó el envío y tampoco se pudo marcar el pedido para seguimiento manual. Requiere intervención manual antes de reintentar.'
            : 'Falló la generación del envío y no se pudo guardar el estado de recuperación. Requiere intervención manual antes de reintentar.',
          diagnostics: {
            orderId: pedido.id,
            importStatusPersisted: false,
            manualFollowupRequiredPersisted: false,
          },
        })
      }

      shipping = mapShippingPatch(fallback)
    }

    console.error('[admin/shipping/shipments] Shipment generation failed:', { orderId: pedido.id, error: error?.message, ambiguousExternalCreate: isAmbiguousCreate })
    return res.status(isAmbiguousCreate ? 409 : 502).json({
      error: isAmbiguousCreate
        ? 'No se pudo confirmar si Zipnova creó el envío. Requiere seguimiento manual antes de reintentar.'
        : failure.error,
      shipping,
    })
  }

  const patch = {
    shipping_import_status: 'imported',
    shipping_import_result: result,
    shipping_imported_at: result.importedAt || new Date().toISOString(),
    shipping_tracking_number: result.trackingNumber || null,
    shipping_manual_followup_required: false,
  }

  const { data: updated, error: updateError } = await supabase
    .from('pedidos_catalogo')
    .update(patch)
    .eq('id', pedido.id)
    .eq('tenant_id', TENANT_ID)
    .select('shipping_import_status, shipping_import_result, shipping_imported_at, shipping_tracking_number, shipping_manual_followup_required')
    .single()

  if (!updateError) {
    return res.status(200).json({ success: true, shipment: result, shipping: mapShippingPatch(updated) })
  }

  const manualFollowup = {
    error: updateError.message || 'Shipment was created but could not be persisted locally',
    failedAt: new Date().toISOString(),
    shipment: result,
  }

  // Carrier creation already succeeded; keep the order out of automatic retry paths to avoid duplicate shipments.
  const { data: followup, error: followupError } = await supabase
    .from('pedidos_catalogo')
    .update({
      shipping_import_status: 'manual_followup',
      shipping_import_result: manualFollowup,
      shipping_manual_followup_required: true,
    })
    .eq('id', pedido.id)
    .eq('tenant_id', TENANT_ID)
    .select('shipping_import_status, shipping_import_result, shipping_imported_at, shipping_tracking_number, shipping_manual_followup_required')
    .single()

  console.error('[admin/shipping/shipments] Shipment created but local persistence failed:', {
    orderId: pedido.id,
    error: updateError.message,
    followupError: followupError?.message,
  })

  return res.status(500).json({
    error: 'El envío fue creado en el proveedor, pero no se pudo guardar localmente. Requiere seguimiento manual.',
    shipment: result,
    shipping: followup ? mapShippingPatch(followup) : {
      importStatus: 'manual_followup',
      importResult: manualFollowup,
      importedAt: null,
      manualFollowupRequired: true,
      trackingNumber: null,
    },
  })
}

function getEligibilityError(pedido) {
  if (pedido.metodo_entrega !== 'envio') return 'El pedido no requiere envío'
  if (!pedido.shipping_provider) return 'El pedido no tiene proveedor de envío'
  if (pedido.shipping_status !== 'quoted' && pedido.shipping_status !== 'free') return 'El envío no tiene una cotización lista para generar'
  if (pedido.shipping_import_status === 'imported') return 'El envío ya fue generado'
  if (pedido.shipping_import_status === 'in_progress') return 'El envío ya está en proceso'
  if (!['pending', 'failed'].includes(pedido.shipping_import_status)) return 'El envío no está pendiente de generación'
  if (!isPaid(pedido)) return 'El pedido debe estar pagado antes de generar el envío'
  if (!hasPaidQuotedShipping(pedido)) return 'El total pagado no coincide con el envío cotizado'
  if (!pedido.shipping_quote_snapshot) return 'Falta la metadata de cotización requerida para generar el envío'
  return null
}

function isPaid(pedido) {
  return pedido.mp_payment_status === 'approved' || ['pagado', 'pagado_total'].includes(pedido.estado_pago)
}

function hasPaidQuotedShipping(pedido) {
  if (pedido.shipping_status !== 'quoted') return true

  const shippingCost = Math.round(Number(pedido.shipping_cost) || 0)
  if (!(shippingCost > 0)) return false

  return Math.round(Number(pedido.total) || 0) >= shippingCost
}

function mapShippingPatch(row) {
  return {
    importStatus: row.shipping_import_status || null,
    importResult: row.shipping_import_result || null,
    importedAt: row.shipping_imported_at || null,
    manualFollowupRequired: row.shipping_manual_followup_required ?? null,
    trackingNumber: row.shipping_tracking_number || null,
  }
}
