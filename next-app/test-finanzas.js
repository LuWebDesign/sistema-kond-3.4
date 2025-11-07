// Script de prueba para módulo de finanzas
// Ejecutar: node test-finanzas.js

const fs = require('fs');
const path = require('path');

// Leer .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFinanzas() {
  console.log('🧪 PROBANDO MÓDULO DE FINANZAS\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Crear un ingreso
    console.log('\n1️⃣ Crear ingreso de prueba');
    const ingreso = {
      tipo: 'ingreso',
      monto: 5000,
      categoria: 'Venta',
      descripcion: 'Test de migración',
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 8),
      metodo_pago: 'transferencia'
    };

    const { data: ingresoCreado, error: errorIngreso } = await supabase
      .from('movimientos_financieros')
      .insert([ingreso])
      .select()
      .single();

    if (errorIngreso) {
      console.log(`   ❌ Error: ${errorIngreso.message}`);
    } else {
      console.log(`   ✅ Ingreso creado: ID ${ingresoCreado.id}, $${ingresoCreado.monto}`);
    }

    // Test 2: Crear un gasto
    console.log('\n2️⃣ Crear gasto de prueba');
    const gasto = {
      tipo: 'gasto',
      monto: 1500,
      categoria: 'Material',
      descripcion: 'Compra de acrílico',
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 8),
      metodo_pago: 'efectivo'
    };

    const { data: gastoCreado, error: errorGasto } = await supabase
      .from('movimientos_financieros')
      .insert([gasto])
      .select()
      .single();

    if (errorGasto) {
      console.log(`   ❌ Error: ${errorGasto.message}`);
    } else {
      console.log(`   ✅ Gasto creado: ID ${gastoCreado.id}, $${gastoCreado.monto}`);
    }

    // Test 3: Listar todos los movimientos
    console.log('\n3️⃣ Listar movimientos financieros');
    const { data: movimientos, error: errorList } = await supabase
      .from('movimientos_financieros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (errorList) {
      console.log(`   ❌ Error: ${errorList.message}`);
    } else {
      console.log(`   ✅ Total de movimientos: ${movimientos.length}`);
      movimientos.forEach(m => {
        const signo = m.tipo === 'ingreso' ? '+' : '-';
        console.log(`      ${signo} $${m.monto} - ${m.categoria} (${m.fecha})`);
      });
    }

    // Test 4: Calcular balance
    console.log('\n4️⃣ Calcular balance');
    if (movimientos) {
      const totalIngresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + Number(m.monto), 0);
      
      const totalGastos = movimientos
        .filter(m => m.tipo === 'gasto' || m.tipo === 'egreso')
        .reduce((sum, m) => sum + Number(m.monto), 0);
      
      const balance = totalIngresos - totalGastos;
      
      console.log(`   💰 Ingresos: $${totalIngresos}`);
      console.log(`   💸 Gastos: $${totalGastos}`);
      console.log(`   📊 Balance: $${balance}`);
    }

    // Test 5: Verificar categorías
    console.log('\n5️⃣ Verificar categorías financieras');
    const { data: categorias, error: errorCat } = await supabase
      .from('categorias_financieras')
      .select('*');

    if (errorCat) {
      console.log(`   ⚠️  Tabla categorías no existe o no tiene datos`);
    } else {
      console.log(`   ✅ Categorías disponibles: ${categorias?.length || 0}`);
      categorias?.forEach(cat => {
        console.log(`      • ${cat.nombre}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Pruebas de finanzas completadas\n');

  } catch (error) {
    console.error('\n❌ Error general:', error.message);
  }
}

testFinanzas();
