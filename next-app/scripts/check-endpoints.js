(async () => {
  const endpoints = [
    '/api/health',
    '/api/pedidos/catalogo',
    '/api/productos'
  ]
  const base = 'http://localhost:3000'
  for (const ep of endpoints) {
    try {
      const res = await fetch(base + ep)
      const text = await res.text()
      // console.log(`${ep} -> ${res.status} (${text.slice(0,200).replace(/\n/g,' ')})`)
    } catch (e) {
      console.error(`${ep} -> ERROR:`, e.message)
    }
  }
})()
