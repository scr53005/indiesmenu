import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@innopay/ui'],
  // Next 16 blocks dev resources (JS chunks, HMR) requested from another origin, so a phone on
  // the Wi-Fi got the server-rendered menu but no JavaScript: nothing clickable. Dev-only;
  // ignored in production. Same list as millewee; the wildcard covers a reassigned IP.
  allowedDevOrigins: ['192.168.178.55', '192.168.178.*'],
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
