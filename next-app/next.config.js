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
      }
    ]
  },
  async rewrites() {
    // Sin backend Express: no reescrituras a /api
    return []
  }
}

module.exports = nextConfig;
