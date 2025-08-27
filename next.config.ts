import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'archiver', 'csv-writer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuration pour Vercel - gestion des routes
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Gestion des rewrites pour Vercel
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/',
      },
      {
        source: '/test',
        destination: '/test',
      },
      {
        source: '/debug',
        destination: '/debug',
      },
      {
        source: '/diagnostic',
        destination: '/diagnostic',
      },
    ];
  },
};

export default nextConfig;
