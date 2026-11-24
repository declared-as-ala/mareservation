/**
 * Next.js Middleware — runs on the EDGE before every request.
 *
 * Purpose:
 *  • Protect /dashboard/** and /admin/** routes server-side.
 *  • Redirect unauthenticated users to /login with a ?returnTo query.
 *  • Redirect non-admin users away from /admin/** to /unauthorized.
 *  • Redirect ADMIN users away from /dashboard to /admin.
 *  • Prevent the UI flicker that occurs when client-side auth checks
 *    run after the component has already painted.
 *
 * The middleware reads the `accessToken` httpOnly cookie set by the
 * backend.  Because httpOnly cookies are NOT accessible to client JS
 * but ARE automatically sent by the browser, they show up in
 * `request.cookies` here on the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultRedirectForRole, isOwnerRole, resolvePostLoginRedirect, sanitizeReturnTo } from '@/lib/auth/redirect';
import { API_BASE } from '@/lib/api/base-url';
import { isHiddenCategoryPath, maisonsOnlyRedirect } from '@/lib/publicCatalog';

// ── Cookie-based JWT decode (no secret needed for expiry check) ──

/**
 * Decode the JWT payload without verification — we only need to know
 * whether the token is present and not expired.  The actual signature
 * verification still happens in the Express backend.
 */
function decodeJwtPayload(cookie: string): Record<string, unknown> | null {
  try {
    const parts = cookie.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );
    return payload;
  } catch {
    return null;
  }
}

function isTokenValid(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const payload = decodeJwtPayload(cookieValue);
  if (!payload) return false;
  const exp = payload.exp as number | undefined;
  if (exp && Date.now() >= exp * 1000) return false;
  return true;
}

/**
 * Edge cookie auth is only viable when the access token actually lives in a
 * cookie the middleware can read on the frontend origin.
 *
 * This app authenticates with a **Bearer token kept in localStorage** (the
 * backend only sets an httpOnly *refresh* cookie, never a readable
 * `accessToken` cookie). The edge therefore can never see a valid token, so
 * enforcing cookie auth here would bounce every /admin and /owner hit to
 * /login — an infinite loop, since the real session lives client-side.
 *
 * Protection is handled instead by:
 *   • client guards (AdminLayout / owner layouts read the auth store), and
 *   • the backend, which enforces requireAdmin / requireOwner on every route.
 *
 * So edge enforcement is OFF unless explicitly opted in (cookie-based setups)
 * AND the API is same-origin.
 */
