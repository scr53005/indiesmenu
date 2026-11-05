import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@innopay/ui'],
  // Lets next/image resize admin-uploaded dish photos (Vercel Blob) to the card size.
  // Keep in sync with BLOB_HOST_SUFFIX in lib/data/image.ts.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  /* config options here */
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
