import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow access from network devices
  serverExternalPackages: [],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
};

export default nextConfig;
