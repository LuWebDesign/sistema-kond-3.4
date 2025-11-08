/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      }
    ]
  },
  async rewrites() {
    // Sin backend Express: no reescrituras a /api
    return []
  }
}

module.exports = nextConfig;
