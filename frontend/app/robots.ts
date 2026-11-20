import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/serverApi';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/owner',
          '/dashboard',
          '/api/',
          '/mes-reservations',
          '/profile',
          '/panier',
          '/checkout',
          '/reservation',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/email-verified',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
