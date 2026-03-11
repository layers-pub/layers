import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  allowedDevHosts: ['layers.ngrok.app'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bsky.social',
      },
      {
        protocol: 'https',
        hostname: 'cdn.bsky.app',
      },
      {
        protocol: 'https',
        hostname: 'cdn.layers.pub',
      },
    ],
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const sidecarUrl = process.env.SIDECAR_URL || 'http://localhost:8000';
    return [
      {
        source: '/xrpc/:path*',
        destination: `${apiUrl}/xrpc/:path*`,
      },
      {
        source: '/api/v1/design/:path*',
        destination: `${sidecarUrl}/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
