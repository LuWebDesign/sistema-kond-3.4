#!/usr/bin/env node
// compare-mis-pedidos.js
// Compara los datos de 'mis pedidos' (estructura esperada por la app) con lo almacenado en Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local si existe
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function safeNum(v){ return Number(v || 0); }

async function run() {
  try {
    // console.log('🔍 Obteniendo todos los pedidos de Supabase (pedidos_catalogo + items)...');
    const { data: pedidos, error } = await supabase
      .from('pedidos_catalogo')
      .select('*, items:pedidos_catalogo_items(*)')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    if (!pedidos || pedidos.length === 0) {
      // console.log('No se encontraron pedidos en la tabla pedidos_catalogo.');
      return;
    }

    // console.log(`  Encontrados ${pedidos.length} pedidos. Iniciando validaciones...`);

    const report = [];
    let totalIssues = 0;

    for (const p of pedidos) {
      const issues = [];
      const id = p.id;
      const email = p.cliente_email || '';

      // Items exist
      const items = p.items || [];
      if (!items || items.length === 0) {
        issues.push('No tiene items asociados');
      }

      // Validate each item subtotal
      let sumSub = 0;
      items.forEach((it, idx) => {
        const precio = safeNum(it.producto_precio);
        const cantidad = safeNum(it.cantidad);
        const expected = precio * cantidad;
        const itemSubtotal = expected;
        sumSub += itemSubtotal;
        // No stored subtotal in items table, but app computes it. We check negative/zero prices
        if (precio <= 0) issues.push(`Item ${idx} precio no válido (${it.producto_nombre} -> ${it.producto_precio})`);
        if (cantidad <= 0) issues.push(`Item ${idx} cantidad no válida (${it.producto_nombre} -> ${it.cantidad})`);
      });

      // Validate total matches sumSub within 0.01 tolerance
      const totalDb = safeNum(p.total);
      const diff = Math.abs(totalDb - sumSub);
      if (diff > 0.01) {
        issues.push(`Total (${totalDb}) no coincide con suma de items (${sumSub}) diff=${diff}`);
      }

      // Check cliente_email exists
      if (!email) issues.push('cliente_email vacío');

      // Check fecha_creacion parseable
      if (!p.fecha_creacion || isNaN(new Date(p.fecha_creacion).getTime())) {
        issues.push('fecha_creacion inválida o ausente');
      }

      // Check estado default
      if (!('estado' in p)) {
        // app expects estado, but DB may lack column
        issues.push('columna estado ausente en pedido (app espera campo estado)');
      }

      if (issues.length > 0) {
        totalIssues += issues.length;
        report.push({ id, cliente_email: email, issues });
      }
    }

    // console.log('\n=== Reporte de discrepancias por pedido ===');
    if (report.length === 0) {
      // console.log('✅ No se detectaron discrepancias relevantes en los pedidos.');
    } else {
      // report.forEach(r => {
      //   console.log(`\nPedido ID: ${r.id}  cliente_email: ${r.cliente_email}`);
      //   r.issues.forEach(it => console.log('  -', it));
      // });
      // console.log(`\nResumen: ${report.length} pedidos con issues, ${totalIssues} issues totales.`);
    }

  } catch (err) {
    console.error('Error en compare-mis-pedidos:', err.message || err);
    process.exit(1);
  }
}

run();
