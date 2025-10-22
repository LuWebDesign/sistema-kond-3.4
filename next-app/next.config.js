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
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*' // proxy to backend in dev
      }
    ]
  }
}

module.exports = nextConfig;
