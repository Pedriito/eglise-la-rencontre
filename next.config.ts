import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb', // photos jusqu'à ~5 Mo (la limite annoncée dans le formulaire)
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '**.unsplash.com' },
    ],
  },
  allowedDevOrigins:['192.168.1.169'],
};

export default nextConfig;
