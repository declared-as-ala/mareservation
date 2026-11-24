import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";
// Where the Next server reaches the API (rewrites + server-side fetches). In the
// production compose network this is the backend service; override with BACKEND_INTERNAL_URL.
const BACKEND_API_URL =
  process.env.BACKEND_INTERNAL_URL || (isDev ? 'http://localhost:3001' : 'http://backend:3001');

// Account, checkout and back-office areas must never be indexed.
const PRIVATE_PATHS = [
  '/admin/:path*',
  '/owner/:path*',
  '/dashboard/:path*',
  '/mes-reservations/:path*',
  '/profile/:path*',
  '/panier/:path*',
  '/checkout/:path*',
  '/reservation/:path*',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/email-verified',
  '/unauthorized',
  '/maintenance',
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // French, keyword-rich URLs. Old English URLs answer 308 (permanent) so links and indexed pages
  // transfer to the new addresses; query strings (?where=…) are preserved automatically.
  async redirects() {
    return [
      { source: '/accommodations', destination: '/maisons-d-hotes', permanent: true },
      { source: '/accommodation/:slug', destination: '/maison-d-hote/:slug', permanent: true },
      { source: '/maison-d-hote', destination: '/maisons-d-hotes', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_API_URL}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      ...PRIVATE_PATHS.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
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
