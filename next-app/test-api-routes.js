// Script de prueba para las API routes
// Ejecutar: node test-api-routes.js

const http = require('http');

const baseUrl = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testEndpoints() {
  // console.log('🧪 PROBANDO API ROUTES\n');
  // console.log('='.repeat(60));

  try {
    // Test 1: Health Check
    // console.log('\n1️⃣ GET /api/health');
    const health = await makeRequest('/api/health');
    // console.log(`   Status: ${health.status}`);
    // console.log(`   Supabase URL: ${health.data.supabase.url}`);
    // console.log(`   Supabase Keys: ${health.data.supabase.anonKey}, ${health.data.supabase.serviceRole}`);

    // Test 2: Listar productos
    // console.log('\n2️⃣ GET /api/productos');
    const productos = await makeRequest('/api/productos');
    // console.log(`   Status: ${productos.status}`);
    if (productos.data.productos) {
      // console.log(`   ✅ Productos encontrados: ${productos.data.productos.length}`);
    } else {
      // console.log(`   ❌ Error:`, productos.data.error);
    }

    // Test 3: Listar pedidos catálogo
    // console.log('\n3️⃣ GET /api/pedidos/catalogo');
    const pedidos = await makeRequest('/api/pedidos/catalogo');
    // console.log(`   Status: ${pedidos.status}`);
    if (pedidos.data.pedidos) {
      // console.log(`   ✅ Pedidos encontrados: ${pedidos.data.pedidos.length}`);
    } else {
      // console.log(`   ❌ Error:`, pedidos.data.error);
    }

    // Test 4: Login admin (debe fallar sin credenciales)
    // console.log('\n4️⃣ POST /api/auth/login (sin credenciales)');
    const loginFail = await makeRequest('/api/auth/login', 'POST', {});
    // console.log(`   Status: ${loginFail.status}`);
    // console.log(`   Respuesta esperada (400):`, loginFail.data.error);

    // Test 5: Login admin (con credenciales correctas)
    // console.log('\n5️⃣ POST /api/auth/login (admin)');
    const login = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'admin123' // Ajusta según tu contraseña
    });
    // console.log(`   Status: ${login.status}`);
    if (login.data.success) {
      // console.log(`   ✅ Login exitoso - Usuario: ${login.data.user.username} (${login.data.user.rol})`);
    } else {
      // console.log(`   ⚠️  ${login.data.error} (verifica la contraseña del admin)`);
    }

    // console.log('\n' + '='.repeat(60));
    // console.log('✅ Pruebas completadas\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    // console.log('\n⚠️  Asegúrate de que el servidor Next.js esté corriendo:');
    // console.log('   npm run dev\n');
  }
}

testEndpoints();
