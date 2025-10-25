import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow access from network devices
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
