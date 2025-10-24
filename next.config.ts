import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Disable static page generation to avoid SSR issues with AuthProvider
  output: 'standalone',
};

export default nextConfig;
