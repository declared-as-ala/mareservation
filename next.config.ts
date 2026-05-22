import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@photo-sphere-viewer/core',
    '@photo-sphere-viewer/markers-plugin',
    'three',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.istockphoto.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'photo-sphere-viewer-data.netlify.app' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    qualities: [60, 75, 85],
    // Disable server-side image optimization on VPS to save CPU/RAM and prevent fetch timeouts.
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      // Fix "Can't resolve 'tailwindcss'" when Turbopack resolver context falls
      // back to the monorepo root which has no node_modules.
      'tailwindcss': path.resolve(process.cwd(), 'node_modules/tailwindcss'),
      '@tailwindcss/postcss': path.resolve(process.cwd(), 'node_modules/@tailwindcss/postcss'),
    },
  },
};

export default nextConfig;
