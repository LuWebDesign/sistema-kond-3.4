/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // turbopack: {
  //   root: __dirname  // Removido para evitar conflicto con outputFileTracingRoot en Vercel
  // },
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      {
        source: '/catalogo',
        destination: '/catalog',
        permanent: false
      },
      {
        source: '/calendario',
        destination: '/calendar',
        permanent: false
      },
      {
        source: '/catalog-public.html',
        destination: '/catalog',
        permanent: false
      },
      // Redirecciones para reorganización de admin
      {
        source: '/products',
        destination: '/admin/products',
        permanent: false
      },
      {
        source: '/pedidos-catalogo',
        destination: '/admin/orders',
        permanent: false
      },
      {
        source: '/database',
        destination: '/admin/database',
        permanent: false
      },
      {
        source: '/dashboard',
        destination: '/admin/dashboard',
        permanent: false
      },
      // Redirecciones por reorganización de rutas (admin)
      {
        source: '/pedidos',
        destination: '/admin/pedidos',
        permanent: false
      },
      {
        source: '/marketing',
        destination: '/admin/marketing',
        permanent: false
      },
      {
        source: '/finanzas',
        destination: '/admin/finanzas',
        permanent: false
      },
      {
        source: '/materiales',
        destination: '/admin/materiales',
        permanent: false
      },
      {
        source: '/mi-cuenta',
        destination: '/admin/mi-cuenta',
        permanent: false
      },
      // Redirecciones por reorganización de rutas (catálogo)
      {
        source: '/mis-pedidos',
        destination: '/catalog/mis-pedidos',
        permanent: false
      }
    ]
  },
  async rewrites() {
    // Sin backend Express: no reescrituras a /api
    return []
  }
}

module.exports = nextConfig;
