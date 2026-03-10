/**
 * Script de migración de datos desde localStorage a Supabase
 * 
 * USO:
 * 1. Exporta tus datos desde la consola del navegador:
 *    > localStorage
 *    Copia el contenido a un archivo JSON
 * 
 * 2. O usa este script en Node.js con un JSON exportado
 * 
 * 3. Ejecuta: node supabase/migrate-data.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración (usa service role key para migración, NO la compartas)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Parsear data URL tipo: data:<mime>;base64,<data>
 * Devuelve { mime, base64 } o null
 */
function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

/**
 * Subir comprobante al bucket 'comprobantes' y devolver signed URL
 */
async function uploadComprobanteFile(fileBuffer, mime, remotePath) {
  const { data: up, error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(remotePath, fileBuffer, { contentType: mime, upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  // Generar signed URL por 7 días
  const expiresIn = 60 * 60 * 24 * 7; // 7 días
  const { data: signed, error: signedError } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(remotePath, expiresIn);

  if (signedError) {
    return { url: null, error: signedError };
  }

  return { url: signed.signedUrl, error: null };
}

/**
 * Migrar productos desde localStorage JSON
 */
async function migrateProductos(productos) {
  console.log(`\n📦 Migrando ${productos.length} productos...`);
  
  for (const prod of productos) {
    // Mapear campos de localStorage a schema Supabase
    const productoSupabase = {
      id: prod.id,
      nombre: prod.nombre,
      categoria: prod.categoria,
      tipo: prod.tipo || 'Venta',
      medidas: prod.medidas,
      tiempo_unitario: prod.tiempoUnitario || '00:00:00',
      unidades: prod.unidades || 1,
      unidades_por_placa: prod.unidadesPorPlaca || 0,
      uso_placas: prod.usoPlacas || 0,
      costo_placa: prod.costoPlaca || 0,
      costo_material: prod.costoMaterial || 0,
      margen_material: prod.margenMaterial || 0,
      precio_unitario: prod.precioUnitario || 0,
      ensamble: prod.ensamble || 'Sin ensamble',
      imagen: prod.imagen, // Mantener data URL por ahora
      active: prod.active !== false,
      publicado: prod.publicado !== false,
      hidden_in_productos: prod.hiddenInProductos || false,
      allow_promotions: prod.allowPromotions !== false,
      promo_badge: prod.promoBadge,
      static_promo_price: prod.staticPromoPrice,
      static_promo_start: prod.staticPromoStart,
      static_promo_end: prod.staticPromoEnd,
      tags: prod.tags || []
    };

    // Normalizar id a entero si viene como string o float
    if (productoSupabase.id !== undefined && productoSupabase.id !== null) {
      const parsedId = Number(productoSupabase.id);
      if (!Number.isNaN(parsedId)) {
        productoSupabase.id = Math.floor(parsedId);
      } else {
        // si no es numérico, eliminar id para que Postgres asigne uno
        delete productoSupabase.id;
      }
    }

    const { error } = await supabase
      .from('productos')
      .upsert(productoSupabase, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error migrando producto ${prod.id}:`, error.message);
    } else {
      console.log(`✅ Producto migrado: ${prod.nombre} (#${prod.id})`);
    }
  }
}

/**
 * Migrar pedidos de catálogo
 */
async function migratePedidosCatalogo(pedidos) {
  console.log(`\n📋 Migrando ${pedidos.length} pedidos de catálogo...`);
  
  for (const pedido of pedidos) {
    // Preparar comprobante: si viene como data URL lo subimos
    let comprobanteUrl = null;
    try {
      // Algunos pedidos usan 'comprobante' o 'comprobanteData' o 'comprobante_url' en el JSON
      const rawComprobante = pedido.comprobante || pedido.comprobante_data || pedido.comprobanteData || pedido._comprobante || null;
      if (rawComprobante && typeof rawComprobante === 'string') {
        if (rawComprobante.startsWith('data:')) {
          const parsed = parseDataUrl(rawComprobante);
          if (parsed) {
            const ext = parsed.mime.split('/')[1]?.split('+')[0] || 'bin';
            const filename = `pedido-${pedido.id || Date.now()}-${Math.floor(Math.random()*10000)}.${ext}`;
            const remotePath = `comprobantes/${filename}`;
            const buffer = Buffer.from(parsed.base64, 'base64');
            const { url, error } = await uploadComprobanteFile(buffer, parsed.mime, remotePath);
            if (error) {
              console.error(`\u274c Error subiendo comprobante para pedido ${pedido.id}:`, error.message || error);
            } else {
              comprobanteUrl = url;
              console.log(`\u2705 Comprobante subido para pedido ${pedido.id} -> ${remotePath}`);
            }
          }
        } else if (rawComprobante.startsWith('http')) {
          // Ya es una URL
          comprobanteUrl = rawComprobante;
        }
      }
    } catch (err) {
      console.error('Error procesando comprobante:', err);
    }

    const pedidoSupabase = {
      id: pedido.id,
      cliente_nombre: pedido.cliente?.nombre || 'Sin nombre',
      cliente_apellido: pedido.cliente?.apellido,
      cliente_telefono: pedido.cliente?.telefono,
      cliente_email: pedido.cliente?.email,
      cliente_direccion: pedido.cliente?.direccion,
      productos: pedido.items || pedido.productos, // Flexible
      metodo_pago: pedido.metodoPago || 'transferencia',
      estado_pago: pedido.estadoPago || 'sin_sea',
      comprobante_url: comprobanteUrl,
      comprobante_omitido: pedido._comprobanteOmitted || false,
      fecha_creacion: pedido.fechaCreacion || new Date().toISOString(),
      fecha_solicitud_entrega: pedido.fechaSolicitudEntrega,
      total: pedido.total || 0,
      asignado_al_calendario: pedido.asignadoAlCalendario || false,
      fecha_produccion_calendario: pedido.fechaProduccionCalendario,
      fecha_entrega_calendario: pedido.fechaEntregaCalendario,
      estado: pedido.estado || 'pendiente'
    };

    const { error } = await supabase
      .from('pedidos_catalogo')
      .upsert(pedidoSupabase, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error migrando pedido ${pedido.id}:`, error.message);
    } else {
      console.log(`✅ Pedido migrado: #${pedido.id}`);
    }
  }
}

/**
 * Migrar promociones
 */
async function migratePromociones(promociones) {
  console.log(`\n🎯 Migrando ${promociones.length} promociones...`);
  
  for (const promo of promociones) {
    const promoSupabase = {
      id: promo.id,
      title: promo.title,
      type: promo.type,
      summary: promo.summary,
      start_date: promo.start,
      end_date: promo.end,
      badge: promo.badge,
      color: promo.color || '#3b82f6',
      text_color: promo.textColor || 'auto',
      tags: promo.tags || [],
      active: promo.active !== false,
      product_ids: promo.productIds || [],
      config: promo.config || {}
    };

    const { error } = await supabase
      .from('promociones')
      .upsert(promoSupabase, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error migrando promoción ${promo.id}:`, error.message);
    } else {
      console.log(`✅ Promoción migrada: ${promo.title}`);
    }
  }
}

/**
 * Migrar cupones
 */
async function migrateCupones(cupones) {
  console.log(`\n🎫 Migrando ${cupones.length} cupones...`);
  
  for (const cupon of cupones) {
    const cuponSupabase = {
      id: cupon.id,
      code: cupon.code,
      description: cupon.description,
      type: cupon.type,
      value: cupon.value,
      min_amount: cupon.minAmount,
      min_quantity: cupon.minQuantity,
      start_date: cupon.start,
      end_date: cupon.end,
      active: cupon.active !== false
    };

    const { error } = await supabase
      .from('cupones')
      .upsert(cuponSupabase, { onConflict: 'code' });

    if (error) {
      console.error(`❌ Error migrando cupón ${cupon.code}:`, error.message);
    } else {
      console.log(`✅ Cupón migrado: ${cupon.code}`);
    }
  }
}

/**
 * Main: ejecutar migración
 */
async function main() {
  console.log('🚀 Iniciando migración a Supabase...\n');

  // Leer archivo JSON exportado (ajusta la ruta según tu export)
  const dataPath = path.join(process.cwd(), 'data-export.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ No se encontró el archivo: ${dataPath}`);
    console.log('\n💡 Instrucciones:');
    console.log('1. Abre la consola del navegador en tu sistema KOND');
    console.log('2. Ejecuta:');
    console.log('   const data = {');
    console.log('     productosBase: JSON.parse(localStorage.getItem("productosBase") || "[]"),');
    console.log('     pedidosCatalogo: JSON.parse(localStorage.getItem("pedidosCatalogo") || "[]"),');
    console.log('     marketing_promotions: JSON.parse(localStorage.getItem("marketing_promotions") || "[]"),');
    console.log('     marketing_coupons: JSON.parse(localStorage.getItem("marketing_coupons") || "[]")');
    console.log('   };');
    console.log('   console.log(JSON.stringify(data, null, 2));');
    console.log('3. Copia el resultado a data-export.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Migrar cada entidad
  if (data.productosBase?.length) {
    await migrateProductos(data.productosBase);
  }

  if (data.pedidosCatalogo?.length) {
    await migratePedidosCatalogo(data.pedidosCatalogo);
  }

  if (data.marketing_promotions?.length) {
    await migratePromociones(data.marketing_promotions);
  }

  if (data.marketing_coupons?.length) {
    await migrateCupones(data.marketing_coupons);
  }

  console.log('\n✅ ¡Migración completada!');
}

// Ejecutar
main().catch(console.error);
