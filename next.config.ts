import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Add any hosts you actually use:
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // { protocol: 'https', hostname: 'cdn.yoursite.com' },
    ],
  },
};

export default nextConfig;
