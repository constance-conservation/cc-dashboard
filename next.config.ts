import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {},
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'cc-dashboard-rouge.vercel.app' }],
        destination: 'https://app.constanceconservation.com.au/:path*',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
