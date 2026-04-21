// Script de prueba para medir payloads de /api/productos
// Uso: node tools/test_api_productos.js [baseUrl]

const BASE = process.argv[2] || process.env.API_BASE || 'http://localhost:3000';
const fetch = globalThis.fetch || (await import('node-fetch')).default;

async function test(page, perPage) {
  const url = `${BASE}/api/productos?page=${page}&per_page=${perPage}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: 'GET' });
    const t1 = Date.now();
    const timeMs = t1 - t0;
    const clHeader = res.headers.get('content-length');
    const text = await res.text();
    const byteLen = Buffer.byteLength(text, 'utf8');
    let info = {};
    try { info = JSON.parse(text); } catch(e) { info = { parseError: true }; }
    const productosCount = info && info.productos && Array.isArray(info.productos) ? info.productos.length : (info && info.data && Array.isArray(info.data) ? info.data.length : null);
    console.log(`REQUEST ${url}`);
    console.log(`  status: ${res.status} ${res.statusText}`);
    console.log(`  content-length header: ${clHeader || 'none'}`);
    console.log(`  body bytes: ${byteLen}`);
    console.log(`  productos count (if present): ${productosCount}`);
    console.log(`  time ms: ${timeMs}`);
    console.log('');
    return { url, status: res.status, clHeader, byteLen, productosCount, timeMs };
  } catch (err) {
    console.error(`ERROR requesting ${url}:`, err.message || err);
    return { url, error: err.message };
  }
}

(async () => {
  console.log('Test API /api/productos — base:', BASE);
  const perPages = [50, 200];
  const pages = [1, 2, 3];
  const results = [];
  for (const per of perPages) {
    for (const p of pages) {
      // esperar breve para no saturar
      await new Promise(r => setTimeout(r, 200));
      // ejecutar test
      // eslint-disable-next-line no-await-in-loop
      const r = await test(p, per);
      results.push(r);
    }
  }
  console.log('--- SUMMARY ---');
  results.forEach(r => {
    if (r.error) console.log(r.url, 'ERROR', r.error);
    else console.log(r.url, 'bytes=', r.byteLen, 'items=', r.productosCount, 'status=', r.status);
  });
})();
