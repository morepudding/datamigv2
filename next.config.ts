import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'archiver', 'csv-writer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuration spécifique pour Vercel + App Router
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
