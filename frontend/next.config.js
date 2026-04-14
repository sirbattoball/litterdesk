/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['res.cloudinary.com', 'litterdesk.com'],
  },
  async rewrites() {
    return [
      // In development, proxy /api to the FastAPI backend
      ...(process.env.NODE_ENV === 'development' ? [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
        },
      ] : []),
    ]
  },
}

module.exports = nextConfig