function canUseEdgeCookieAuth(request: NextRequest): boolean {
  if (process.env.NEXT_PUBLIC_EDGE_COOKIE_AUTH !== 'true') return false;
  if (!API_BASE) return false;
  try {
    return new URL(API_BASE).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

// ── Route matching ──────────────────────────────────────────────

const DASHBOARD_PATTERN = /^\/dashboard($|\/)/;
const ADMIN_PATTERN = /^\/admin($|\/)/;
const OWNER_PATTERN = /^\/owner($|\/)/;
const LOGIN_PATTERN = /^\/login($|\/)/;
const ROOT_PATTERN = /^\/$/;
const USER_ACCOUNT_PATTERN = /^\/(mes-reservations|profile)($|\/)/;

// Public routes that should never go through auth checks
const PUBLIC_PATTERNS = [
  /^\/_next\//,
  /^\/api\//,          // Let Next.js API routes handle their own auth
  /^\/static\//,
  /^\/favicon/,
  /^\/logo/,
];

/** Legacy admin section → replacement (temporary 307 so they can be revived without cache issues). */
const RETIRED_ADMIN: Record<string, string> = {
  calendrier: '/admin/reservations/calendar',
  plateforme: '/admin/settings?tab=emails',
  'hotels-approval': '/admin/applications',
  partners: '/admin/applications',
  'maisons-dhote': '/admin/guesthouses',
  venues: '/admin/guesthouses',
  hotels: '/admin/guesthouses',
  scenes: '/admin/guesthouses',
  cafes: '/admin/guesthouses',
  restaurants: '/admin/guesthouses',
  cinema: '/admin/guesthouses',
  coworking: '/admin/guesthouses',
  'event-spaces': '/admin/guesthouses',
  events: '/admin/guesthouses',
  'events-moderation': '/admin/guesthouses',
  users: '/admin/customers',
  moderation: '/admin/dashboard',
  payouts: '/admin/dashboard',
  support: '/admin/dashboard',
  'audit-logs': '/admin/dashboard',
  categories: '/admin/dashboard',
  tags: '/admin/dashboard',
  'banner-slides': '/admin/dashboard',
  vedette: '/admin/dashboard',
  'sos-conseil': '/admin/dashboard',
  scanner: '/admin/dashboard',
};

// ── Middleware ──────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const edgeCookieAuthEnabled = canUseEdgeCookieAuth(request);

  // Skip middleware for public/static assets
  if (PUBLIC_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.next();
  }

  // Retired super-admin sections (guesthouse-only admin). Code and data are kept; URLs land on the new modules.
  if (pathname.startsWith('/admin/')) {
    const seg = pathname.split('/')[2] ?? '';
    const target = RETIRED_ADMIN[seg];
    if (target) return NextResponse.redirect(new URL(target, request.url), 307);
  }

  // Legacy customer area (/dashboard/*, old dark shell) → the current account pages.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const m = pathname.match(/^\/dashboard\/reservations\/([^/]+)/);
    const target = m ? `/mes-reservations/${m[1]}`
      : pathname === '/dashboard' || pathname.startsWith('/dashboard/reservations') ? '/mes-reservations'
      : '/profile';
    return NextResponse.redirect(new URL(target, request.url), 308);
  }

  // Multi-category screens (explorer, search, cart) → maisons search while only maisons are public.
  const maisonsTarget = maisonsOnlyRedirect(pathname, request.nextUrl.searchParams);
  if (maisonsTarget) {
    return NextResponse.redirect(new URL(maisonsTarget, request.url), 307);
  }

  // ── Public catalogue gate (maisons d'hôtes only at launch) ───
  // Hidden categories keep their code/data but are not publicly reachable.
  // /hotel(s) maps to the maison d'hôte pages (permanent redirect);
  // everything else answers a real 404 and is marked noindex.
  if (isHiddenCategoryPath(pathname)) {
    if (pathname === '/hotels' || pathname === '/hotel') {
      return NextResponse.redirect(new URL('/maisons-d-hotes', request.url), 308);
    }
    if (pathname.startsWith('/hotel/')) {
      return NextResponse.redirect(
        new URL(pathname.replace(/^\/hotel\//, '/maison-d-hote/'), request.url),
        308
      );
    }
    const res = NextResponse.rewrite(new URL('/__category-hidden__', request.url));
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  const accessTokenCookie = request.cookies.get('accessToken')?.value;
  const hasValidToken = isTokenValid(accessTokenCookie);

  // Cross-origin API deployment (frontend domain != backend domain):
  // don't enforce cookie-based redirects at the edge.
  if (!edgeCookieAuthEnabled) {
    return NextResponse.next();
  }

  // ── Dashboard routes — redirect to appropriate home ─────────
  if (DASHBOARD_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    if (payload?.role === 'ADMIN') {
      // Keep admin dashboard namespace strictly under /admin.
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Keep old user dashboard links functional through redirects.
    if (pathname === '/dashboard/reservations' || pathname.startsWith('/dashboard/reservations/')) {
      return NextResponse.redirect(new URL('/mes-reservations', request.url));
    }
    if (pathname === '/dashboard/profile') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── Admin routes ─────────────────────────────────────────────
  if (ADMIN_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  if (OWNER_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    const role = typeof payload?.role === 'string' ? payload.role : null;
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (!isOwnerRole(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // ── User account pages (/mes-reservations, /profile) ─────────
  if (USER_ACCOUNT_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    if (payload?.role === 'ADMIN') {
      // Admins have a dedicated admin console.
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // ── Logged-in users should not see login page ────────────────
  if (LOGIN_PATTERN.test(pathname) && hasValidToken) {
    const payload = decodeJwtPayload(accessTokenCookie!);
    const role = typeof payload?.role === 'string' ? payload.role : null;
    const requestedReturnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('returnTo'));
    const redirectUrl = requestedReturnTo
      ? resolvePostLoginRedirect(role, requestedReturnTo)
      : getDefaultRedirectForRole(role);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Redirect authenticated users from public home to their role workspace.
  if (ROOT_PATTERN.test(pathname) && hasValidToken) {
    const payload = decodeJwtPayload(accessTokenCookie!);
    const role = typeof payload?.role === 'string' ? payload.role : null;
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (isOwnerRole(role)) {
      return NextResponse.redirect(new URL('/owner', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on these routes:
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/owner/:path*',
    '/mes-reservations/:path*',
    '/profile',
    '/profile/:path*',
    '/login',
    '/',
    // Category gate (see lib/publicCatalog.ts)
    '/(cafes?|restaurants?|restauration|cinema|evenements?|event-space|coworking|sorties|bien-etre|hotels?|lieu|sos-conseil)/:path*',
    '/(cafes?|restaurants?|restauration|cinema|evenements?|event-space|coworking|sorties|bien-etre|hotels?|lieu|sos-conseil)',
    // Multi-category screens (see maisonsOnlyRedirect)
    '/(explorer|recherche|panier|checkout)/:path*',
    '/(explorer|recherche|panier|checkout)',
  ],
};
